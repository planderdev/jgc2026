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

## 정식 도메인 연결 (2026jejugcf.com)

도메인은 Vercel 프로젝트에 등록만 되어 있고 구매·DNS는 보류 중입니다.

1. **도메인 구매** — 등록업체에서 `2026jejugcf.com` 구매
2. **DNS 설정** — A 레코드 `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`
3. **Vercel에서 확인** — Project → Settings → Domains에서 Valid 표시 확인(전파 최대 수 시간)
4. **사이트 주소 갱신** — 아래 두 명령을 실행하고 커밋·푸시

```
node scripts/set-share-urls.mjs https://2026jejugcf.com
node scripts/build-sitemap.mjs https://2026jejugcf.com
```

5. **문서·문구 갱신** — 이 가이드, 계정 안내 문구, 관리자 QR은 사이트 origin을 쓰므로 자동 반영

:::info 도메인이 연결되면 가능해지는 것
계정 도메인 메일이 수신되므로 비밀번호 재설정 메일이 동작하고, 예약 확인 메일·취소 시 기관 알림(발신 도메인 인증 필요)을 구현할 수 있습니다.
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
