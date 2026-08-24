# Asset Inventory

The website uses bundled local assets except for the requested Google Maps iframe in the home location section.

## Images

| Local file | Usage |
| --- | --- |
| `assets/images/hero/hero.jpg` | Home hero abstract background |
| `assets/images/hero/hero-forum.jpg` | Forum/audience visual |
| `assets/images/common/theme-discussion.jpg` | Theme discussion visual |
| `assets/images/common/content-studio.jpg` | Media and FAQ visual |
| `assets/images/venue/venue-hall.jpg` | Venue interior visual |
| `assets/images/venue/venue-map.jpg` | Venue area visual |
| `assets/images/meetup/meetup-room.jpg` | Business meetup visual |
| `assets/images/program/session-stage.jpg` | Program stage visual |
| `assets/images/speakers/speaker-01.jpg` | Speaker visual |
| `assets/images/speakers/speaker-02.jpg` | Speaker visual |
| `assets/images/speakers/speaker-03.jpg` | Speaker visual |
| `assets/images/speakers/speaker-04.jpg` | Speaker visual |
| `assets/images/speakers/speaker-05.jpg` | Speaker visual |
| `assets/images/speakers/speaker-06.jpg` | Speaker visual |
| `assets/images/speakers/speaker-07.jpg` | Speaker visual |
| `assets/images/speakers/speaker-08.jpg` | Speaker visual |
| `assets/images/speakers/speaker-samuel-lorca.jpg` | Extracted from the 2026 JGCF homepage manuscript PDF provided by the organizer |
| `assets/images/home/event-opening.jpg` | Home program visual |
| `assets/images/home/event-conference.jpg` | Home conference visual |
| `assets/images/home/event-creator.jpg` | Home creator visual |
| `assets/images/home/event-meetup.jpg` | Home business meetup visual |
| `assets/images/home/event-showcase.jpg` | Home showcase visual |
| `assets/images/home/event-networking.jpg` | Home networking visual |
| `assets/images/home/event-studio.jpg` | Home studio visual |
| `assets/images/home/event-audience.jpg` | Home audience visual |
| `assets/images/home/program-business.jpg` | Home special program visual |
| `assets/images/home/program-tour.jpg` | Home field visit visual |
| `assets/images/home/venue-bein-stage.jpg` | Home venue guide visual (원본 `.png`는 소스로 보관) |

## External Media

| URL | Usage |
| --- | --- |
| `https://www.google.com/maps/embed?...` | Home venue guide map iframe |

## Video

No video asset is bundled. The current implementation uses still images with overlay and motion.

## Fonts

| Local file | Source | License |
| --- | --- | --- |
| `assets/fonts/suit/SUIT-site.woff2` | `SUIT-Variable.woff2` 서브셋 | SIL Open Font License 1.1 |
| `assets/fonts/suit/SUIT-rest.woff2` | `SUIT-Variable.woff2` 서브셋 | SIL Open Font License 1.1 |
| `assets/fonts/suit/SUIT-Variable.woff2` | `@sun-typeface/suit` 2.0.5 (서브셋 원본) | SIL Open Font License 1.1 |
| `assets/vendor/remixicon/remixicon-subset.woff2` | `remixicon.woff2` 서브셋 (사용 아이콘 17개) | Remix Icon License 1.0 |

SUIT은 `unicode-range`로 두 파일로 나뉘어 있고, remixicon은 실제 사용하는 아이콘만 담고 있습니다.
재생성 절차는 [`tools/build-font-subsets.md`](tools/build-font-subsets.md)를 참고하세요.

## Open Graph

| Local file | Usage |
| --- | --- |
| `assets/images/og/og-default.jpg` | 전 페이지 공유 미리보기 이미지 (1200x630) |

공유 크롤러 호환을 위해 JPEG로 유지합니다. 배포 도메인이 확정되면
각 HTML의 `og:image`를 절대 URL로 바꿔야 카카오톡에서 미리보기가 뜹니다.
