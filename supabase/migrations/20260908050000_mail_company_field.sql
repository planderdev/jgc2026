-- 원스톱지원센터 x 지식재산센터 3개 테이블이 같은 기관명을 쓰게 되면서
-- 기관명만으로는 어느 상담(저작권/상표권/지원사업)인지 메일에서 구분되지 않는다.
-- 예약 메일 payload에 상담 분야(company_field)를 추가한다.
-- 본문은 20260830070000(취소 알림 운영자 수신) 버전 그대로이고 payload 한 줄만 다르다.
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
    'company_field',     new.company_field,
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
