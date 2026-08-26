---
title: 회귀 테스트·자동 점검
description: 로컬 회귀 스위트 4종과 GitHub Actions 자동 점검의 범위입니다.
group: tech
---

## 스위트

| 스위트 | 검사 | 실행 |
| --- | --- | --- |
| **render** | 35페이지(ko+en) × 3뷰포트: JS 에러·실패 요청·가로 오버플로·h1·메타/OG·접근성 기본 | 자동 + 수동 |
| **ui** | 과거에 실제로 깨졌던 지점 18개: clean URL, 헤더 중앙, About 클릭, 홈 순서·연사 카드, 푸터, /meetup 링크, 모바일 메뉴 키보드, 404·robots·sitemap, **EN 한글 잔존·언어 스위치·hreflang** | 자동 + 수동 |
| **flows** | 실제 DB에 예약·참가신청을 만들어 생성→마감 반영→중복 차단→조회→취소→재개방 | **수동만** |
| **security** | 공개 키로 테이블·뷰·버킷 직접 공격 → 거부 확인, 목록 밖 시간·익명 출석 호출 거부 | 자동 + 수동 |

```
npm run qa                      # 로컬(정적 서버 4199, cleanUrls 에뮬레이션)
npm run qa -- --only=render,ui  # 일부만
npm run qa:live                 # 프로덕션 대상
```

시스템 Chrome이 필요합니다(playwright-core). 테스트 데이터는 `__QA__` 표시를 남기고, 실행이 끝나면 **QA가 스스로 지웁니다** — 예약·참가신청·첨부를 지운 뒤 잔여 0을 확인해 출력하며, 남은 게 있으면 FAIL 처리됩니다. 자세한 내용은 [데이터 운영](/docs/tech/data)을 보세요.

## 자동 점검 (GitHub Actions)

`.github/workflows/qa.yml` — `main` 푸시·PR마다:

1. **CSS 빌드 일치** — `npm run build` 후 `styles.css`가 커밋과 다르면 실패
2. **영문판 최신** — `build-en.mjs` + `set-share-urls.mjs` 후 `en/`·canonical이 다르면 실패
3. **render · ui · security** 스위트

flows는 실제 데이터를 만들므로 제외합니다. 실패는 커밋 옆 ✗와 Actions 탭에서 확인하며, 배포를 막지는 않습니다.

:::info 워크플로 파일 수정
`.github/workflows/`는 GitHub 토큰에 `workflow` 권한이 있어야 푸시됩니다(`gh auth refresh -s workflow`).
:::
