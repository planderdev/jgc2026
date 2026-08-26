-- 사무국이 발송 상태를 볼 수 있게 한다. 실패가 쌓이면 여기서 먼저 드러난다.
create or replace function public.jgcf_admin_mail_status()
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
    'enabled', (select enabled from public.mail_settings where id = 1),
    'pending', (select count(*) from public.mail_outbox where status = 'pending'),
    'sent',    (select count(*) from public.mail_outbox where status = 'sent'),
    'failed',  (select count(*) from public.mail_outbox where status = 'failed'),
    'partners_without_contact',
      (select count(*) from public.partner_users where coalesce(contact_email, '') = ''),
    'recent_failures', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', kind, 'to', to_email, 'attempts', attempts,
               'error', left(coalesce(last_error, ''), 200), 'at', created_at)
             order by id desc)
        from (select * from public.mail_outbox
               where status = 'failed' or (status = 'pending' and attempts > 0)
               order by id desc limit 10) f
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.jgcf_admin_mail_status() from public, anon;
grant execute on function public.jgcf_admin_mail_status() to authenticated;

-- QA 뒷정리에 발송 대기열도 포함한다(테스트 주소는 애초에 쌓이지 않지만 방어).
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
  v_mail  int := 0;
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  with gone as (
    delete from public.mail_outbox
     where to_email like '%@example.com'
        or to_email like '%@example.org'
        or strpos(coalesce(payload->>'applicant_company', ''), '__QA__') > 0
        or strpos(coalesce(payload->>'manager_name', ''), '__QA__') > 0
    returning 1
  )
  select count(*)::int into v_mail from gone;

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
    'mails', v_mail,
    'paths', to_jsonb(v_paths),
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

-- 1분마다 밀린 메일 재시도
select cron.schedule('jgcf-mail-dispatch', '* * * * *', 'select public.jgcf_dispatch_mail()')
 where not exists (select 1 from cron.job where jobname = 'jgcf-mail-dispatch');
