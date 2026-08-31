---
title: 배포·도메인
description: Vercel 배포 흐름, 수동 배포, 정식 도메인 연결 절차입니다.
group: tech
---

## 배포 흐름

- GitHub `main`에 푸시하면 Vercel이 `npm run build`(Tailwind) 후 배포합니다. 보통 1~2분.
- CDN 캐시 때문에 배포 직후 1~2분은 이전 파일이 내려올 수 있습니다. 반영 확인은 `curl`로 실제 파일 내용을 봅니다.
- 수동 배포: `vercel --prod` (프로젝트 `planderdevs-projects/jgc2026`).
- 플랜은 **Pro**입니다. 무료 플랜의 하루 100회 배포 한도를 넘겨 푸시 배포가 거부된 적이 있어 전환했습니다. 한도로 거부된 푸시는 자동 재시도되지 않으므로 그런 경우 `vercel --prod`로 직접 배포합니다.

## 자동 점검과의 관계

GitHub Actions 자동 점검이 ✗여도 **배포는 막히지 않습니다.** 막고 싶으면 Vercel의 Deployment Protection 또는 Ignored Build Step에 연결합니다.

## 정식 도메인 (2026jejugcf.com)

**2026-08-26에 연결이 끝났습니다.** 현재 구성은 이렇습니다.

| 항목 | 값 |
|---|---|
| 등록업체 | 가비아 |
| 네임서버 | `ns1.vercel-dns.com` / `ns2.vercel-dns.com` (DNS는 Vercel이 관리) |
| www | `www.2026jejugcf.com` → 정식 주소로 308 리다이렉트 (`vercel.json`) |
| 예전 주소 | `jgc2026.vercel.app`도 계속 열림. 안내에는 정식 도메인만 사용 |
| 메일 발송 인증 | Resend↔Vercel 연동으로 SPF·DKIM 레코드 자동 등록, 도메인 Verified |

DNS 레코드를 추가할 일이 생기면(예: 다른 서비스 인증) 가비아가 아니라 **Vercel**에서 합니다 — 대시보드 Domains → 2026jejugcf.com, 또는 `vercel dns add`.

:::warn 도메인을 옮기거나 바꿀 때
사이트 주소가 바뀌면 아래 두 명령으로 전 페이지의 OG·canonical·sitemap을 갱신하고 커밋합니다. 가이드·계정 안내 문구도 함께 봐야 합니다.

```
node scripts/set-share-urls.mjs https://새주소
node scripts/build-sitemap.mjs https://새주소
```
:::

## 유지보수 스크립트

| 명령 | 하는 일 |
| --- | --- |
| `npm run build` | CSS 빌드 (`assets/css/src` → `assets/css/styles.css`). 커밋 전 필수 |
| `node scripts/build-en.mjs` | 영문 페이지 생성 ([영문판](/docs/tech/i18n)) |
| `node scripts/set-share-urls.mjs <base>` | OG·canonical·hreflang 절대 URL 갱신(멱등) |
| `node scripts/build-sitemap.mjs <base>` | sitemap.xml(ko+en)·robots.txt |
| `node scripts/build-docs.mjs` | 이 가이드 생성 (`docs-src/` → `docs/`) |
| `npm run qa` / `npm run qa:live` | 회귀 테스트 (로컬 / 프로덕션) |
