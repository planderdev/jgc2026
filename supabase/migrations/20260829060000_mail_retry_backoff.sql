-- 발송 실패를 원인별로 다르게 다룬다.
--   · 한도 초과(429): 우리 잘못이 아니고 시간이 지나면 풀린다. 재시도 횟수를
--     깎지 않고 deferred_until 까지 미뤄 둔다. 행사 당일 일 한도에 걸려도
--     메일이 영영 사라지지 않게 하려는 것.
--   · 서버 오류·네트워크: 재시도 횟수를 세면서 간격을 점점 늘린다(2,4,8,16분…).
--   · 주소 오류 같은 영구 실패: 재시도해도 소용없으니 즉시 failed.
alter table public.mail_outbox
  add column if not exists deferred_until timestamptz,
  add column if not exists deferrals int not null default 0;

drop index if exists mail_outbox_pending_idx;
create index if not exists mail_outbox_pending_idx
  on public.mail_outbox (deferred_until nulls first, created_at)
  where status = 'pending';

-- 보낼 수 있는 건이 있을 때만 발송기를 깨운다(미뤄 둔 건은 세지 않는다).
create or replace function public.jgcf_dispatch_mail()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  s public.mail_settings%rowtype;
begin
  select * into s from public.mail_settings where id = 1;
  if not found or not s.enabled or coalesce(s.function_url, '') = '' then
    return;
  end if;
  if not exists (
    select 1 from public.mail_outbox
     where status = 'pending'
       and attempts < 5
       and (deferred_until is null or deferred_until <= now())
  ) then
    return;
  end if;

  perform net.http_post(
    url     := s.function_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || coalesce(s.auth_key, ''),
                 'apikey', coalesce(s.auth_key, ''),
                 'x-dispatch-key', coalesce(s.dispatch_key, '')),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function public.jgcf_dispatch_mail() from public, anon, authenticated;

-- 사무국 화면에 '미뤄 둔 건'과 다음 재시도 시각도 보여준다.
create or replace function public.jgcf_admin_mail_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'enabled', (select enabled from public.mail_settings where id = 1),
    'pending', (select count(*) from public.mail_outbox
                 where status = 'pending'
                   and (deferred_until is null or deferred_until <= now())),
    'deferred', (select count(*) from public.mail_outbox
                  where status = 'pending' and deferred_until > now()),
    'next_retry_at', (select min(deferred_until) from public.mail_outbox
                       where status = 'pending' and deferred_until > now()),
    'sent',   (select count(*) from public.mail_outbox where status = 'sent'),
    'failed', (select count(*) from public.mail_outbox where status = 'failed'),
    'partners_without_contact',
      (select count(*) from public.partner_users where coalesce(contact_email, '') = ''),
    'recent_failures', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', kind, 'to', to_email, 'attempts', attempts, 'deferrals', deferrals,
               'error', left(coalesce(last_error, ''), 200), 'at', created_at)
             order by id desc)
        from (select * from public.mail_outbox
               where status = 'failed' or attempts > 0 or deferrals > 0
               order by id desc limit 10) f
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.jgcf_admin_mail_status() from public, anon;
grant execute on function public.jgcf_admin_mail_status() to authenticated;
