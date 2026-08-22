# 예약·신청 데이터베이스

예약과 참가신청은 Supabase(Postgres)에 저장됩니다.

| 항목 | 값 |
| --- | --- |
| 프로젝트 | `jgcf2026` |
| 리전 | ap-northeast-2 (서울) |
| 프로젝트 참조 | `ahabmxxenajosbdkzull` |
| 대시보드 | https://supabase.com/dashboard/project/ahabmxxenajosbdkzull |

`assets/js/supabaseConfig.js`의 키는 **공개 키**입니다. 노출되어도 안전하도록
설계되어 있습니다. 아래 "보안 구조"를 참고하세요.

## 사무국 사용법

**관리자 페이지(권장)**: https://jgc2026.vercel.app/admin

사무국 계정으로 로그인하면 예약·참가신청 목록, 검색·필터, 기관별 현황,
CSV 내려받기, 대신 취소, 첨부 PDF 열람을 쓸 수 있습니다.

계정 추가는 두 단계입니다:
1. 대시보드 → Authentication → Users → **Add user** (Auto Confirm 체크)
2. SQL Editor에서 관리자 명단에 등록:
   ```sql
   insert into admin_users (user_id, note)
   select id, '사무국 ○○○' from auth.users where email = '새계정@example.com';
   ```
등록하지 않은 계정은 로그인해도 "관리자 권한이 없습니다"만 봅니다.

**상담기관(파트너) 계정**: 상담기관 20곳마다 계정이 있습니다
(`<기관id>@2026jejugcf.com`, 자격증명은 사무국이 별도 보관). 같은 주소
(admin.html)로 로그인하면 자기 기관에 매칭된 **확정 예약만** 보입니다 —
타 기관 예약, 취소 건, 행사 참가신청은 서버가 아예 내려주지 않습니다.
읽기 전용이며 CSV 내려받기와 자기 예약의 소개서 PDF 열람만 가능합니다.
계정-기관 매핑은 `partner_users` 테이블에 있습니다.

**대시보드(보조)**: 아래 뷰로도 직접 볼 수 있습니다. 대시보드 → **Table Editor** 또는 **SQL Editor**에서 아래 뷰를 조회합니다.

| 뷰 | 내용 |
| --- | --- |
| `admin_reservations` | 밋업 예약 전체 (상담기관·시간 순) |
| `admin_registrations` | 행사 참가신청 전체 |
| `admin_slot_summary` | 상담기관별 예약 현황 요약 |

**엑셀로 내보내기**: SQL Editor에서 `select * from admin_reservations;` 실행 후
결과 우측 상단 **Download CSV**.

**첨부파일 내려받기**: 대시보드 → Storage → `meetup-attachments`.
`admin_reservations`의 `첨부파일경로` 값이 파일 위치입니다.
버킷은 비공개라 로그인해야 열립니다.

**예약 대신 취소하기**: SQL Editor에서

```sql
update reservations
set status = 'cancelled', cancelled_at = now()
where reservation_no = 'JGCF-2026-XXXXXX';
```

취소하면 해당 시간대가 자동으로 다시 열립니다.

## 보안 구조

공개 사이트라서 API 키가 브라우저에 그대로 노출됩니다. 그래서 키가 유출돼도
개인정보가 새지 않도록 설계했습니다.

- 두 테이블 모두 RLS를 켜고 **정책을 하나도 만들지 않았습니다.** 정책이 없으면
  모든 직접 접근이 거부됩니다. 브라우저 키로 `select * from reservations`를
  실행하면 빈 배열이 돌아오고, 건수조차 알 수 없습니다.
- 브라우저는 `jgcf_*` 함수 5개만 실행할 수 있습니다. 각 함수는 필요한 데이터만
  돌려줍니다. 예를 들어 마감 시간대 조회는 시간 문자열만 반환하고 신청자
  정보는 일절 포함하지 않습니다.
- 예약 조회와 취소는 **예약번호와 담당자 연락처가 모두 맞아야** 동작합니다.
- 예약번호는 순번이 아니라 난수(`JGCF-2026-W36CKW`)입니다. 순번이면 남의
  예약번호를 쉽게 추측할 수 있습니다.
- 첨부파일 버킷은 비공개이며 PDF 20MB 이하만 허용합니다. 브라우저는 업로드만
  가능하고 목록 조회나 내려받기는 불가능합니다.
- 관리자 뷰는 `security_invoker`로 만들어 대시보드에서만 보입니다.

### 절대 하지 말 것

`service_role` 키를 사이트 코드에 넣지 마세요. 그 키는 RLS를 무시하므로
브라우저에 들어가는 순간 신청자 전원의 이름·연락처·메일이 공개됩니다.

## 적용된 규칙

- **자동 확정** — 승인 절차 없이 신청 즉시 확정됩니다.
- **슬롯 중복 불가** — 같은 상담기관의 같은 시간은 한 건만. DB 유니크 인덱스가
  막으므로 두 사람이 동시에 눌러도 한 명만 성공합니다.
- **한 담당자 여러 기관 예약 가능** (2026-08-23 변경) — 건수 제한 없음. 막는 것은
  같은 담당자(메일 또는 연락처 일치)의 **같은 시간**(`time_conflict`)과 **같은 기관**
  (`company_duplicate`)뿐입니다. 완료 화면의 "다른 기관도 예약하기"가 입력값과
  소개서 경로를 넘겨 다음 예약을 바로 이어갑니다. 조회 결과에는 같은 연락처의
  다른 확정 예약이 함께 나옵니다(`others`).
- **접수·취소 마감** — 행사 전날 자정(2026-09-16 00:00 KST)에 신청자의 예약·취소가
  닫힙니다. 서버 함수가 강제하며 화면은 마감 안내를 보여줍니다. 당일 변경은 사무국이
  admin 페이지에서 대신 취소합니다(관리자 함수는 마감과 무관). 마감 시각은
  `jgcf_reservation_cutoff()` 한 곳에서 바꿉니다.
- **참가신청 마감** — 행사 종료 시각(2026-09-16 18:00 KST) 이후 접수를 닫습니다. 당일
  현장 방문자도 신청할 수 있도록 행사 중에는 열어 둡니다. 정원 제한은 없습니다.
- **출석 체크** — 행사 당일 사무국이 admin 페이지에서 예약·참가신청별로 출석을
  토글합니다(`jgcf_admin_set_attendance`, 관리자 전용, `attended_at`에 시각 기록).
  기관 화면에는 읽기 전용으로 보입니다. QR 스캔은 없고 이름·연락처 검색으로 찾습니다.
  마감 시각은 `jgcf_registration_cutoff()` 한 곳에서 바꿉니다.
- **30분 단위, 점심 제외** — 10:00~17:30 30분 간격 16슬롯 중 12:00·12:30은
  `assets/js/data.js`의 `reservationBreaks`로 화면에서 막고, 서버의
  `jgcf_valid_slot()`이 같은 규칙(정규식)으로 목록 밖 시간을 거부합니다(`invalid_slot`).
  단위를 바꾸려면 두 곳을 함께 바꿉니다. 기관 20곳 × 14슬롯 = 280석.

## 마이그레이션

`supabase/migrations/`의 SQL이 현재 스키마입니다. 순서대로 적용됩니다.

## 도메인 전환 절차 (2026jejugcf.com)

Vercel 프로젝트에 `2026jejugcf.com`과 `www.2026jejugcf.com`이 추가되어 있습니다.
도메인을 등록한 뒤 DNS에 아래 레코드를 넣으면 연결됩니다.

| 호스트 | 타입 | 값 |
| --- | --- | --- |
| `@` (2026jejugcf.com) | A | `76.76.21.21` |
| `www` | CNAME | `cname.vercel-dns.com` |

연결이 확인되면(브라우저에서 https://2026jejugcf.com 이 열리면) 공유 미리보기
주소를 새 도메인으로 바꿉니다:

```bash
node scripts/set-share-urls.mjs https://2026jejugcf.com
node scripts/build-sitemap.mjs https://2026jejugcf.com
npm run build && git commit -am "chore: 공유 주소를 2026jejugcf.com 으로" && git push
```

`jgc2026.vercel.app` 주소는 그대로 남아 새 도메인으로 자동 리다이렉트됩니다.

## 영문판 (/en/)

- `en/` 아래 페이지는 **생성물**입니다. 한국어 HTML을 고친 뒤 `node scripts/build-en.mjs`를
  실행하고, 이어서 `node scripts/set-share-urls.mjs <base>`로 canonical·hreflang을 다시 맞춥니다.
- 본문 번역은 `assets/js/i18n.en.js`의 사전(한국어 → 영어)이 런타임에 적용합니다. 새 문구를
  넣었으면 사전에도 추가하세요. 빠진 문구는 `npm run qa`의 "EN 페이지에 한글 없음" 검사가 잡습니다.
- DB에는 항상 한국어 기관명이 저장됩니다(화면 표시만 번역). 관리자·기관 화면은 한국어 그대로입니다.
- 기관·기업 영문명은 공식 표기가 확인된 것 외에는 로마자 표기이므로, 기관 확인 후 사전에서 고치세요.
