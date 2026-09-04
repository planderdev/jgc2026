/**
 * sitemap.xml 생성. 공개 페이지만 넣고 관리자·내부 문서·완료 화면은 뺀다.
 *   node scripts/build-sitemap.mjs https://jgc2026.vercel.app
 * set-share-urls.mjs 와 같은 base를 넘긴다.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(base)) { console.error('사용법: node scripts/build-sitemap.mjs https://example.com'); process.exit(1); }

// 경로, 우선순위. 홈·신청·예약이 가장 중요하다.
const PAGES = [
  ['', 1.0], ['register', 0.9], ['register-confirm', 0.6], ['meetup', 0.9], ['meetup/reserve', 0.9], ['meetup/confirm', 0.6],
  ['program', 0.8], ['opening', 0.8], ['speakers', 0.8], ['archive', 0.7], ['about', 0.7], ['theme', 0.7], ['venue', 0.7], ['partners', 0.6],
  ['privacy', 0.2], ['copyright', 0.2], ['legal', 0.2]
];
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.flatMap(([p, pr]) => {
  const ko = `${base}/${p}`;
  const en = `${base}/en${p ? `/${p}` : ''}`;
  const alt = `<xhtml:link rel="alternate" hreflang="ko" href="${ko}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/>`;
  return [
    `  <url><loc>${ko}</loc><lastmod>${today}</lastmod><priority>${pr.toFixed(1)}</priority>${alt}</url>`,
    `  <url><loc>${en}</loc><lastmod>${today}</lastmod><priority>${Math.max(0.1, pr - 0.1).toFixed(1)}</priority>${alt}</url>`
  ];
}).join('\n')}
</urlset>
`;
await fs.writeFile(path.join(root, 'sitemap.xml'), xml);
const robots = path.join(root, 'robots.txt');
const r = await fs.readFile(robots, 'utf8');
await fs.writeFile(robots, r.replace(/Sitemap: .*/, `Sitemap: ${base}/sitemap.xml`));
console.log(`sitemap.xml ${PAGES.length * 2}개 URL(ko+en), robots.txt 갱신 (${base})`);
