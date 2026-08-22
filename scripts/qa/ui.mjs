/**
 * UI 회귀 — 과거에 실제로 깨졌던 지점들.
 * clean URL, 헤더 중앙정렬, GNB 활성 상태, About 드롭다운 클릭, 모바일 메뉴 접근성,
 * 홈 섹션 순서, 연사 카드 크기, 푸터 배치, /meetup 상대 링크.
 */
import { baseUrl, newPage, runSuite } from './lib.mjs';

export default () => runSuite('UI 회귀', async ({ browser, r }) => {
  const base = baseUrl();
  const { page, context } = await newPage(browser);

  // clean URL: 내부 링크에 .html 없음
  await page.goto(`${base}/`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && !/^(https?:|#|tel:|mailto:)/.test(h)));
  r.check(!hrefs.some((h) => h.includes('.html')), '내부 링크에 .html 없음', `${hrefs.length}개 검사`);

  // 헤더 메뉴 중앙정렬
  const off = await page.evaluate(() => { const h = document.querySelector('.header-inner').getBoundingClientRect(); const n = document.querySelector('.nav-menu').getBoundingClientRect(); return Math.round((n.left + n.width / 2) - (h.left + h.width / 2)); });
  r.check(Math.abs(off) <= 1, '헤더 메뉴 정중앙', `어긋남 ${off}px`);

  // 홈 섹션 순서
  const order = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.className.split(' ')[0].replace('home-', '')).join(' → '));
  r.check(order === 'hero → speakers → events → special → partners → faq → location', '홈 섹션 순서', order);

  // 연사 카드: 확정 연사만, 이벤트 카드보다 작게
  const sp = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.home-speakers .home-event-title')].map((e) => e.textContent.trim()),
    speaker: Math.round(document.querySelector('.home-speaker-card')?.getBoundingClientRect().width || 0),
    event: Math.round(document.querySelector('.home-event-card:not(.home-speaker-card)')?.getBoundingClientRect().width || 0)
  }));
  r.check(sp.names.length > 0 && !sp.names.some((n) => /섭외 중/.test(n)), '홈 연사: 섭외 중 카드 제외', `${sp.names.length}명`);
  r.check(sp.speaker > 0 && sp.speaker < sp.event, '홈 연사 카드가 이벤트 카드보다 작음', `${sp.speaker} < ${sp.event}`);

  // GNB 활성: 홈 없음, speakers 페이지는 Speakers
  const activeHome = await page.evaluate(() => [...document.querySelectorAll('.nav-item.is-active .nav-pill')].map((e) => e.textContent.trim()));
  r.check(activeHome.length === 0, '홈에서 활성 메뉴 없음', activeHome.join(','));
  await page.goto(`${base}/speakers`, { waitUntil: 'load' }); await page.waitForTimeout(600);
  const activeSp = await page.evaluate(() => [...document.querySelectorAll('.nav-item.is-active .nav-pill')].map((e) => e.textContent.trim()));
  r.check(activeSp.join() === 'Speakers', 'speakers 페이지 활성 메뉴', activeSp.join(','));

  // About 드롭다운: hover 중에도 About 자체가 클릭됨 (과거 layer-menu가 가로채던 결함)
  await page.goto(`${base}/`, { waitUntil: 'load' }); await page.waitForTimeout(900);
  const pill = page.locator('.nav-item .nav-pill').first(); const b = await pill.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(400);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(900);
  r.check(/\/theme$/.test(page.url()), 'About 메뉴 클릭 이동', new URL(page.url()).pathname);

  // 푸터: 정책 링크가 바로가기 아래 우측
  const ft = await page.evaluate(() => { const p = document.querySelector('.footer-policy').getBoundingClientRect(); const f = document.querySelector('.footer-family').getBoundingClientRect(); return { below: p.top >= f.bottom - 1, right: Math.abs(p.right - f.right) < 2 }; });
  r.check(ft.below && ft.right, '푸터 정책 링크 위치(바로가기 아래 우측)');

  // /meetup(슬래시 없음)에서 상대 링크가 깨지지 않음
  await page.goto(`${base}/meetup`, { waitUntil: 'load' }); await page.waitForTimeout(700);
  const meetHrefs = await page.evaluate(() => [...document.querySelectorAll('.meetup-hero-actions a')].map((a) => a.href));
  r.check(meetHrefs.every((h) => /\/meetup\/(reserve|confirm)$/.test(h)), '/meetup 히어로 링크 절대 경로', meetHrefs.map((h) => new URL(h).pathname).join(', '));
  await context.close();

  // 모바일: 닫힌 메뉴가 Tab에 노출되지 않음
  const m = await newPage(browser, { width: 390, height: 844 });
  await m.page.goto(`${base}/`, { waitUntil: 'load' }); await m.page.waitForTimeout(900);
  let leaked = 0;
  for (let i = 0; i < 12; i++) { await m.page.keyboard.press('Tab'); if (await m.page.evaluate(() => !!document.activeElement.closest('.mobile-menu'))) leaked++; }
  r.check(leaked === 0, '모바일 닫힌 메뉴 키보드 비노출', `유출 ${leaked}건`);
  await m.page.click('.menu-toggle'); await m.page.waitForTimeout(600);
  r.check(await m.page.evaluate(() => getComputedStyle(document.querySelector('.mobile-menu')).visibility === 'visible'), '모바일 메뉴 열림');
  await m.context.close();
});
