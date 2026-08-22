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
  'index.html', 'about.html', 'speakers.html', 'program.html', 'register.html', 'register-complete.html',
  'partners.html', 'venue.html', 'faq.html', 'theme.html', 'privacy.html', 'copyright.html', 'legal.html',
  'design-system.html', 'meetup/index.html', 'meetup/reserve.html', 'meetup/confirm.html', 'meetup/complete.html'
];

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];
