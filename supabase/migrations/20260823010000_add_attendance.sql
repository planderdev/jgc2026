-- 행사 당일 출석 체크.
-- 사무국이 관리자 화면에서 예약(밋업)·참가신청 옆 "출석"을 누르면 attended_at이 찍힌다.
-- 실수로 눌렀을 때를 위해 같은 함수로 해제도 한다(토글). 사무국 계정만 호출 가능.
-- 기관 화면에는 출석 여부가 읽기 전용으로 보인다.

alter table public.reservations
  add column if not exists attended_at timestamptz;

alter table public.event_registrations
  add column if not exists attended_at timestamptz;

-- p_kind: 'reservation' | 'registration', p_no: 해당 번호, p_attended: true=출석, false=해제
create or replace function public.jgcf_admin_set_attendance(p_kind text, p_no text, p_attended boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_no   text := upper(btrim(coalesce(p_no, '')));
  v_when timestamptz := case when p_attended then now() else null end;
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if p_kind = 'reservation' then
    update public.reservations set attended_at = v_when
    where reservation_no = v_no and status = 'confirmed';
  elsif p_kind = 'registration' then
    update public.event_registrations set attended_at = v_when
    where registration_no = v_no;
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'attended_at', v_when);
end;
$$;

revoke all on function public.jgcf_admin_set_attendance(text, text, boolean) from public, anon;
grant execute on function public.jgcf_admin_set_attendance(text, text, boolean) to authenticated;

-- 목록 함수들이 attended_at을 함께 돌려준다. 나머지는 기존과 동일.
create or replace function public.jgcf_admin_reservations()
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
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reservation_no',    r.reservation_no,
        'status',            r.status,
        'company_id',        r.company_id,
        'company_name',      r.company_name,
        'time_slot',         r.time_slot,
        'applicant_company', r.applicant_company,
        'manager_name',      r.manager_name,
        'phone',             r.phone,
        'email',             r.email,
        'inquiry',           r.inquiry,
        'attachment_path',   r.attachment_path,
        'attachment_name',   r.attachment_name,
        'created_at',        r.created_at,
        'cancelled_at',      r.cancelled_at,
        'attended_at',       r.attended_at
      ) order by r.company_name, r.time_slot)
      from public.reservations r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.jgcf_admin_registrations()
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
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'registration_no',  e.registration_no,
        'participant_type', e.participant_type,
        'name',             e.name,
        'organization',     e.organization,
        'phone',            e.phone,
        'created_at',       e.created_at,
        'attended_at',      e.attended_at
      ) order by e.created_at desc)
      from public.event_registrations e
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.jgcf_partner_reservations()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id   text;
  v_company_name text;
begin
  select company_id, company_name into v_company_id, v_company_name
  from public.partner_users where user_id = auth.uid();

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'company_id', v_company_id,
    'company_name', v_company_name,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reservation_no',    r.reservation_no,
        'time_slot',         r.time_slot,
        'applicant_company', r.applicant_company,
        'manager_name',      r.manager_name,
        'phone',             r.phone,
        'email',             r.email,
        'inquiry',           r.inquiry,
        'attachment_path',   r.attachment_path,
        'attachment_name',   r.attachment_name,
        'created_at',        r.created_at,
        'attended_at',       r.attended_at
      ) order by r.time_slot)
      from public.reservations r
      where r.company_id = v_company_id
        and r.status = 'confirmed'
    ), '[]'::jsonb)
  );
end;
$$;
