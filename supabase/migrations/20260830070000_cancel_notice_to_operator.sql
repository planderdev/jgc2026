-- 취소 알림을 상담기관 대신 운영자 메일 한 곳으로 모은다.
-- 기관 담당자 주소를 22곳에서 걷어 관리하는 대신, 사무국이 알림을 받아
-- 필요한 기관에만 전달하는 운영 방식. partner_users.contact_email 은 더 이상
-- 쓰지 않는다(칼럼은 남겨둠). 운영자 주소는 mail_settings.operator_email.
alter table public.mail_settings add column if not exists operator_email text;

create or replace function public.jgcf_queue_reservation_mail()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
  v_operator text;
begin
  v_payload := jsonb_build_object(
    'reservation_no',    new.reservation_no,
    'company_name',      new.company_name,
    'applicant_company', new.applicant_company,
    'manager_name',      new.manager_name,
    'time_slot',         new.time_slot,
    'phone',             new.phone,
    'email',             new.email
  );

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('reservation_confirmed', new.email, v_payload);
    end if;

  elsif tg_op = 'UPDATE'
        and new.status = 'cancelled'
        and old.status is distinct from new.status then
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('reservation_cancelled', new.email, v_payload);
    end if;
    -- 운영자 알림. QA 예약(@example.com)의 취소는 운영자에게도 보내지 않는다.
    select operator_email into v_operator from public.mail_settings where id = 1;
    if public.jgcf_is_sendable(v_operator) and public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('partner_cancelled', v_operator, v_payload);
    end if;
  end if;

  return new;
end;
$$;

-- 사무국 현황: 기관 수신 주소 항목 대신 운영자 주소를 보여준다.
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
    'operator_email', (select operator_email from public.mail_settings where id = 1),
    'pending', (select count(*) from public.mail_outbox
                 where status = 'pending'
                   and (deferred_until is null or deferred_until <= now())),
    'deferred', (select count(*) from public.mail_outbox
                  where status = 'pending' and deferred_until > now()),
    'next_retry_at', (select min(deferred_until) from public.mail_outbox
                       where status = 'pending' and deferred_until > now()),
    'sent',   (select count(*) from public.mail_outbox where status = 'sent'),
    'failed', (select count(*) from public.mail_outbox where status = 'failed'),
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
