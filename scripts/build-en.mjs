/**
 * 영문 페이지 생성기
 *
 * 한국어 HTML을 원본으로 /en/ 아래에 같은 구조의 페이지를 만든다.
 *  - <html lang="en">, 영문 <title>/description/og
 *  - 자산·내부 링크를 사이트 루트 기준 절대 경로로 (/assets/..., /en/...)
 *  - 번역 오버레이(assets/js/i18n.en.js)를 가장 먼저 로드
 * 본문 번역은 오버레이가 런타임에 하므로, 한국어 페이지를 고친 뒤 이 스크립트를 다시 돌리면 된다.
 *
 *   node scripts/build-en.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// 페이지별 영문 제목·설명. 여기 없는 페이지는 만들지 않는다.
const PAGES = {
  'index.html': ['JGCF 2026 | Jeju Global Content Forum', 'Jeju Global Content Forum & Business Networking 2026 — Sep 16, 2026 at Jeju Contents Agency. Forum, IR pitching, exhibition and business meetups in one day.'],
  'about.html': ['About | JGCF 2026', 'What JGCF 2026 is: a content-industry networking platform that links the forum, IR pitching, exhibition and business meetups.'],
  'theme.html': ['2026 Theme | JGCF 2026', 'The 2026 theme: where Jeju content companies meet global investment and their next market.'],
  'venue.html': ['Venue | JGCF 2026', 'Be IN;, 1F, Jeju Contents Agency, 82 Sinsan-ro, Jeju-si. Address, phone and public transport.'],
  'speakers.html': ['Speakers | JGCF 2026', 'Forum and session speakers of JGCF 2026.'],
  'program.html': ['Program | JGCF 2026', 'Full schedule for Sep 16, 2026: site visit, Rising IR, opening, Global Forum, Main IR and MOU signing.'],
  'partners.html': ['Partners | JGCF 2026', 'Hosts, organizers and partner institutions of JGCF 2026.'],
  'register.html': ['Register | JGCF 2026', 'Register for JGCF 2026 as a company, general participant or student. Instant confirmation with a registration number.'],
  'register-complete.html': ['Registration complete | JGCF 2026', 'Your JGCF 2026 registration is complete.'],
  'privacy.html': ['Privacy Policy | JGCF 2026', 'How the JGCF 2026 secretariat collects, uses and protects personal data.'],
  'copyright.html': ['Copyright Policy | JGCF 2026', 'Copyright terms for content on the JGCF 2026 website.'],
  'legal.html': ['Legal Notice | JGCF 2026', 'Legal notice for the JGCF 2026 website.'],
  'meetup/index.html': ['Business Meetup | JGCF 2026', 'Book a 30-minute 1:1 consultation with one of 20 ACs, VCs and institutions at JGCF 2026.'],
  'meetup/reserve.html': ['Book a Meetup | JGCF 2026', 'Choose an institution and time slot to book your Business Meetup.'],
  'meetup/confirm.html': ['Check / Cancel Booking | JGCF 2026', 'Check or cancel your Business Meetup booking with your booking number and phone number.'],
  'meetup/complete.html': ['Booking complete | JGCF 2026', 'Your Business Meetup booking is complete.']
};

const isExternal = (href) => /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(href);

function rewriteHref(value, depth) {
  if (isExternal(value)) return value;
  if (value.startsWith('/assets/') || value.startsWith('/en/')) return value;
  // 자산
  const assetMatch = value.match(/^(?:\.\.\/|\.\/)*(assets\/.+)$/);
  if (assetMatch) return `/${assetMatch[1]}`;
  // 사이트 루트 절대 경로 (/meetup/reserve 등) → /en/...
  if (value.startsWith('/')) return `/en${value}`;
  // 상대 내부 링크 (reserve, ../about, program#x, register.html)
  let rel = value.replace(/^\.\//, '');
  let dir = depth === 0 ? '' : 'meetup/';
  while (rel.startsWith('../')) { rel = rel.slice(3); dir = ''; }
  rel = rel.replace(/(^|\/)index\.html$/, '').replace(/\.html(?=[#?]|$)/, '');
  const joined = `${dir}${rel}`.replace(/\/$/, '');
  return `/en/${joined}`.replace(/\/$/, '') || '/en';
}

async function build() {
  let count = 0;
  for (const [rel, [title, description]] of Object.entries(PAGES)) {
    const src = await fs.readFile(path.join(root, rel), 'utf8');
    const depth = rel.split('/').length - 1;
    let out = src;

    out = out.replace(/<html lang="ko">/, '<html lang="en">');
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`);
    out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`);
    out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`);
    out = out.replace(/(<meta property="og:locale" content=")[^"]*(")/, '$1en_US$2');

    // href / src / srcset 절대 경로화
    out = out.replace(/\b(href|src)="([^"]*)"/g, (m, attr, value) => {
      if (attr === 'src') {
        const a = value.match(/^(?:\.\.\/|\.\/)*(assets\/.+)$/);
        return a ? `src="/${a[1]}"` : m;
      }
      // 스타일시트·아이콘 등 자산 href
      return `href="${rewriteHref(value, depth)}"`;
    });
    out = out.replace(/\bsrcset="([^"]*)"/g, (m, value) => {
      const fixed = value.split(',').map((part) => part.trim().replace(/^(?:\.\.\/|\.\/)*(assets\/)/, '/$1')).join(', ');
      return `srcset="${fixed}"`;
    });

    // 오버레이를 가장 먼저
    out = out.replace(/(\n\s*)<script src="\/assets\/js\/data\.js" defer><\/script>/, '$1<script src="/assets/js/i18n.en.js" defer></script>$1<script src="/assets/js/data.js" defer></script>');
    if (!out.includes('i18n.en.js')) {
      out = out.replace(/(\n\s*)(<script [^>]*defer><\/script>)/, '$1<script src="/assets/js/i18n.en.js" defer></script>$1$2');
    }

    // 생성 파일임을 표시
    out = out.replace(/<!doctype html>/i, '<!doctype html>\n<!-- 자동 생성: node scripts/build-en.mjs — 한국어 원본을 고친 뒤 다시 실행하세요 -->');

    const dest = path.join(root, 'en', rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, out, 'utf8');
    count += 1;
  }
  console.log(`영문 페이지 ${count}개 생성 (en/)`);
}

await build();
