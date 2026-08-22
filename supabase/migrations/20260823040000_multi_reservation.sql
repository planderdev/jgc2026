-- 한 담당자가 여러 상담기관을 예약할 수 있게 한다 (2026-08-23 결정, 건수 제한 없음).
-- 막는 것: 같은 담당자의 같은 시간(몸은 하나), 같은 담당자의 같은 기관 중복.
-- 담당자 식별은 기존과 같이 메일 또는 연락처(숫자) 일치.

drop index if exists public.reservations_email_unique;
drop index if exists public.reservations_phone_unique;

-- 같은 담당자·같은 시간 중복을 DB에서도 막는다 (동시 클릭 대비).
create unique index if not exists reservations_person_slot_unique
  on public.reservations (phone_digits, time_slot) where status = 'confirmed';

-- jgcf_create_reservation: already_reserved 검사가 time_conflict / company_duplicate 두 검사로 바뀌었다.
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

  -- 같은 담당자가 같은 시간에 다른 기관을 예약할 수는 없다.
  if exists (select 1 from public.reservations
             where status = 'confirmed'
               and (lower(email) = v_email or phone_digits = v_digits)
               and time_slot = p_time_slot) then
    return jsonb_build_object('ok', false, 'reason', 'time_conflict');
  end if;

  -- 같은 담당자가 같은 기관을 두 번 예약할 수는 없다.
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

-- 조회: 예약번호+연락처로 본인 확인이 된 뒤, 같은 연락처의 다른 확정 예약도 함께 돌려준다.
create or replace function public.jgcf_lookup_reservation(p_reservation_no text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.reservations%rowtype;
begin
  select * into v_row
  from public.reservations
  where reservation_no = upper(btrim(coalesce(p_reservation_no, '')))
    and phone_digits = public.jgcf_phone_digits(p_phone);

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'reservation', jsonb_build_object(
      'reservation_no',    v_row.reservation_no,
      'company_name',      v_row.company_name,
      'company_field',     v_row.company_field,
      'time_slot',         v_row.time_slot,
      'applicant_company', v_row.applicant_company,
      'manager_name',      v_row.manager_name,
      'phone',             v_row.phone,
      'email',             v_row.email,
      'attachment_name',   v_row.attachment_name,
      'status',            v_row.status,
      'created_at',        v_row.created_at
    ),
    'others', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reservation_no', r.reservation_no,
        'company_name',   r.company_name,
        'time_slot',      r.time_slot
      ) order by r.time_slot)
      from public.reservations r
      where r.phone_digits = v_row.phone_digits
        and r.status = 'confirmed'
        and r.reservation_no <> v_row.reservation_no
    ), '[]'::jsonb)
  );
end;
$$;
