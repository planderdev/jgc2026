/**
 * 가이드 문서 생성기 — docs-src/*.md → docs/**.html
 *
 *   node scripts/build-docs.mjs
 *
 * 원고는 docs-src/ 의 마크다운이고, 순서·묶음은 docs-src/nav.json 이 정한다.
 * 각 .md 맨 위 frontmatter: title(필수), description, group(사이드바 그룹 키).
 * 본문 확장 문법:
 *   :::info 제목 / :::warn 제목 / :::good 제목  ...  :::   → 콜아웃
 *   1. **단계 제목** — 설명                                   → 번호 단계 카드(일반 ol을 .steps로)
 * 검색 색인(docs/search.json)은 제목·소제목·본문 텍스트로 만든다.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs-src');
const OUT = path.join(root, 'docs');
const SITE = 'JGCF 2026';
const GUIDE = 'JGCF 2026 가이드';

const nav = JSON.parse(await fs.readFile(path.join(SRC, 'nav.json'), 'utf8'));

function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (m) {
    m[1].split(/\r?\n/).forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    });
  }
  return { meta, body: m ? md.slice(m[0].length) : md };
}

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 콜아웃 ::: 블록을 HTML로 바꾼 뒤 marked에 넘긴다.
function preprocess(md) {
  return md.replace(/^:::(info|warn|good)\s*(.*)\n([\s\S]*?)^:::\s*$/gm, (m, kind, title, body) => {
    const inner = marked.parse(body.trim());
    return `<div class="callout ${kind}">${title ? `<p class="callout-title">${esc(title)}</p>` : ''}${inner}</div>\n`;
  });
}

function render(md) {
  const headings = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ text, depth, tokens }) {
    const html = this.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2 || depth === 3) headings.push({ id, text: text.replace(/<[^>]+>/g, ''), depth });
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${html}</h${depth}>\n`;
  };
  renderer.table = function (token) {
    const header = `<tr>${token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('')}</tr>`;
    const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${rows}</tbody></table></div>\n`;
  };
  renderer.list = function (token) {
    const body = token.items.map((item) => `<li>${this.parser.parse(item.tokens)}</li>`).join('');
    if (token.ordered) {
      const stepped = token.items.every((it) => /^\s*\*\*/.test(it.text));
      const cleaned = stepped ? body.replace(/<\/strong>\s*[—–-]\s*/g, '</strong>') : body;
      return `<ol class="${stepped ? 'steps' : ''}"${token.start && token.start !== 1 ? ` start="${token.start}"` : ''}>${cleaned}</ol>\n`;
    }
    return `<ul>${body}</ul>\n`;
  };
  const html = marked.parse(preprocess(md), { renderer, gfm: true });
  return { html, headings };
}

// 페이지 목록 (nav 순서대로)
const pages = [];
for (const group of nav) {
  for (const item of group.items) pages.push({ ...item, group });
}

function pageHref(p) { return `/docs/${p.path}`.replace(/\/index$/, '').replace(/\/$/, '') || '/docs'; }

function sidebar(current) {
  return nav.map((group) => {
    const items = group.items.map((item) => {
      const href = pageHref(item);
      const active = item.path === current.path ? ' aria-current="page"' : '';
      return `<li><a href="${href}"${active}>${esc(item.title)}</a></li>`;
    }).join('');
    if (!group.label) return `<ul class="nav-flat">${items}</ul>`;
    const open = group.items.some((i) => i.path === current.path);
    return `<details class="nav-group"${open ? ' open' : ''}><summary>${esc(group.label)}<i></i></summary><ul>${items}</ul></details>`;
  }).join('');
}

function prevNext(idx) {
  const prev = pages[idx - 1]; const next = pages[idx + 1];
  return `<nav class="pager">
    ${prev ? `<a class="prev" href="${pageHref(prev)}"><small>이전</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="next" href="${pageHref(next)}"><small>다음</small><span>${esc(next.title)}</span></a>` : '<span></span>'}
  </nav>`;
}

function shell({ page, idx, meta, html, headings }) {
  const toc = headings.length ? `<aside class="toc"><p>On this page</p><ul>${headings.map((h) => `<li class="d${h.depth}"><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ul></aside>` : '';
  const crumb = page.group.label ? `<p class="crumb">${esc(page.group.label)}</p>` : '';
  return `<!doctype html>
<!-- 자동 생성: node scripts/build-docs.mjs — 원고는 docs-src/${page.path}.md -->
<html lang="ko" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(meta.title)} · ${GUIDE}</title>
  <meta name="description" content="${esc(meta.description || '')}">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">
  <link rel="stylesheet" href="/docs/assets/docs.css">
  <script>try{const t=localStorage.getItem('jgcf-docs-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
</head>
<body>
<a class="skip" href="#content">본문으로</a>
<div class="layout">
  <aside class="side" id="side">
    <div class="side-head">
      <a class="brand" href="/docs"><span class="mark">JG</span><span><strong>${SITE}</strong><small>OPERATIONS GUIDE</small></span></a>
      <button class="side-toggle" type="button" aria-label="메뉴 닫기" data-side-close>×</button>
    </div>
    <button class="search-btn" type="button" data-search-open><span>검색</span><kbd>⌘K</kbd></button>
    <a class="side-link" href="/" target="_blank" rel="noopener">↗ 사이트 열기</a>
    <a class="side-link" href="/admin" target="_blank" rel="noopener">↗ 관리자 화면 열기</a>
    <nav class="side-nav" aria-label="문서">${sidebar(page)}</nav>
    <div class="side-foot">
      <button type="button" class="theme" data-theme-toggle aria-label="테마 전환"><span class="sun">☀</span><span class="moon">☾</span></button>
      <small>${esc(meta.updated || '')}</small>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <button type="button" class="menu-btn" data-side-open aria-label="메뉴 열기">☰</button>
      <span>${esc(meta.title)}</span>
      <button type="button" class="search-btn small" data-search-open aria-label="검색">⌕</button>
    </header>
    <div class="content-wrap">
      <main id="content" class="content">
        ${crumb}
        <h1>${esc(meta.title)}</h1>
        ${meta.description ? `<p class="lede">${esc(meta.description)}</p>` : ''}
        ${html}
        ${prevNext(idx)}
      </main>
      ${toc}
    </div>
  </div>
</div>
<div class="search" data-search hidden>
  <div class="search-box" role="dialog" aria-label="문서 검색">
    <input type="search" placeholder="검색어를 입력하세요 (예: 출석, 비밀번호, 취소)" data-search-input autocomplete="off">
    <ul data-search-results></ul>
    <p class="search-hint">Esc 닫기 · ↑↓ 이동 · Enter 열기</p>
  </div>
</div>
<script src="/docs/assets/docs.js" defer></script>
</body>
</html>
`;
}

await fs.mkdir(path.join(OUT, 'assets'), { recursive: true });
const searchIndex = [];
let count = 0;
for (const [idx, page] of pages.entries()) {
  const md = (await fs.readFile(path.join(SRC, `${page.path}.md`), 'utf8')).replace(/\r\n?/g, '\n');
  const { meta, body } = frontmatter(md);
  if (!meta.title) meta.title = page.title;
  const { html, headings } = render(body);
  const out = shell({ page, idx, meta, html, headings });
  const dest = path.join(OUT, `${page.path}.html`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, out, 'utf8');
  // 검색 색인: 섹션별
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  searchIndex.push({ href: pageHref(page), title: meta.title, group: page.group.label || '', text: plain.slice(0, 4000), headings: headings.map((h) => ({ id: h.id, text: h.text })) });
  count += 1;
}
await fs.writeFile(path.join(OUT, 'search.json'), JSON.stringify(searchIndex), 'utf8');
// 예전 매뉴얼 주소 → 가이드
await fs.writeFile(path.join(OUT, 'ops-manual.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/docs"><title>JGCF 2026 가이드</title></head><body><a href="/docs">가이드로 이동</a></body></html>\n`);
console.log(`가이드 ${count}페이지 생성 (docs/)`);
