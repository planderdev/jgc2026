# QA 회귀 테스트

사이트를 바꾼 뒤 깨진 곳이 없는지 한 번에 확인합니다. 실제 Chrome을 띄워 사용자처럼 동작합니다.

```bash
npm run qa                                   # 로컬 파일 기준 (서버 자동 기동)
npm run qa:live                              # 배포 사이트(jgc2026.vercel.app) 기준
npm run qa -- --only=render,ui               # 일부만
```

| 스위트 | 내용 | Supabase 호출 |
| --- | --- | --- |
| `render` | 18페이지 × 3뷰포트 — JS 에러·실패 요청·가로 오버플로우·h1·메타/OG·접근성 기본 | 없음 |
| `ui` | 과거에 깨졌던 지점 — clean URL, 헤더 중앙정렬, GNB 활성, About 클릭, 홈 순서, 연사 카드, 푸터, /meetup 링크, 모바일 메뉴 접근성 | 없음 |
| `flows` | 밋업 예약 전 과정, 참가신청, 마감 상태 UI | **있음** — 테스트 데이터 생성 |
| `security` | 공개 키로 직접 공격: 테이블·뷰·버킷 접근 거부, 파트너/관리자 권한 경계 | 있음(읽기만) |

## 준비물

- Node 18+, Chrome 설치 (다른 경로면 `CHROME_PATH=/path/to/chrome`)
- `flows`는 실제 DB에 씁니다. 신청기업·이름에 `__QA__`가 붙어 구분되며, 끝나면 `cleanup.sql`로 지웁니다.
- 권한 경계까지 보려면 환경변수: `QA_PARTNER_EMAIL`, `QA_PARTNER_PASSWORD`, `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`

## 언제 돌리나

- 푸시 전: `npm run qa` — 로컬에서 전부
- 배포 직후: `npm run qa:live -- --only=render,ui,security` — 데이터 안 만들고 확인
- 기능을 건드렸을 때: `npm run qa:live` 전체 (끝나면 cleanup.sql)

## 로컬 서버가 따로 있는 이유

`python -m http.server`는 `/about` 같은 확장자 없는 주소를 못 열어 배포와 다르게 동작합니다.
`lib.mjs`의 내장 서버가 Vercel cleanUrls(`/about` → `about.html`, `/meetup` → `meetup/index.html`)를 흉내 냅니다.
이 차이 때문에 `/meetup`의 상대 링크가 배포에서만 404였던 적이 있습니다.

`scripts/qa.mjs`(별도)는 이전에 만든 Windows 전용 스크립트로, 이 디렉터리와는 독립입니다.
