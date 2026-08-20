-- 상담기관(파트너) 계정 계층.
--
-- 각 상담기관 담당자는 자기 기관에 매칭된 "확정" 예약만 본다.
-- 개인정보처리방침의 제3자 제공 범위(신청자가 선택한 상담기관에 제공)와
-- 일치시키기 위해, 다른 기관의 예약과 취소된 예약은 절대 내보내지 않는다.
-- 취소한 신청자는 제공 동의를 철회한 것으로 보고 데이터 흐름을 끊는다.

create table public.partner_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  company_id   text not null,
  company_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.partner_users enable row level security;
-- 정책 없음. 다른 테이블과 같은 원칙: 직접 접근 전면 차단.

create index partner_users_company_idx on public.partner_users (company_id);

comment on table public.partner_users is
  '상담기관 담당자 계정. 자기 company_id의 확정 예약만 조회할 수 있다.';

-- 로그인 계정의 역할 판별. 화면이 관리자/파트너 모드를 가르는 데 쓴다.
create or replace function public.jgcf_whoami()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_partner public.partner_users%rowtype;
begin
  if public.jgcf_is_admin() then
    return jsonb_build_object('ok', true, 'role', 'admin');
  end if;

  select * into v_partner from public.partner_users where user_id = auth.uid();
  if found then
    return jsonb_build_object(
      'ok', true, 'role', 'partner',
      'company_id', v_partner.company_id,
      'company_name', v_partner.company_name
    );
  end if;

  return jsonb_build_object('ok', true, 'role', 'none');
end;
$$;

-- 자기 기관의 확정 예약 목록.
-- 반환 항목은 방침의 제3자 제공 항목과 동일하다:
-- 신청 기업명, 담당자, 연락처, 메일, 상담 내용, 회사 소개서.
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
        'created_at',        r.created_at
      ) order by r.time_slot)
      from public.reservations r
      where r.company_id = v_company_id
        and r.status = 'confirmed'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.jgcf_whoami() from public, anon;
revoke all on function public.jgcf_partner_reservations() from public, anon;
grant execute on function public.jgcf_whoami() to authenticated;
grant execute on function public.jgcf_partner_reservations() to authenticated;

-- 첨부 PDF: 파트너는 자기 기관의 확정 예약에 딸린 파일만 내려받을 수 있다.
create policy "partner attachment read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'meetup-attachments'
    and exists (
      select 1
      from public.reservations r
      join public.partner_users p on p.company_id = r.company_id
      where p.user_id = auth.uid()
        and r.attachment_path = storage.objects.name
        and r.status = 'confirmed'
    )
  );
