-- QA 스위트가 만든 테스트 데이터를 스스로 지우기 위한 함수.
-- QA는 운영 DB를 그대로 쓰므로, 실행 후 남는 테스트 예약·참가신청이 모집 기간에
-- 진짜 신청과 섞이지 않게 한다.
--
-- 안전장치: 지우는 대상을 QA 표시로만 한정한다.
--   · 신청기업/담당자/이름에 '__QA__' 문자열이 들어간 행
--   · 이메일이 qa…@example.com 인 행 (example.com은 시험용 예약 도메인)
-- 실제 신청자는 이 조건에 걸릴 수 없다. 사무국 계정만 실행할 수 있다.
create or replace function public.jgcf_qa_cleanup()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paths text[] := '{}';
  v_res   int := 0;
  v_reg   int := 0;
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  with gone as (
    delete from public.reservations
     where strpos(coalesce(applicant_company, ''), '__QA__') > 0
        or strpos(coalesce(manager_name, ''), '__QA__') > 0
        or email like 'qa%@example.com'
    returning attachment_path
  )
  select count(*)::int, coalesce(array_agg(attachment_path) filter (where attachment_path is not null), '{}')
    into v_res, v_paths
    from gone;

  with gone as (
    delete from public.event_registrations
     where strpos(coalesce(name, ''), '__QA__') > 0
        or strpos(coalesce(organization, ''), '__QA__') > 0
    returning 1
  )
  select count(*)::int into v_reg from gone;

  return jsonb_build_object(
    'ok', true,
    'reservations', v_res,
    'registrations', v_reg,
    -- 첨부는 Storage에 남는다. 호출한 쪽에서 이 경로들을 지운다.
    'paths', to_jsonb(v_paths),
    -- 지운 뒤 남아 있는 QA 흔적. 정상이면 둘 다 0이다.
    'remaining_reservations', (select count(*) from public.reservations
                                where strpos(coalesce(applicant_company, ''), '__QA__') > 0
                                   or strpos(coalesce(manager_name, ''), '__QA__') > 0
                                   or email like 'qa%@example.com'),
    'remaining_registrations', (select count(*) from public.event_registrations
                                 where strpos(coalesce(name, ''), '__QA__') > 0
                                    or strpos(coalesce(organization, ''), '__QA__') > 0)
  );
end;
$$;

revoke all on function public.jgcf_qa_cleanup() from public, anon;
grant execute on function public.jgcf_qa_cleanup() to authenticated;
