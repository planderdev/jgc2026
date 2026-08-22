/**
 * 렌더링 스윕 — 전 페이지 × 3뷰포트.
 * JS 에러, 실패 요청, 가로 오버플로우, h1 개수, 메타/OG, 접근성 기본(alt·폼 라벨·중복 id·빈 버튼).
 */
import { baseUrl, newPage, ROUTES, runSuite, VIEWPORTS } from './lib.mjs';

const NO_OG = new Set(['design-system.html', 'admin.html']);

export default () => runSuite('렌더링 스윕', async ({ browser, r }) => {
  const base = baseUrl();
  const problems = { js: [], req: [], overflow: [], h1: [], meta: [], a11y: [] };

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      const { page, context, errors } = await newPage(browser, vp);
      const failed = [];
      page.on('requestfailed', (q) => failed.push(q.url()));
      page.on('response', (q) => { if (q.status() >= 400) failed.push(`${q.status()} ${q.url()}`); });

      await page.goto(`${base}/${route}`, { waitUntil: 'load' });
      await page.waitForTimeout(900);

      const d = await page.evaluate(() => {
        const imgs = [...document.images];
        const fields = [...document.querySelectorAll('input,select,textarea')].filter((f) => f.type !== 'hidden');
        const labelled = (f) => f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`) || f.closest('label') || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          h1: document.querySelectorAll('h1').length,
          desc: !!document.querySelector('meta[name="description"]'),
          og: !!document.querySelector('meta[property="og:image"]'),
          missingAlt: imgs.filter((i) => i.getAttribute('alt') === null).length,
          unlabelled: fields.filter((f) => !labelled(f)).length,
          dupIds: ids.filter((v, i) => ids.indexOf(v) !== i).length,
          emptyButtons: [...document.querySelectorAll('button')].filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length
        };
      });

      const key = `${route}@${vp.name}`;
      if (errors.length) problems.js.push(`${key}: ${errors[0].slice(0, 80)}`);
      if (failed.length) problems.req.push(`${key}: ${failed[0].slice(0, 80)}`);
      if (d.overflow > 1) problems.overflow.push(`${key}: +${d.overflow}px`);
      if (vp.name === 'desktop') {
        if (d.h1 !== 1) problems.h1.push(`${route}: h1 ${d.h1}개`);
        if (!d.desc || (!d.og && !NO_OG.has(route))) problems.meta.push(`${route}: desc=${d.desc} og=${d.og}`);
        if (d.missingAlt || d.unlabelled || d.dupIds || d.emptyButtons) problems.a11y.push(`${route}: alt${d.missingAlt} label${d.unlabelled} dupId${d.dupIds} btn${d.emptyButtons}`);
      }
      await context.close();
    }
  }

  const views = ROUTES.length * VIEWPORTS.length;
  r.check(!problems.js.length, `JS 에러 0건 (${views}뷰)`, problems.js.slice(0, 3).join(' | '));
  r.check(!problems.req.length, '실패 요청 0건', problems.req.slice(0, 3).join(' | '));
  r.check(!problems.overflow.length, '가로 오버플로우 0건', problems.overflow.slice(0, 3).join(' | '));
  r.check(!problems.h1.length, '페이지당 h1 정확히 1개', problems.h1.join(' | '));
  r.check(!problems.meta.length, 'description·OG 완비', problems.meta.join(' | '));
  r.check(!problems.a11y.length, '접근성 기본(alt·라벨·id·버튼) 이상 없음', problems.a11y.join(' | '));
});
