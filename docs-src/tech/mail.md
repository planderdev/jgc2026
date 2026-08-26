---
title: 메일 발송
description: 예약 확인 메일과 취소 알림이 어떤 구조로 나가는지, 켜려면 무엇이 필요한지 정리했습니다.
group: tech
---

## 무엇이 언제 나가는가

| 종류 | 받는 사람 | 보내는 시점 |
|---|---|---|
| 예약 확정 안내 | 신청 기업 담당자 | 밋업 예약이 확정될 때 |
| 예약 취소 안내 | 신청 기업 담당자 | 예약이 취소될 때(본인 취소·사무국 대신 취소 모두) |
| 상담 취소 알림 | 상담기관 | 그 기관의 예약이 취소될 때 |
| 참가신청 접수 안내 | 참가 신청자 | 행사 참가신청이 접수될 때 |

:::info 메일 주소가 없으면 접수는 되고 메일만 안 갑니다
참가신청 폼은 메일 주소를 필수로 받지만, 서버는 값이 없어도 접수를 막지 않습니다. 배포 직후 예전 화면이 캐시된 브라우저에서 들어오는 신청을 실패시키지 않기 위해서입니다.
:::

## 구조

바로 보내지 않고 **발송 대기열**(`mail_outbox` 표)을 거칩니다.

1. **쌓기** — 예약이 확정·취소되거나 참가신청이 접수되면 DB 트리거가 보낼 메일을 대기열에 넣습니다
2. **깨우기** — 대기열에 새 줄이 생기면 곧바로 발송기를 호출합니다
3. **보내기** — Edge Function `dispatch-mail`이 대기 건을 꺼내 Resend로 보내고 결과를 기록합니다
4. **재시도** — 1분마다 도는 cron이 실패했거나 놓친 건을 다시 시도합니다(최대 5회)

대기열을 두는 이유는 메일 서비스가 잠깐 죽어도 **예약 자체는 정상 처리되게** 하기 위해서입니다. 발송이 실패해도 예약은 남고, 무엇이 왜 실패했는지도 남습니다.

:::good 테스트 주소로는 보내지 않습니다
`@example.com`으로 끝나는 주소는 대기열에 아예 쌓이지 않습니다(`jgcf_is_sendable`). QA가 만든 예약까지 발송되면 반송이 쌓여 도메인 평판이 나빠지기 때문입니다.
:::

## 켜려면 필요한 것

발송은 기본이 **꺼짐**입니다(`mail_settings.enabled = false`). 아래가 모두 준비되면 켭니다.

1. **Resend 계정과 도메인 인증** — `2026jejugcf.com`을 등록하고 안내되는 DNS 레코드(DKIM·SPF)를 네임서버에 추가합니다. 네임서버가 Vercel이므로 `vercel dns add`로 넣습니다
2. **Edge Function 비밀값** — Supabase → Edge Functions → Secrets에 세 가지를 넣습니다

   | 이름 | 값 |
   |---|---|
   | `RESEND_API_KEY` | Resend에서 만든 API 키 |
   | `DISPATCH_KEY` | `mail_settings.dispatch_key`와 같은 값 |
   | `MAIL_FROM` | `JGCF 2026 운영사무국 <noreply@2026jejugcf.com>` |

3. **상담기관 수신 주소** — 취소 알림을 받을 실제 주소입니다. 로그인 아이디(`기관아이디@2026jejugcf.com`)는 **수신함이 없어** 쓸 수 없습니다

   ```sql
   update public.partner_users
      set contact_email = 'meetup@example-org.kr'
    where company_id = 'kb-investment';
   ```

   비어 있는 기관은 취소 알림을 **건너뜁니다** — 예약 처리는 그대로 되고 메일만 안 갑니다.

4. **켜기**

   ```sql
   update public.mail_settings set enabled = true where id = 1;
   ```

## 상태 확인

사무국 계정으로 `jgcf_admin_mail_status()`를 호출하면 대기·발송·실패 건수, 수신 주소가 없는 기관 수, 최근 실패 10건을 볼 수 있습니다.

```sql
select public.jgcf_admin_mail_status();
```

문제가 생기면 `mail_outbox`의 `last_error`를 먼저 봅니다. 흔한 원인은 도메인 인증 미완료, API 키 오타, 수신 주소 오타입니다.

## 문구 고치기

메일 본문은 `supabase/functions/dispatch-mail/index.ts`의 `render()`에 있습니다. 고친 뒤 함수를 다시 배포하면 반영됩니다. 대기열에 이미 쌓인 건은 보낼 때 문구를 만들므로, 아직 안 나간 메일에도 새 문구가 적용됩니다.
