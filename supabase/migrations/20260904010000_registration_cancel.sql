-- 행사 참가신청도 신청자가 직접 조회·취소할 수 있게 한다.
-- 예약과 같은 방식으로 행은 남기고 status/cancelled_at만 바꾼다.

alter table public.event_registrations
  add column if not exists status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled'));

alter table public.event_registrations
  add column if not exists cancelled_at timestamptz;

-- 취소한 참가자는 다시 신청할 수 있어야 하므로, 연락처 중복은 확정 건만 막는다.
drop index if exists public.event_registrations_phone_unique;
create unique index event_registrations_phone_unique
  on public.event_registrations (phone_digits)
  where status = 'confirmed';

comment on table public.event_registrations is
  '행사 참가신청. 직접 접근 불가 — jgcf_* 함수로만 조회·생성·취소한다.';

create or replace function public.jgcf_lookup_registration(
  p_registration_no text,
  p_phone           text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_no           text := upper(btrim(coalesce(p_registration_no, '')));
  v_digits       text := public.jgcf_phone_digits(p_phone);
  v_registration jsonb;
begin
  select jsonb_build_object(
    'registration_no',  e.registration_no,
    'participant_type', e.participant_type,
    'name',             e.name,
    'organization',     e.organization,
    'phone',            e.phone,
    'email',            e.email,
    'status',           e.status,
    'created_at',       e.created_at,
    'cancelled_at',     e.cancelled_at
  )
    into v_registration
  from public.event_registrations e
  where e.registration_no = v_no
    and e.phone_digits = v_digits;

  if v_registration is null then
    return jsonb_build_object('ok', false, 'reason', 'registration_not_found');
  end if;

  return jsonb_build_object('ok', true, 'registration', v_registration);
end;
$$;

create or replace function public.jgcf_cancel_registration(
  p_registration_no text,
  p_phone           text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_no     text := upper(btrim(coalesce(p_registration_no, '')));
  v_digits text := public.jgcf_phone_digits(p_phone);
begin
  if not public.jgcf_registration_open() then
    return jsonb_build_object('ok', false, 'reason', 'registration_cancel_closed');
  end if;

  update public.event_registrations
  set status = 'cancelled',
      cancelled_at = now(),
      attended_at = null
  where registration_no = v_no
    and phone_digits = v_digits
    and status = 'confirmed';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'registration_not_found_or_already_cancelled');
  end if;

  return public.jgcf_lookup_registration(v_no, p_phone);
end;
$$;

create or replace function public.jgcf_admin_cancel_registration(p_registration_no text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_no text := upper(btrim(coalesce(p_registration_no, '')));
begin
  if not public.jgcf_is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  update public.event_registrations
  set status = 'cancelled',
      cancelled_at = now(),
      attended_at = null
  where registration_no = v_no
    and status = 'confirmed';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'registration_not_found_or_already_cancelled');
  end if;

  return jsonb_build_object('ok', true);
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
        'email',            e.email,
        'status',           e.status,
        'created_at',       e.created_at,
        'cancelled_at',     e.cancelled_at,
        'attended_at',      e.attended_at
      ) order by e.created_at desc)
      from public.event_registrations e
    ), '[]'::jsonb)
  );
end;
$$;

-- 취소된 참가신청은 출석 처리 대상에서 제외한다.
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
    where registration_no = v_no and status = 'confirmed';
  else
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'attended_at', v_when);
end;
$$;

create or replace function public.jgcf_queue_registration_mail()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'registration_no',  new.registration_no,
    'participant_type', new.participant_type,
    'name',             new.name,
    'organization',     coalesce(new.organization, ''),
    'phone',            new.phone
  );

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('registration_confirmed', new.email, v_payload);
    end if;

  elsif tg_op = 'UPDATE'
        and new.status = 'cancelled'
        and old.status is distinct from new.status then
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('registration_cancelled', new.email, v_payload);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists jgcf_registration_mail on public.event_registrations;
create trigger jgcf_registration_mail
after insert or update of status on public.event_registrations
for each row execute function public.jgcf_queue_registration_mail();

revoke all on function public.jgcf_lookup_registration(text, text) from public;
revoke all on function public.jgcf_cancel_registration(text, text) from public;
revoke all on function public.jgcf_admin_cancel_registration(text) from public, anon;

grant execute on function public.jgcf_lookup_registration(text, text) to anon, authenticated;
grant execute on function public.jgcf_cancel_registration(text, text) to anon, authenticated;
grant execute on function public.jgcf_admin_cancel_registration(text) to authenticated;
