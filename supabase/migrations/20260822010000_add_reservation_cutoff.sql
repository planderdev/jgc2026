-- 밋업 예약 접수·취소 마감: 행사 전날 자정(KST)까지.
-- 상담기관이 전날 확정 명단으로 준비할 수 있게 한다. 당일 변경은 사무국이
-- jgcf_admin_cancel로 대신 처리한다(관리자 함수는 마감의 영향을 받지 않는다).
--
-- jgcf_create_reservation / jgcf_cancel_reservation 본문 맨 앞에
--   if not public.jgcf_reservation_open() then return {ok:false, reason:'closed'}
-- 검사가 추가됐다. 나머지 로직은 20260820073319 와 동일하다.

create or replace function public.jgcf_reservation_cutoff()
returns timestamptz
language sql
immutable
set search_path = public, pg_temp
as $$
  select timestamptz '2026-09-16 00:00:00+09';
$$;

create or replace function public.jgcf_reservation_open()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select now() < public.jgcf_reservation_cutoff();
$$;

revoke all on function public.jgcf_reservation_open() from public;
grant execute on function public.jgcf_reservation_open() to anon, authenticated;

-- (create/cancel 함수 전체 본문은 Supabase 대시보드 Migrations 이력에 기록되어 있다.
--  마감 시각을 바꾸려면 jgcf_reservation_cutoff 의 값만 수정하면 된다.)
