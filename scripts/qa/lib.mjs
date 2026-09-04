/**
 * QA 공용 모듈 — 브라우저 실행, 결과 수집, 로컬 서버.
 *
 * 로컬 서버는 Vercel cleanUrls 동작을 흉내 낸다(/about → about.html,
 * /meetup → meetup/index.html). python http.server로는 확장자 없는 주소를
 * 열 수 없어 실제 배포와 다른 결과가 나오기 때문이다.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

export function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome을 찾지 못했습니다. CHROME_PATH 환경변수로 경로를 지정하세요.');
  return found;
}

export async function launch() {
  return chromium.launch({ executablePath: findChrome() });
}

/** 결과 수집기. 스위트마다 하나씩 만들어 PASS/FAIL을 모은다. */
export function reporter(suite) {
  const rows = [];
  const api = {
    pass: (name, detail = '') => rows.push({ ok: true, name, detail }),
    fail: (name, detail = '') => rows.push({ ok: false, name, detail }),
    check: (cond, name, detail = '') => (cond ? api.pass(name, detail) : api.fail(name, detail)),
    note: (name, detail = '') => rows.push({ ok: null, name, detail }),
    rows,
    print() {
      const passed = rows.filter((r) => r.ok === true).length;
      const failed = rows.filter((r) => r.ok === false).length;
      console.log(`\n■ ${suite}  —  PASS ${passed} / FAIL ${failed}`);
      for (const r of rows) {
        const tag = r.ok === true ? '  ✓' : r.ok === false ? '  ✗' : '  ·';
        console.log(`${tag} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
      }
      return failed === 0;
    }
  };
  return api;
}

/** 스위트 실행 래퍼: 예외를 FAIL로 기록하고 브라우저를 확실히 닫는다. */
export async function runSuite(suite, fn) {
  const r = reporter(suite);
  const browser = await launch();
  try {
    await fn({ browser, r });
  } catch (error) {
    r.fail(`${suite} 중단`, String(error.message).split('\n')[0]);
  } finally {
    await browser.close();
  }
  return r.print();
}

export function baseUrl() {
  const arg = process.argv.find((a) => a.startsWith('--base='));
  return (arg ? arg.slice(7) : process.env.QA_BASE || 'http://127.0.0.1:4199').replace(/\/$/, '');
}

export function isLive() {
  return !/127\.0\.0\.1|localhost/.test(baseUrl());
}

const MIME = {
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.pdf': 'application/pdf'
};

/** cleanUrls를 흉내 내는 정적 서버. 반환값의 close()로 종료한다. */
export function startStaticServer(port = 4199) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidates = [
      path.join(root, urlPath),
      path.join(root, `${urlPath}.html`),
      path.join(root, urlPath, 'index.html')
    ];
    const file = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file || !file.startsWith(root)) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() }));
  });
}

/** 페이지 컨텍스트 생성 + JS 에러 수집 */
export async function newPage(browser, { width = 1440, height = 900 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return { page, context, errors };
}

export const QA_TAG = '__QA__';
export function stamp() { return Date.now().toString().slice(-8); }
export function qaPhone(s = stamp()) { return `010-${s.slice(0, 4)}-${s.slice(4, 8)}`; }

export const ROUTES = [
  'index.html', 'about.html', 'opening.html', 'speakers.html', 'program.html', 'register.html', 'register-confirm.html', 'register-complete.html',
  'archive.html', 'partners.html', 'venue.html', 'theme.html', 'privacy.html', 'copyright.html', 'legal.html',
  'design-system.html', 'meetup/index.html', 'meetup/reserve.html', 'meetup/confirm.html', 'meetup/complete.html',
  // 영문판 (scripts/build-en.mjs 생성물)
  'en/index.html', 'en/about.html', 'en/opening.html', 'en/speakers.html', 'en/program.html', 'en/register.html', 'en/register-confirm.html', 'en/register-complete.html',
  'en/archive.html', 'en/partners.html', 'en/venue.html', 'en/theme.html', 'en/privacy.html', 'en/copyright.html', 'en/legal.html',
  'en/meetup/index.html', 'en/meetup/reserve.html', 'en/meetup/confirm.html', 'en/meetup/complete.html'
];

export const EN_ROUTES = ROUTES.filter((r) => r.startsWith('en/'));

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

/* ── QA 뒷정리 ───────────────────────────────────────────────────────────
 * QA는 운영 Supabase를 그대로 쓴다. 테스트 예약·참가신청이 남으면 모집 기간에
 * 진짜 신청과 섞이므로, 스위트가 끝나면 스스로 지운다.
 * 지우는 범위는 서버 함수 jgcf_qa_cleanup 이 '__QA__' 표시와 @example.com 으로
 * 한정한다. 첨부는 Storage에 남으므로 여기서 함께 지운다.
 */
export function supabaseConfig() {
  const src = fs.readFileSync(path.join(root, 'assets/js/supabaseConfig.js'), 'utf8');
  return {
    url: src.match(/url:\s*'([^']+)'/)[1],
    key: src.match(/publishableKey:\s*'([^']+)'/)[1],
    bucket: src.match(/attachmentBucket:\s*'([^']+)'/)[1]
  };
}

/** 사무국 자격증명. 환경변수가 우선, 없으면 로컬 기록(tmp/, git 제외)을 쓴다. */
export function adminCredentials() {
  if (process.env.QA_ADMIN_EMAIL && process.env.QA_ADMIN_PASSWORD) {
    return { email: process.env.QA_ADMIN_EMAIL, password: process.env.QA_ADMIN_PASSWORD };
  }
  try {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'tmp/admin-accounts.json'), 'utf8'));
    const found = list.find((a) => a.email && a.password);
    return found ? { email: found.email, password: found.password } : null;
  } catch { return null; }
}

/** 버킷 안의 모든 객체를 (경로, 생성시각)으로 펼쳐 돌려준다. */
async function listAllObjects(url, bucket, headers) {
  const post = (body) => fetch(`${url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers, body: JSON.stringify(body) }).then((x) => x.json());
  const top = await post({ prefix: '', limit: 1000 });
  if (!Array.isArray(top)) return [];
  const out = [];
  for (const entry of top) {
    if (entry.id === null) {
      const inner = await post({ prefix: `${entry.name}/`, limit: 1000 });
      if (Array.isArray(inner)) inner.forEach((f) => out.push({ path: `${entry.name}/${f.name}`, created_at: f.created_at }));
    } else {
      out.push({ path: entry.name, created_at: entry.created_at });
    }
  }
  return out;
}

/**
 * QA 데이터 삭제. since 이후 올라온 '주인 없는 첨부'(중복 차단으로 예약이 만들어지지
 * 않은 경우)까지 지운다. since 이전 파일은 손대지 않는다 — 접수 중인 진짜 첨부를
 * 건드리지 않기 위해서다.
 */
export async function cleanupQa({ since } = {}) {
  const cred = adminCredentials();
  if (!cred) return { skipped: '사무국 자격증명 없음 (QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD)' };

  const { url, key, bucket } = supabaseConfig();
  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.email, password: cred.password })
  }).then((x) => x.json());
  if (!auth.access_token) return { skipped: `사무국 로그인 실패 (${auth.error_description || auth.msg || '원인 불명'})` };

  const H = { apikey: key, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' };
  const rpc = (name) => fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: H, body: '{}' }).then((x) => x.json());

  const result = await rpc('jgcf_qa_cleanup');
  if (!result?.ok) return { skipped: `삭제 함수 거부 (${result?.reason || 'unknown'})` };

  const doomed = new Set(result.paths || []);
  if (since) {
    const [objects, live] = await Promise.all([listAllObjects(url, bucket, H), rpc('jgcf_admin_reservations')]);
    const inUse = new Set((live?.rows || []).map((r) => r.attachment_path).filter(Boolean));
    for (const o of objects) {
      if (!inUse.has(o.path) && o.created_at && new Date(o.created_at) >= new Date(since)) doomed.add(o.path);
    }
  }

  let files = 0;
  if (doomed.size) {
    const del = await fetch(`${url}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: H, body: JSON.stringify({ prefixes: [...doomed] }) });
    const body = await del.json().catch(() => []);
    files = Array.isArray(body) ? body.length : 0;
  }

  // 삭제 응답을 믿지 않고 남은 개수를 다시 확인한다.
  const left = await listAllObjects(url, bucket, H);
  const stillThere = left.filter((o) => doomed.has(o.path)).length;

  return {
    reservations: result.reservations,
    registrations: result.registrations,
    files,
    remaining: (result.remaining_reservations || 0) + (result.remaining_registrations || 0) + stillThere
  };
}
