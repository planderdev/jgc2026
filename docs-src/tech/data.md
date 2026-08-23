---
title: 데이터 운영
description: 테스트 데이터 정리, Storage 정리, 계정 생성, 백업 등 Supabase 쪽 운영 작업입니다.
group: tech
---

## 테스트 데이터 정리

관리자 화면에는 삭제 기능이 없습니다. Supabase 대시보드 → SQL Editor에서:

```sql
delete from public.event_registrations where name like '%__QA__%';
delete from public.reservations where applicant_company like '%__QA__%' or manager_name like '%__QA__%';
select (select count(*) from public.reservations) r, (select count(*) from public.event_registrations) e;
```

`__QA__` 표시가 없는 행(실제 테스트 예약 등)은 명시적으로 번호를 지정해 지웁니다. **실제 모집 데이터는 보유기간 전에 지우지 마세요.**

## Storage 정리

Storage 버킷은 보호 트리거 때문에 SQL로 지울 수 없습니다. 대시보드 → Storage → `meetup-attachments` → 파일 선택 → Delete. 예약이 취소·삭제돼도 파일은 자동 삭제되지 않으므로 행사 후 일괄 정리합니다.

## 계정 생성

계정 도메인 `2026jejugcf.com`이 미등록이라 일반 가입(확인 메일)은 쓸 수 없어 `auth.users`에 직접 넣었습니다. 새 계정이 필요하면 개발 담당이 같은 방식으로 만들고 `admin_users` 또는 `partner_users`에 연결합니다. 비밀번호는 bcrypt 해시로만 저장되며, 평문은 운영계정 엑셀에만 기록합니다.

## 백업

:::warn 자동 백업 없음
Supabase 무료 플랜에는 자동 백업이 없습니다. 모집 기간 중에는 주기적으로(예: 매일 저녁) 관리자 화면에서 **밋업 예약·참가신청 CSV를 내려받아** 보관하세요. 실수로 지운 데이터는 복구할 수 없습니다.
:::

## 개인정보 보유기간

행사 종료 후 1년(2027-09-16)까지 보유 후 파기. 프로젝트 삭제로 전체 파기할 수 있습니다. 상담기관 제공분은 행사 종료 즉시 파기를 요청합니다.
