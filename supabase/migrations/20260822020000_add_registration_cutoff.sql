-- 행사 참가신청 마감: 행사 종료 시각(2026-09-16 18:00 KST) 이후 접수 거부.
-- 당일 현장 방문자도 모바일로 신청할 수 있도록 행사 중에는 열어 둔다.
-- jgcf_create_registration 본문 맨 앞에
--   if not public.jgcf_registration_open() then return {ok:false, reason:'registration_closed'}
-- 검사가 추가됐다. 나머지 로직은 20260820073319 와 동일하다.

create or replace function public.jgcf_registration_cutoff()
returns timestamptz language sql immutable set search_path = public, pg_temp
as $$ select timestamptz '2026-09-16 18:00:00+09'; $$;

create or replace function public.jgcf_registration_open()
returns boolean language sql stable set search_path = public, pg_temp
as $$ select now() < public.jgcf_registration_cutoff(); $$;

revoke all on function public.jgcf_registration_open() from public;
grant execute on function public.jgcf_registration_open() to anon, authenticated;
