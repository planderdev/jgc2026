-- 기관별 상담 불가 시간(비즈밋업 시간표(수정).pdf)을 서버에서도 막는다.
-- 화면(data.js companyReservationBreaks)은 선택지만 비활성화할 뿐이라,
-- API를 직접 부르면 기관이 자리에 없는 시간에 예약이 만들어질 수 있었다.
-- 목록을 바꿀 때는 data.js와 이 함수를 함께 바꾼다.
create or replace function public.jgcf_company_slot_blocked(p_company_id text, p_time_slot text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce((
    '{
      "kb-investment":                       ["10:00","10:30","11:00","11:30","13:00","16:00","16:30"],
      "daekyo-investment":                   ["13:30","14:00","16:00","16:30"],
      "logan-ventures":                      ["16:00","16:30"],
      "smartrun":                            ["13:30","14:00","16:00","16:30"],
      "gomao-ventures":                      ["10:00","10:30","11:00","11:30","13:00","13:30","14:00"],
      "newkids-investment":                  ["10:00","10:30","11:00","11:30","13:00","13:30","14:00","16:00","16:30"],
      "jeju-content-agency":                 ["14:30"],
      "jeju-hrd":                            ["14:30"],
      "kb-financial":                        ["14:30"],
      "kibo-busan-content-finance":          ["14:30"],
      "jeju-economic-trade-agency":          ["14:30"],
      "jeju-credit-guarantee-foundation":    ["14:30"],
      "cheju-halla-k-hightech-platform":     ["14:30"],
      "jeju-national-tech-commercialization":["14:30"],
      "jeju-creative-economy":               ["13:00","13:30","16:30"],
      "jeju-startup-onestop":                ["13:00","13:30","16:30"],
      "jeju-ip-center":                      ["13:00","13:30","16:30"]
    }'::jsonb -> p_company_id
  ) ? p_time_slot, false);
$$;

-- jgcf_create_reservation: 시간 형식 검사 뒤에 기관별 불가 시간 검사를 추가한다.
-- 나머지 본문은 20260823040000_multi_reservation.sql 과 동일.
create or replace function public.jgcf_create_reservation(
  p_company_id text, p_company_name text, p_company_field text, p_time_slot text,
  p_applicant_company text, p_manager_name text, p_phone text, p_email text, p_inquiry text,
  p_attachment_path text default null, p_attachment_name text default null
)
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

  if public.jgcf_company_slot_blocked(p_company_id, p_time_slot) then
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
               and (lower(email) = v_email or phone_digits = v_digits)
               and time_slot = p_time_slot) then
    return jsonb_build_object('ok', false, 'reason', 'time_conflict');
  end if;

  if exists (select 1 from public.reservations
             where status = 'confirmed'
               and (lower(email) = v_email or phone_digits = v_digits)
               and company_id = p_company_id) then
    return jsonb_build_object('ok', false, 'reason', 'company_duplicate');
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
      return jsonb_build_object('ok', false, 'reason', 'time_conflict');
  end;

  return jsonb_build_object('ok', true, 'reservation_no', v_no);
end;
$$;
