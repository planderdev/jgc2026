-- 원고 0826 p9: 일정 10:00~17:00, 매칭 상담 25분 내외.
-- 상담은 25분, 시작은 30분 간격(남는 5분은 자리 정리). 마지막 상담 16:30~16:55.
-- 17:00·17:30 시작은 더 이상 받지 않는다. 화면(data.js reservationTimes)과 같은 규칙.
create or replace function public.jgcf_valid_slot(p_time_slot text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_time_slot ~ '^(10|11|13|14|15|16):(00|30)$';
$$;
