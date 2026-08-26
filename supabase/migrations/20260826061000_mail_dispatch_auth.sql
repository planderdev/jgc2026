-- Edge Function은 JWT 검증이 켜져 있어 공개키(publishable)도 함께 보내야 한다.
-- 이 키는 사이트 JS에 이미 들어 있는 공개값이라 여기 저장해도 문제가 없다.
alter table public.mail_settings add column if not exists auth_key text;

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
  if not exists (select 1 from public.mail_outbox where status = 'pending' and attempts < 5) then
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

-- 예약이 확정·취소되면 곧바로 발송기를 깨운다(1분 cron은 놓친 건만 재시도).
create or replace function public.jgcf_wake_mail_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.jgcf_dispatch_mail();
  return null;
end;
$$;

drop trigger if exists jgcf_mail_wake on public.mail_outbox;
create trigger jgcf_mail_wake
after insert on public.mail_outbox
for each statement execute function public.jgcf_wake_mail_dispatch();
