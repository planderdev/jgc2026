(function () {
  const aboutLinks = [
    { label: '2026 주제', href: 'theme.html', key: 'theme' },
    { label: 'JGCF 소개', href: 'about.html', key: 'about' },
    { label: '운영 목적', href: 'about.html#history', key: 'history' },
    { label: '행사 장소', href: 'venue.html', key: 'venue' }
  ];

  const meetupLinks = [
    { label: '밋업 안내', href: 'meetup/index.html', key: 'meetup' },
    { label: '밋업 예약', href: 'meetup/reserve.html', key: 'meetupReserve' },
    { label: '예약 조회·취소', href: 'meetup/confirm.html', key: 'meetupConfirm' }
  ];

  const nav = [
    { label: 'About', href: 'theme.html', key: 'aboutGroup', children: aboutLinks },
    { label: 'Speakers', href: 'speakers.html', key: 'speakers' },
    { label: 'Program', href: 'program.html', key: 'program' },
    { label: 'Registration', href: 'register.html', key: 'registration' },
    { label: 'Business Meetup', href: 'meetup/index.html', key: 'meetup', children: meetupLinks },
    { label: 'Partners', href: 'partners.html', key: 'partners' },
    { label: 'FAQ', href: 'faq.html', key: 'faq' }
  ];

  // 실제 계정이 열리면 URL을 채우세요. 비어 있으면 아이콘을 렌더링하지 않습니다.
  // 링크가 '#'으로 남아 클릭해도 아무 일이 없는 상태를 만들지 않기 위한 장치입니다.
  const socialLinks = [
    { label: 'JGCF YouTube', icon: 'ri-youtube-fill', href: '' },
    { label: 'JGCF Instagram', icon: 'ri-instagram-line', href: '' },
    { label: 'JGCF Blog', icon: 'ri-blogger-line', href: '' }
  ];

  // 영문 사이트가 준비되면 href를 채우고 enabled를 true로 바꾸세요.
  const englishSite = { enabled: false, href: '' };

  const base = window.location.pathname.replace(/\\/g, '/').includes('/meetup/') ? '../' : '';
  const page = document.body.dataset.page || '';

  function link(path) {
    if (!path || path.startsWith('http') || path.startsWith('#')) return path;
    // Vercel cleanUrls에 맞춰 확장자 없는 주소로 통일한다.
    // 'index.html' -> './', 'meetup/index.html' -> 'meetup', 'about.html#x' -> 'about#x'
    let clean = path
      .replace(/(^|\/)index\.html(?=[#?]|$)/, (m, p1) => (p1 === '/' ? '' : './'))
      .replace(/\.html(?=[#?]|$)/, '');
    if (clean === './') return base || './';
    return base + clean;
  }

  function asset(path) {
    if (!path || path.startsWith('http') || path.startsWith('/')) return path;
    return base + path;
  }

  function isActive(item) {
    if (item.key === page) return true;
    if (item.key === 'aboutGroup') return ['theme', 'about', 'venue', 'history'].includes(page);
    if (item.key === 'meetup') return page.startsWith('meetup');
    if (item.children) return item.children.some((child) => child.key === page);
    return false;
  }

  function renderHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;

    const desktopNav = nav.map((item) => {
      const active = isActive(item) ? ' is-active' : '';
      const hot = item.hot ? ' hot' : '';
      const children = item.children ? `
        <div class="layer-menu" aria-label="${item.label} submenu">
          <ul>
            ${item.children.map((child) => `<li><a href="${link(child.href)}">${child.label}</a></li>`).join('')}
          </ul>
        </div>
      ` : '';
      return `
        <div class="nav-item${active}">
          <a class="nav-pill${hot}" href="${link(item.href)}">${item.label}${item.children ? '<i class="ri-arrow-down-s-line" aria-hidden="true"></i>' : ''}</a>
          ${children}
        </div>
      `;
    }).join('');

    const mobileNav = nav.map((item) => {
      if (item.children) {
        return `
          <div class="mobile-nav-group">
            <button class="mobile-sub-toggle" type="button" aria-expanded="false">
              ${item.label}
              <i class="ri-add-line" aria-hidden="true"></i>
            </button>
            <div class="mobile-submenu">
              ${item.children.map((child) => `<a href="${link(child.href)}">${child.label}</a>`).join('')}
            </div>
          </div>
        `;
      }
      return `<a href="${link(item.href)}">${item.label}</a>`;
    }).join('');

    mount.innerHTML = `
      <header class="site-header ${page === 'home' ? 'is-home' : ''}" data-header>
        <div class="header-inner">
          <div class="header-slot">
          <a class="brand" href="${link('index.html')}" aria-label="JGCF home">
            <span class="brand-mark">JG</span>
            <span class="brand-text">
              <span>JGCF 2026</span>
              <span>JEJU GLOBAL CONTENT FORUM</span>
            </span>
          </a>
          </div>
          <nav class="desktop-nav" aria-label="Primary navigation">
            <div class="nav-menu">${desktopNav}</div>
          </nav>
          <div class="header-actions">
            ${englishSite.enabled && englishSite.href ? `
            <div class="language-switch" aria-label="Language">
              <span aria-current="true">KR</span>
              <span>|</span>
              <a href="${englishSite.href}">EN</a>
            </div>
            ` : ''}
            <a class="header-cta" href="${link('register.html')}">
              <i class="ri-edit-box-line" aria-hidden="true"></i>
              참가 신청
            </a>
            <button class="menu-toggle" type="button" aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
        <div class="mobile-menu" id="mobile-menu">
          <div class="mobile-menu-inner">
            <nav class="mobile-nav" aria-label="Mobile navigation">${mobileNav}</nav>
            <div class="mobile-menu-bottom">
              <p>JGCF 2026 참가 신청과 비즈니스 밋업 예약을 확인하세요.</p>
              <a class="ui-button" href="${link('register.html')}">Registration</a>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    const mount = document.getElementById('site-footer');
    if (!mount) return;

    const socials = socialLinks
      .filter((item) => item.href)
      .map((item) => `<a href="${item.href}" target="_blank" rel="noopener" aria-label="${item.label}"><i class="${item.icon}" aria-hidden="true"></i></a>`)
      .join('');

    mount.innerHTML = `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-content">
            <div class="footer-main">
              <div class="footer-brand">
                <span class="footer-wordmark">JGCF<span>!</span></span>
                <span>
                  <strong>JGCF 2026</strong>
                  <small>JEJU GLOBAL CONTENT FORUM & BUSINESS NETWORKING</small>
                </span>
              </div>
              <nav class="footer-policy" aria-label="Footer policy">
                <a href="${link('privacy.html')}">개인정보처리방침</a>
                <a href="${link('copyright.html')}">저작권 보호방침</a>
                <a href="${link('legal.html')}">법적고지</a>
              </nav>
              <address class="footer-info">
                <span>제주글로벌콘텐츠포럼 및 비즈니스 네트워킹 운영사무국</span>
                <span>제주콘텐츠진흥원 일원(BeIN 공연장 및 로비)</span>
                <span>2026. 9. 16. Wed 10:00-18:00</span>
              </address>
              <p class="copyright">Copyright © 2026 JGCF. All rights reserved.</p>
            </div>

            <p class="footer-partner-note">
              <span class="footer-note-mark">JG</span>
              CONNECT JEJU, CREATE GLOBAL
            </p>
          </div>
          <div class="footer-actions">
            ${socials ? `<div class="footer-socials" aria-label="Social links">${socials}</div>` : ''}
            <details class="footer-family">
              <summary>바로가기 <i class="ri-arrow-down-s-line" aria-hidden="true"></i></summary>
              <div class="footer-family-menu">
                <a href="${link('register.html')}">행사 참가신청</a>
                <a href="${link('meetup/reserve.html')}">밋업 예약</a>
                <a href="${link('meetup/confirm.html')}">예약 조회·취소</a>
                <a href="${link('program.html')}">프로그램</a>
                <a href="${link('partners.html')}">파트너</a>
              </div>
            </details>
          </div>
        </div>
      </footer>
    `;
  }

  function setHeaderState() {
    const header = document.querySelector('[data-header]');
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 5);
  }

  function initMobileMenu() {
    const header = document.querySelector('[data-header]');
    const toggle = document.querySelector('.menu-toggle');
    if (!header || !toggle) return;

    const setOpen = (isOpen) => {
      header.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.documentElement.classList.toggle('no-scroll', isOpen);
      document.body.classList.toggle('no-scroll', isOpen);
    };

    const close = (restoreFocus) => {
      if (!header.classList.contains('is-open')) return;
      setOpen(false);
      if (restoreFocus === true) toggle.focus();
    };

    toggle.addEventListener('click', () => {
      const isOpen = !header.classList.contains('is-open');
      setOpen(isOpen);
      if (isOpen) header.querySelector('.mobile-menu a, .mobile-menu button')?.focus();
    });

    document.querySelectorAll('.mobile-sub-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.nextElementSibling;
        const open = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        const icon = button.querySelector('i');
        if (icon) icon.className = open ? 'ri-subtract-line' : 'ri-add-line';
      });
    });

    document.querySelectorAll('.mobile-menu a').forEach((anchor) => {
      anchor.addEventListener('click', () => close());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(true);
    });
  }

  function initAccordions(scope) {
    const root = scope || document;
    const accordions = [
      ...(root.matches && root.matches('.js-accordion') ? [root] : []),
      ...root.querySelectorAll('.js-accordion')
    ];
    accordions.forEach((accordion) => {
      const items = Array.from(accordion.querySelectorAll('.faq-item'));
      items.forEach((item) => {
        const button = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!button || !answer || button.dataset.ready) return;
        const id = answer.id || `faq-${Math.random().toString(36).slice(2)}`;
        answer.id = id;
        button.dataset.ready = 'true';
        button.setAttribute('aria-controls', id);
        button.setAttribute('aria-expanded', String(item.classList.contains('is-open')));
        button.addEventListener('click', () => {
          const willOpen = !item.classList.contains('is-open');
          items.forEach((other) => {
            other.classList.remove('is-open');
            const otherButton = other.querySelector('.faq-question');
            if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
          });
          item.classList.toggle('is-open', willOpen);
          button.setAttribute('aria-expanded', String(willOpen));
        });
      });
    });
  }

  function toast(message) {
    let node = document.querySelector('.toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'toast';
      node.setAttribute('role', 'status');
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add('is-open');
    window.clearTimeout(node._timer);
    node._timer = window.setTimeout(() => node.classList.remove('is-open'), 2800);
  }

  window.JGCFCommon = {
    base,
    link,
    asset,
    toast,
    initAccordions,
    setHeaderState
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    setHeaderState();
    initMobileMenu();
    initAccordions();
    window.addEventListener('scroll', setHeaderState, { passive: true });
  });
})();
