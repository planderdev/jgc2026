-- 메일 발송 대기열.
--
-- 예약이 확정·취소될 때 보낼 메일을 이 표에 쌓아 두고, Edge Function
--(dispatch-mail)이 꺼내서 보낸다. 바로 보내지 않고 표를 거치는 이유:
--   · 발송이 실패해도 기록이 남아 다시 시도할 수 있다
--   · 메일 서비스가 잠깐 죽어도 예약 자체는 정상 처리된다
--   · 무엇을 언제 보냈는지 사무국이 확인할 수 있다
--
-- 참가신청(event_registrations)은 이메일을 받지 않아 대상이 아니다.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- 상담기관의 실제 수신 주소. 로그인 아이디(기관아이디@2026jejugcf.com)는
-- 수신함이 없으므로 알림을 보내려면 이 칸을 채워야 한다.
alter table public.partner_users add column if not exists contact_email text;

create table if not exists public.mail_outbox (
  id          bigint generated always as identity primary key,
  kind        text        not null,
  to_email    text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  status      text        not null default 'pending',
  attempts    int         not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  constraint mail_outbox_status_check check (status in ('pending', 'sent', 'failed'))
);

alter table public.mail_outbox enable row level security;
-- 정책을 두지 않는다 = 익명·로그인 사용자 모두 접근 불가.
-- 아래 security definer 함수와 서비스 키만 읽고 쓴다.

create index if not exists mail_outbox_pending_idx
  on public.mail_outbox (created_at) where status = 'pending';

-- 발송 설정(함수 주소·호출 키). RLS 정책이 없어 밖에서는 읽히지 않는다.
create table if not exists public.mail_settings (
  id           int primary key default 1,
  function_url text,
  dispatch_key text,
  enabled      boolean not null default false,
  constraint mail_settings_single check (id = 1)
);
alter table public.mail_settings enable row level security;
insert into public.mail_settings (id) values (1) on conflict (id) do nothing;

-- 테스트 주소로는 보내지 않는다. QA가 만든 예약까지 발송되면 반송이 쌓여
-- 도메인 평판이 나빠진다.
create or replace function public.jgcf_is_sendable(p_email text)
returns boolean language sql immutable as $$
  select coalesce(p_email, '') <> ''
     and p_email like '%@%'
     and p_email not like '%@example.com'
     and p_email not like '%@example.org';
$$;

create or replace function public.jgcf_queue_reservation_mail()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'reservation_no',    new.reservation_no,
    'company_name',      new.company_name,
    'applicant_company', new.applicant_company,
    'manager_name',      new.manager_name,
    'time_slot',         new.time_slot,
    'phone',             new.phone,
    'email',             new.email
  );

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('reservation_confirmed', new.email, v_payload);
    end if;

  elsif tg_op = 'UPDATE'
        and new.status = 'cancelled'
        and old.status is distinct from new.status then
    -- 신청자에게 취소 확인
    if public.jgcf_is_sendable(new.email) then
      insert into public.mail_outbox (kind, to_email, payload)
      values ('reservation_cancelled', new.email, v_payload);
    end if;
    -- 상담기관에 빈자리 알림 (수신 주소가 등록된 기관만)
    insert into public.mail_outbox (kind, to_email, payload)
    select 'partner_cancelled', p.contact_email, v_payload
      from public.partner_users p
     where p.company_id = new.company_id
       and public.jgcf_is_sendable(p.contact_email);
  end if;

  return new;
end;
$$;

drop trigger if exists jgcf_reservation_mail on public.reservations;
create trigger jgcf_reservation_mail
after insert or update of status on public.reservations
for each row execute function public.jgcf_queue_reservation_mail();

-- 대기열이 비어 있지 않으면 Edge Function을 깨운다.
-- 트리거 직후(즉시 발송)와 cron(놓친 건 재시도) 양쪽에서 부른다.
create or replace function public.jgcf_dispatch_mail()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  s public.mail_settings%rowtype;
begin
  select * into s from public.mail_settings where id = 1;
  if not found or not s.enabled or coalesce(s.function_url, '') = '' then
    return;
  end if;
  if not exists (select 1 from public.mail_outbox where status = 'pending' and attempts < 5) then
    return;
  end if;

  perform net.http_post(
    url     := s.function_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-dispatch-key', coalesce(s.dispatch_key, '')),
    body    := '{}'::jsonb
  );
end;
$$;

revoke all on function public.jgcf_dispatch_mail() from public, anon, authenticated;

-- 1분마다 밀린 메일을 확인한다.
select cron.unschedule('jgcf-mail-dispatch')
 where exists (select 1 from cron.job where jobname = 'jgcf-mail-dispatch');
select cron.schedule('jgcf-mail-dispatch', '* * * * *', 'select public.jgcf_dispatch_mail()');
