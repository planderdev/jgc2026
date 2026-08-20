-- 사무국이 Supabase 대시보드에서 바로 보는 화면.
-- security_invoker를 켜 두면 뷰가 호출자 권한으로 동작한다.
-- 즉 대시보드(service_role)에서는 보이지만, 브라우저 키로는 아무것도 안 나온다.

create or replace view public.admin_reservations
with (security_invoker = true) as
select
  r.reservation_no                                as 예약번호,
  r.status                                        as 상태,
  r.company_name                                  as 상담기관,
  r.time_slot                                     as 상담시간,
  r.applicant_company                             as 신청기업,
  r.manager_name                                  as 담당자,
  r.phone                                         as 연락처,
  r.email                                         as 메일,
  r.inquiry                                       as 상담내용,
  r.attachment_name                               as 첨부파일명,
  r.attachment_path                               as 첨부파일경로,
  to_char(r.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as 신청일시,
  to_char(r.cancelled_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as 취소일시
from public.reservations r
order by r.company_name, r.time_slot;

create or replace view public.admin_registrations
with (security_invoker = true) as
select
  e.registration_no as 신청번호,
  case e.participant_type
    when 'company' then '기업'
    when 'general' then '일반'
    when 'student' then '학생'
  end               as 구분,
  e.name            as 이름,
  e.organization    as 소속,
  e.phone           as 연락처,
  to_char(e.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') as 신청일시
from public.event_registrations e
order by e.created_at desc;

-- 상담기관별 예약 현황 요약
create or replace view public.admin_slot_summary
with (security_invoker = true) as
select
  company_name                                              as 상담기관,
  count(*) filter (where status = 'confirmed')              as 확정건수,
  count(*) filter (where status = 'cancelled')              as 취소건수,
  string_agg(time_slot, ', ' order by time_slot)
    filter (where status = 'confirmed')                     as 확정시간대
from public.reservations
group by company_name
order by 확정건수 desc, 상담기관;

-- 브라우저 역할에는 뷰 권한을 주지 않는다.
revoke all on public.admin_reservations  from anon, authenticated;
revoke all on public.admin_registrations from anon, authenticated;
revoke all on public.admin_slot_summary  from anon, authenticated;

comment on view public.admin_reservations is
  '사무국 조회용. 대시보드에서만 보인다. 브라우저 키로는 접근 불가.';
