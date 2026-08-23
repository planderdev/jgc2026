/* 가이드 사이트: 테마, 모바일 사이드바, 검색, 현재 위치 표시 */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // 테마
  $('[data-theme-toggle]')?.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('jgcf-docs-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  });

  // 모바일 사이드바
  const side = $('#side');
  $$('[data-side-open]').forEach((b) => b.addEventListener('click', () => side.classList.add('is-open')));
  $$('[data-side-close]').forEach((b) => b.addEventListener('click', () => side.classList.remove('is-open')));
  document.addEventListener('click', (e) => { if (side.classList.contains('is-open') && !side.contains(e.target) && !e.target.closest('[data-side-open]')) side.classList.remove('is-open'); });

  // TOC 현재 위치
  const tocLinks = $$('.toc a');
  if (tocLinks.length) {
    const targets = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { tocLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`)); } });
    }, { rootMargin: '-60px 0px -70% 0px', threshold: 0 });
    targets.forEach((t) => io.observe(t));
  }

  // 검색
  const modal = $('[data-search]');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  let index = null; let active = -1;
  const open = async () => {
    modal.hidden = false; input.value = ''; results.innerHTML = ''; active = -1; input.focus();
    if (!index) { try { index = await (await fetch('/docs/search.json')).json(); } catch (e) { index = []; } }
  };
  const close = () => { modal.hidden = true; };
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); modal.hidden ? open() : close(); }
    if (e.key === 'Escape' && !modal.hidden) close();
    if (!modal.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const items = $$('a', results); if (!items.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('is-active', i === active)); items[active].scrollIntoView({ block: 'nearest' });
    }
    if (!modal.hidden && e.key === 'Enter') { const a = $$('a', results)[Math.max(0, active)]; if (a) window.location.href = a.href; }
  });
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mark = (text, q) => esc(text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
  input?.addEventListener('input', () => {
    const q = input.value.trim(); active = -1;
    if (!q || !index) { results.innerHTML = ''; return; }
    const ql = q.toLowerCase();
    const hits = [];
    for (const page of index) {
      if (page.title.toLowerCase().includes(ql)) hits.push({ href: page.href, title: page.title, sub: page.group, score: 3 });
      page.headings.forEach((h) => { if (h.text.toLowerCase().includes(ql)) hits.push({ href: `${page.href}#${h.id}`, title: h.text, sub: `${page.group ? page.group + ' · ' : ''}${page.title}`, score: 2 }); });
      const i = page.text.toLowerCase().indexOf(ql);
      if (i >= 0) hits.push({ href: page.href, title: page.title, sub: `…${page.text.slice(Math.max(0, i - 40), i + 60)}…`, score: 1, snippet: true });
    }
    const seen = new Set();
    const top = hits.sort((a, b) => b.score - a.score).filter((h) => !seen.has(h.href) && seen.add(h.href)).slice(0, 12);
    results.innerHTML = top.length
      ? top.map((h) => `<li><a href="${h.href}">${mark(h.title, q)}<small>${h.snippet ? mark(h.sub, q) : esc(h.sub)}</small></a></li>`).join('')
      : '<li class="search-empty">검색 결과가 없습니다.</li>';
  });
})();
