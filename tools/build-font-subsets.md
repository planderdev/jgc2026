# 폰트 서브셋 재생성

폰트 용량을 줄이기 위해 두 폰트를 서브셋으로 빌드해 사용합니다.
원본 파일은 그대로 두고 있으니, 아래 절차로 언제든 다시 만들 수 있습니다.

## 준비

```bash
python3 -m venv tmp/venv
tmp/venv/bin/pip install --no-binary fonttools,brotli fonttools brotli
```

`--no-binary`가 필요합니다. 미리 빌드된 휠은 Python 3.14에서 ABI가 맞지 않아 로드에 실패합니다.

## 1. remixicon (185KB → 1.7KB)

원본 `assets/vendor/remixicon/remixicon.woff2`에는 아이콘 3,229개가 들어 있지만
이 사이트는 17개만 씁니다. `remixicon-subset.woff2` + `remixicon-subset.css`가 그 17개만 담습니다.

**아이콘을 새로 쓰려면 반드시 서브셋을 다시 만들어야 합니다.** 그러지 않으면 네모(두부)로 보입니다.

1. 사용 중인 클래스 수집

   ```bash
   grep -rhno 'ri-[a-z0-9-]\+' --include='*.html' --include='*.js' --include='*.css' . --exclude-dir=.git --exclude-dir=tmp --exclude-dir=node_modules --exclude-dir=vendor | sed 's/.*://' | sort -u > tmp/icons.txt
   ```

2. 원본 `remixicon.css`에서 각 클래스의 코드포인트를 찾아 `--unicodes`로 넘겨 서브셋 생성
3. `remixicon-subset.css`의 규칙 목록도 같이 갱신

## 2. SUIT (610KB → 첫 방문 121KB)

`SUIT-Variable.woff2`(2,933자)를 `unicode-range`로 두 개로 나눠
브라우저가 필요한 쪽만 내려받게 합니다.

| 파일 | 내용 | 크기 |
| --- | --- | --- |
| `SUIT-site.woff2` | 사이트 텍스트에 쓰이는 글자 + 라틴/기호 안전망 (659자) | 121KB |
| `SUIT-rest.woff2` | 나머지 한글 전체 (2,274자) | 509KB |

**글자가 사라지지 않습니다.** 예약자가 입력한 이름에 흔치 않은 글자가 있으면
브라우저가 그때 `SUIT-rest`를 내려받습니다. 일반적인 페이지 열람에서는 받지 않습니다.

사이트 텍스트가 크게 바뀌면(새 페이지 추가 등) 1차 서브셋을 다시 만드는 편이 좋지만,
안 만들어도 표시가 깨지지는 않고 `SUIT-rest`를 한 번 더 받을 뿐입니다.

생성 스크립트는 `assets/css/design-system.css` 상단 주석의 설명과 함께
프로젝트 커밋 이력에 남아 있습니다. 요약하면:

1. 프로젝트의 모든 `.html` / `.js` / `.css` / `.md`에서 쓰인 문자를 모은다
2. 라틴·구두점·한글 자모·전각기호 범위를 안전망으로 합친다
3. 폰트가 지원하는 글자와 교집합 → 1차, 나머지 → 2차
4. 각각 `fontTools.subset`으로 뽑고 `unicode-range`를 `design-system.css`에 기록한다

## 이미지

사진은 AVIF로 변환해 사용합니다(`sips -s format avif -s formatOptions <품질>`).
원본 JPG/PNG는 그대로 남겨 두었으니 다시 자르거나 다른 품질로 뽑을 수 있습니다.
OG 이미지(`assets/images/og/og-default.jpg`)만 JPEG로 유지합니다 —
카카오톡 등 일부 공유 크롤러가 AVIF를 읽지 못합니다.
