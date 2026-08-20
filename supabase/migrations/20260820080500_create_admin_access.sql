-- 관리자 페이지 접근 계층.
--
-- 로그인(authenticated)만으로는 아무것도 볼 수 없다. Supabase는 기본적으로
-- 누구나 가입 API를 호출할 수 있으므로, "로그인 = 관리자"로 두면 아무나
-- 가입해서 명단을 열람하게 된다. 반드시 admin_users에 등록된 계정만
-- 관리자 함수를 통과한다.

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- 정책 없음: 예약 테이블과 같은 원칙. 직접 접근 전면 차단.

comment on table public.admin_users is
  '관리자 명단. 사무국 계정을 만들면 이 표에 user_id를 넣어야 admin 함수가 열린다.';

create or replace function public.jgcf_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ── 관리자 전용 함수 ──────────────────────────────────────────────
-- 모두 첫 줄에서 jgcf_is_admin()을 확인하고, 아니면 접근 거부만 알린다.

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
        'cancelled_at',      r.cancelled_at
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
        'created_at',       e.created_at
      ) order by e.created_at desc)
      from public.event_registrations e
    ), '[]'::jsonb)
  );
end;
$$;

-- 사무국이 신청자 대신 예약을 취소한다. 취소하면 슬롯이 자동으로 열린다.
create or replace function public.jgcf_admin_cancel(p_reservation_no text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where reservation_no = upper(btrim(coalesce(p_reservation_no, '')))
    and status = 'confirmed';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found_or_already_cancelled');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- anon에는 절대 열지 않는다. 로그인 계정만 호출할 수 있고,
-- 그중에서도 admin_users에 있어야 내용이 나온다.
revoke all on function public.jgcf_is_admin() from public, anon;
revoke all on function public.jgcf_admin_reservations() from public, anon;
revoke all on function public.jgcf_admin_registrations() from public, anon;
revoke all on function public.jgcf_admin_cancel(text) from public, anon;

grant execute on function public.jgcf_is_admin() to authenticated;
grant execute on function public.jgcf_admin_reservations() to authenticated;
grant execute on function public.jgcf_admin_registrations() to authenticated;
grant execute on function public.jgcf_admin_cancel(text) to authenticated;

-- 첨부 PDF 열람: 관리자로 확인된 로그인 계정만 내려받을 수 있다.
-- 익명 사용자와 일반 로그인 사용자에게는 여전히 닫혀 있다.
create policy "admin attachment read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'meetup-attachments' and public.jgcf_is_admin());
