-- 브라우저가 호출할 수 있는 유일한 통로.
-- 모두 SECURITY DEFINER라 RLS를 우회하지만, 각 함수가 필요한 데이터만
-- 돌려주고 필요한 검증만 통과시킨다.
-- search_path를 고정해 검색 경로를 바꿔치기하는 공격을 막는다.

-- 연락처에서 숫자만 남긴다. 010-1234-5678과 01012345678을 같게 취급한다.
create or replace function public.jgcf_phone_digits(p_phone text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
$$;

-- 예약번호 생성. 순번이 아니라 난수를 써서 남의 예약번호를 추측하지 못하게 한다.
-- 헷갈리는 글자(I, O, 0, 1)는 제외했다.
create or replace function public.jgcf_make_code(p_prefix text)
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select p_prefix || string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
           (floor(random() * 32) + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

-- 특정 상담기관의 마감된 시간대 목록. 개인정보는 일절 나가지 않는다.
create or replace function public.jgcf_taken_slots(p_company_id text)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(time_slot order by time_slot), '{}')
  from public.reservations
  where company_id = p_company_id
    and status = 'confirmed';
$$;

create or replace function public.jgcf_create_reservation(
  p_company_id        text,
  p_company_name      text,
  p_company_field     text,
  p_time_slot         text,
  p_applicant_company text,
  p_manager_name      text,
  p_phone             text,
  p_email             text,
  p_inquiry           text,
  p_attachment_path   text default null,
  p_attachment_name   text default null
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
  p_applicant_company := btrim(coalesce(p_applicant_company, ''));
  p_manager_name      := btrim(coalesce(p_manager_name, ''));
  p_inquiry           := btrim(coalesce(p_inquiry, ''));
  v_email             := lower(btrim(coalesce(p_email, '')));
  v_digits            := public.jgcf_phone_digits(p_phone);

  -- 클라이언트 검증은 우회될 수 있으므로 서버에서 다시 본다.
  if p_company_id is null or btrim(p_company_id) = ''
     or p_time_slot is null or btrim(p_time_slot) = ''
     or p_applicant_company = '' or p_manager_name = '' or p_inquiry = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_field');
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

  -- 중복 신청 차단. 메일이나 연락처 중 하나라도 이미 쓰였으면 막는다.
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

  -- 난수 예약번호가 겹칠 확률은 낮지만 겹치면 다시 뽑는다.
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
    -- 위 검사와 insert 사이에 다른 사람이 먼저 넣은 경우.
    -- 부분 유니크 인덱스가 최종 방어선이다.
    when unique_violation then
      if sqlerrm like '%slot_unique%' then
        return jsonb_build_object('ok', false, 'reason', 'slot_taken');
      end if;
      return jsonb_build_object('ok', false, 'reason', 'already_reserved');
  end;

  return jsonb_build_object('ok', true, 'reservation_no', v_no);
end;
$$;

-- 예약번호와 담당자 연락처가 모두 맞아야 내용을 돌려준다.
-- 둘 중 하나만으로는 조회되지 않는다.
create or replace function public.jgcf_lookup_reservation(
  p_reservation_no text,
  p_phone          text
)
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
    )
  );
end;
$$;

create or replace function public.jgcf_cancel_reservation(
  p_reservation_no text,
  p_phone          text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_no text := upper(btrim(coalesce(p_reservation_no, '')));
begin
  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where reservation_no = v_no
    and phone_digits = public.jgcf_phone_digits(p_phone)
    and status = 'confirmed';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found_or_already_cancelled');
  end if;

  return public.jgcf_lookup_reservation(p_reservation_no, p_phone);
end;
$$;

create or replace function public.jgcf_create_registration(
  p_participant_type text,
  p_name             text,
  p_organization     text,
  p_phone            text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text := public.jgcf_phone_digits(p_phone);
  v_no     text;
begin
  p_name := btrim(coalesce(p_name, ''));

  if p_participant_type not in ('company', 'general', 'student') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_type');
  end if;
  if p_name = '' or length(p_name) > 50 then
    return jsonb_build_object('ok', false, 'reason', 'missing_field');
  end if;
  if length(v_digits) < 9 or length(v_digits) > 11 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  end if;
  if p_participant_type in ('company', 'student')
     and btrim(coalesce(p_organization, '')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_field');
  end if;

  for i in 1..10 loop
    v_no := public.jgcf_make_code('JGCF-ATTEND-');
    exit when not exists (select 1 from public.event_registrations where registration_no = v_no);
    v_no := null;
  end loop;
  if v_no is null then
    return jsonb_build_object('ok', false, 'reason', 'code_generation_failed');
  end if;

  begin
    insert into public.event_registrations
      (registration_no, participant_type, name, organization, phone, phone_digits)
    values
      (v_no, p_participant_type, p_name, nullif(btrim(coalesce(p_organization, '')), ''),
       btrim(p_phone), v_digits);
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'reason', 'already_registered');
  end;

  return jsonb_build_object('ok', true, 'registration_no', v_no);
end;
$$;

-- 브라우저(anon)에는 위 함수 실행 권한만 준다. 테이블 권한은 주지 않는다.
revoke all on function public.jgcf_create_reservation(text,text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.jgcf_lookup_reservation(text,text) from public;
revoke all on function public.jgcf_cancel_reservation(text,text) from public;
revoke all on function public.jgcf_taken_slots(text) from public;
revoke all on function public.jgcf_create_registration(text,text,text,text) from public;

grant execute on function public.jgcf_create_reservation(text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.jgcf_lookup_reservation(text,text) to anon, authenticated;
grant execute on function public.jgcf_cancel_reservation(text,text) to anon, authenticated;
grant execute on function public.jgcf_taken_slots(text) to anon, authenticated;
grant execute on function public.jgcf_create_registration(text,text,text,text) to anon, authenticated;
