-- 밋업 상담 단위를 15분 → 30분으로. 10:00~17:30, 30분 간격 16슬롯 중 점심(12:00·12:30) 제외 14슬롯.
-- 화면(data.js reservationTimes/reservationBreaks)과 같은 규칙이며, 서버에서도 목록 밖의 시간은 거부한다.
-- 이전엔 시간 문자열을 검증하지 않아 '10:15' 같은 값을 직접 호출로 넣을 수 있었다.

create or replace function public.jgcf_valid_slot(p_time_slot text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_time_slot ~ '^(10|11|13|14|15|16|17):(00|30)$';
$$;

-- jgcf_create_reservation: missing_field 검사 뒤에 invalid_slot 검사가 추가됐다. 나머지는 동일.
create or replace function public.jgcf_create_reservation(
  p_company_id text, p_company_name text, p_company_field text, p_time_slot text,
  p_applicant_company text, p_manager_name text, p_phone text, p_email text, p_inquiry text,
  p_attachment_path text default null, p_attachment_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text;
  v_email  text;
  v_no     text;
begin
  if not public.jgcf_reservation_open() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;

  p_applicant_company := btrim(coalesce(p_applicant_company, ''));
  p_manager_name      := btrim(coalesce(p_manager_name, ''));
  p_inquiry           := btrim(coalesce(p_inquiry, ''));
  v_email             := lower(btrim(coalesce(p_email, '')));
  v_digits            := public.jgcf_phone_digits(p_phone);

  if p_company_id is null or btrim(p_company_id) = ''
     or p_time_slot is null or btrim(p_time_slot) = ''
     or p_applicant_company = '' or p_manager_name = '' or p_inquiry = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_field');
  end if;

  if not public.jgcf_valid_slot(p_time_slot) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_slot');
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  if length(v_digits) < 9 or length(v_digits) > 11 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;

  if length(p_applicant_company) > 100 or length(p_manager_name) > 50
     or length(p_inquiry) > 240 or length(v_email) > 254 then
    return jsonb_build_object('ok', false, 'reason', 'too_long');
  end if;

  if exists (select 1 from public.reservations
             where status = 'confirmed'
               and (lower(email) = v_email or phone_digits = v_digits)) then
    return jsonb_build_object('ok', false, 'reason', 'already_reserved');
  end if;

  if exists (select 1 from public.reservations
             where status = 'confirmed'
               and company_id = p_company_id
               and time_slot = p_time_slot) then
    return jsonb_build_object('ok', false, 'reason', 'slot_taken');
  end if;

  for i in 1..10 loop
    v_no := public.jgcf_make_code('JGCF-2026-');
    exit when not exists (select 1 from public.reservations where reservation_no = v_no);
    v_no := null;
  end loop;
  if v_no is null then
    return jsonb_build_object('ok', false, 'reason', 'code_generation_failed');
  end if;

  begin
    insert into public.reservations (
      reservation_no, company_id, company_name, company_field, time_slot,
      applicant_company, manager_name, phone, phone_digits, email, inquiry,
      attachment_path, attachment_name
    ) values (
      v_no, p_company_id, p_company_name, p_company_field, p_time_slot,
      p_applicant_company, p_manager_name, btrim(p_phone), v_digits, v_email, p_inquiry,
      p_attachment_path, p_attachment_name
    );
  exception
    when unique_violation then
      if sqlerrm like '%slot_unique%' then
        return jsonb_build_object('ok', false, 'reason', 'slot_taken');
      end if;
      return jsonb_build_object('ok', false, 'reason', 'already_reserved');
  end;

  return jsonb_build_object('ok', true, 'reservation_no', v_no);
end;
$$;
