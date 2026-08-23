---
title: 구조
description: 정적 사이트 + Supabase로 이루어진 시스템의 구성과 보안 모델입니다.
group: tech
---

## 한 장 요약

| 층 | 무엇 | 비고 |
| --- | --- | --- |
| 사이트 | 정적 HTML + Tailwind CLI 빌드 CSS + 바닐라 JS | 헤더·푸터는 `assets/js/common.js`가 주입, 콘텐츠는 `assets/js/data.js` |
| 호스팅 | Vercel (Pro), GitHub `main` 푸시 → 자동 배포 | cleanUrls (확장자 없는 주소) |
| 데이터 | Supabase `jgcf2026` (서울, `ahabmxxenajosbdkzull`) | 테이블 4개 + Storage 버킷 1개 |
| 인증 | Supabase Auth (이메일·비밀번호) | 사무국 2 · 상담기관 20 계정 |
| 저장소 | GitHub `planderdev/jgc2026` | `tmp/`는 gitignore(자격증명 파일 위치) |

## 보안 모델

- 모든 테이블은 **RLS 활성, 정책 0개** — 공개 키로는 어떤 행도 읽거나 쓸 수 없습니다.
- 브라우저는 `jgcf_*` **SECURITY DEFINER 함수**만 호출합니다. 각 함수는 필요한 데이터만 돌려주고 입력을 서버에서 다시 검증합니다.
- 관리자·기관 함수는 로그인 토큰으로 호출하며, `admin_users` / `partner_users` 테이블에 있는 계정만 내용을 받습니다.
- 첨부 버킷 `meetup-attachments`는 비공개. 익명은 올리기만(PDF·20MB), 사무국과 해당 기관만 내려받기.
- 공개 키(`sb_publishable_…`)는 사이트 코드에 있어도 됩니다. **service_role 키는 절대 사이트 코드에 넣지 않습니다.**

## 서버 함수

| 함수 | 누가 | 하는 일 |
| --- | --- | --- |
| `jgcf_create_reservation` | 익명 | 예약 생성. 마감·시간 형식·연락처·중복(같은 시간/같은 기관/기관-시간 선점) 검사 |
| `jgcf_lookup_reservation` | 익명 | 예약번호+연락처로 조회, 같은 연락처의 다른 예약 포함 |
| `jgcf_cancel_reservation` | 익명 | 마감 전 취소 |
| `jgcf_taken_slots` | 익명 | 기관별 마감 시간 목록(개인정보 없음) |
| `jgcf_create_registration` | 익명 | 참가신청(연락처 중복 차단, 18:00 마감) |
| `jgcf_reservation_open` · `jgcf_registration_open` | 익명 | 마감 여부 |
| `jgcf_whoami` | 로그인 | 사무국/기관 역할 판별 |
| `jgcf_admin_reservations` · `jgcf_admin_registrations` | 사무국 | 전체 목록 |
| `jgcf_admin_cancel` | 사무국 | 대신 취소(마감 무관) |
| `jgcf_admin_set_attendance` | 사무국 | 출석 토글 |
| `jgcf_partner_reservations` | 기관 | 자기 확정 예약 |

마이그레이션 파일은 `supabase/migrations/`에 순서대로 있고, 정책 설명은 `supabase/README.md`에 있습니다.

## 핵심 상수 (바꿀 때 같이 바꿀 곳)

| 값 | 서버 | 화면 |
| --- | --- | --- |
| 밋업 마감 9/16 00:00 KST | `jgcf_reservation_cutoff()` | `assets/js/admin.js` MEETUP_CUTOFF (D-day 표시) |
| 참가신청 마감 9/16 18:00 | `jgcf_registration_cutoff()` | — |
| 시간 슬롯 30분·점심 | `jgcf_valid_slot()` 정규식 | `assets/js/data.js` reservationTimes/Breaks |
| 첨부 20MB | 버킷 `file_size_limit` | `assets/js/meetup.js` ATTACHMENT_MAX_MB |
| 연락처 9~11자리 | 함수 내 검사 | `assets/js/common.js` isValidPhone |
