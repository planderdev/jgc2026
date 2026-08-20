-- JGCF 2026 예약/신청 저장소
--
-- 공개 정적 사이트에서 호출하므로 API 키가 브라우저에 노출된다.
-- 따라서 테이블 직접 접근은 RLS로 전면 차단하고, 검증 로직이 담긴
-- SECURITY DEFINER 함수를 통해서만 읽고 쓴다. (다음 마이그레이션에서 정의)

create table public.reservations (
  id                bigint generated always as identity primary key,
  -- 공개 예약번호. 순번이 아니라 난수라서 남의 예약을 추측하기 어렵다.
  reservation_no    text        not null unique,
  company_id        text        not null,
  company_name      text        not null,
  company_field     text,
  time_slot         text        not null,
  applicant_company text        not null,
  manager_name      text        not null,
  phone             text        not null,
  -- 조회 시 대조용. 하이픈 유무와 무관하게 맞추기 위해 숫자만 남긴다.
  phone_digits      text        not null,
  email             text        not null,
  inquiry           text        not null,
  attachment_path   text,
  attachment_name   text,
  status            text        not null default 'confirmed'
                      check (status in ('confirmed', 'cancelled')),
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz
);

-- 같은 기관의 같은 시간대는 한 건만. 취소된 예약은 자리를 비워 준다.
create unique index reservations_slot_unique
  on public.reservations (company_id, time_slot)
  where status = 'confirmed';

-- 중복 신청 차단. 한 담당자가 여러 기관에 겹쳐 신청하지 못한다.
-- 메일과 연락처 각각으로 막아 둘 중 하나만 바꿔서 우회하는 것을 방지한다.
create unique index reservations_email_unique
  on public.reservations (lower(email))
  where status = 'confirmed';

create unique index reservations_phone_unique
  on public.reservations (phone_digits)
  where status = 'confirmed';

create index reservations_company_idx on public.reservations (company_id, status);
create index reservations_created_idx on public.reservations (created_at desc);

-- 행사 참가신청. 예약과 달리 조회/취소가 없어 구조가 단순하다.
create table public.event_registrations (
  id                bigint generated always as identity primary key,
  registration_no   text        not null unique,
  participant_type  text        not null check (participant_type in ('company', 'general', 'student')),
  name              text        not null,
  organization      text,
  phone             text        not null,
  phone_digits      text        not null,
  created_at        timestamptz not null default now()
);

-- 같은 연락처로 중복 참가신청 차단
create unique index event_registrations_phone_unique
  on public.event_registrations (phone_digits);

alter table public.reservations        enable row level security;
alter table public.event_registrations enable row level security;

-- 정책을 하나도 만들지 않는다. RLS가 켜진 채 정책이 없으면 anon/authenticated는
-- 어떤 행도 읽거나 쓸 수 없다. 접근은 오직 SECURITY DEFINER 함수를 통해서만 이뤄진다.

comment on table public.reservations is
  '비즈니스 밋업 예약. 직접 접근 불가 — jgcf_* 함수로만 접근한다.';
comment on table public.event_registrations is
  '행사 참가신청. 직접 접근 불가 — jgcf_* 함수로만 접근한다.';
