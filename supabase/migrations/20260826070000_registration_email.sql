-- 참가신청에도 메일 주소를 받는다. 확인 메일을 보내기 위해서다.
-- 서버는 값이 있을 때만 형식을 보고, 없으면 접수는 되되 메일만 나가지 않는다.
-- (배포 직후 예전 JS가 캐시된 브라우저에서 4인자 호출이 들어와도 실패하지 않게)
alter table public.event_registrations add column if not exists email text;

drop function if exists public.jgcf_create_registration(text, text, text, text);

create or replace function public.jgcf_create_registration(
  p_participant_type text,
  p_name             text,
  p_organization     text,
  p_phone            text,
  p_email            text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text := public.jgcf_phone_digits(p_phone);
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_no     text;
begin
  if not public.jgcf_registration_open() then
    return jsonb_build_object('ok', false, 'reason', 'registration_closed');
  end if;

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
  if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;
  if length(v_email) > 120 then
    return jsonb_build_object('ok', false, 'reason', 'too_long');
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
      (registration_no, participant_type, name, organization, phone, phone_digits, email)
    values
      (v_no, p_participant_type, p_name, nullif(btrim(coalesce(p_organization, '')), ''),
       btrim(p_phone), v_digits, nullif(v_email, ''));
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'reason', 'already_registered');
  end;

  return jsonb_build_object('ok', true, 'registration_no', v_no);
end;
$$;

revoke all on function public.jgcf_create_registration(text, text, text, text, text) from public;
grant execute on function public.jgcf_create_registration(text, text, text, text, text) to anon, authenticated;

-- 사무국 목록에도 메일을 함께 내려준다.
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
        'email',            e.email,
        'created_at',       e.created_at,
        'attended_at',      e.attended_at
      ) order by e.created_at desc)
      from public.event_registrations e
    ), '[]'::jsonb)
  );
end;
$$;

-- 참가신청 확인 메일을 대기열에 넣는다.
create or replace function public.jgcf_queue_registration_mail()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.jgcf_is_sendable(new.email) then
    insert into public.mail_outbox (kind, to_email, payload)
    values ('registration_confirmed', new.email, jsonb_build_object(
      'registration_no',  new.registration_no,
      'participant_type', new.participant_type,
      'name',             new.name,
      'organization',     coalesce(new.organization, ''),
      'phone',            new.phone
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists jgcf_registration_mail on public.event_registrations;
create trigger jgcf_registration_mail
after insert on public.event_registrations
for each row execute function public.jgcf_queue_registration_mail();
