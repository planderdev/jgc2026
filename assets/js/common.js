(function () {
  const aboutLinks = [
    { label: '2026 주제', href: 'theme.html', key: 'theme' },
    { label: 'JGCF 소개', href: 'about.html', key: 'about' },
    { label: '운영 목적', href: 'about.html#history', key: 'history' },
    { label: '행사 장소', href: 'venue.html', key: 'venue' }
  ];

  const nav = [
    { label: 'About', href: 'theme.html', key: 'aboutGroup', children: aboutLinks },
    { label: 'Speakers', href: 'speakers.html', key: 'speakers' },
    { label: 'Program', href: 'program.html', key: 'program' },
    { label: 'Registration', href: 'register.html', key: 'registration', hot: true },
    { label: 'Business Meetup', href: 'meetup/index.html', key: 'meetup' },
    { label: 'Partners', href: 'partners.html', key: 'partners' },
    { label: 'FAQ', href: 'faq.html', key: 'faq' }
  ];

  const base = window.location.pathname.replace(/\\/g, '/').includes('/meetup/') ? '../' : '';
  const page = document.body.dataset.page || '';

  function link(path) {
    if (!path || path.startsWith('http') || path.startsWith('#')) return path;
    return base + path;
  }

  function asset(path) {
    if (!path || path.startsWith('http') || path.startsWith('/')) return path;
    return base + path;
  }

  function isActive(item) {
    if (item.key === page) return true;
    if (item.key === 'aboutGroup') return ['theme', 'about', 'venue', 'history'].includes(page);
    if (item.key === 'meetup') return page.startsWith('meetup');
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
          <a class="brand" href="${link('index.html')}" aria-label="JGCF home">
            <span class="brand-mark">JG</span>
            <span class="brand-text">
              <span>JGCF 2026</span>
              <span>JEJU GLOBAL CONTENT FORUM</span>
            </span>
          </a>
          <nav class="desktop-nav" aria-label="Primary navigation">
            <div class="nav-menu">${desktopNav}</div>
          </nav>
          <div class="header-actions">
            <div class="language-switch" aria-label="Language">
              <a href="#" aria-current="true">KR</a>
              <span>|</span>
              <a href="#">EN</a>
            </div>
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
                <a href="${link('faq.html')}">개인정보처리방침</a>
                <a href="${link('faq.html')}">저작권 보호방침</a>
                <a href="${link('faq.html')}">법적고지</a>
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
            <div class="footer-socials" aria-label="Social links">
              <a href="#" aria-label="JGCF YouTube"><i class="ri-youtube-fill" aria-hidden="true"></i></a>
              <a href="#" aria-label="JGCF Instagram"><i class="ri-instagram-line" aria-hidden="true"></i></a>
              <a href="#" aria-label="JGCF Blog"><i class="ri-blogger-line" aria-hidden="true"></i></a>
            </div>
            <details class="footer-family">
              <summary>패밀리 사이트 <i class="ri-arrow-down-s-line" aria-hidden="true"></i></summary>
              <div class="footer-family-menu">
                <a href="${link('register.html')}">Registration</a>
                <a href="${link('meetup/reserve.html')}">Business Meetup</a>
                <a href="${link('program.html')}">Program</a>
                <a href="${link('partners.html')}">Partners</a>
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

    const close = () => {
      header.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };

    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.documentElement.classList.toggle('no-scroll', isOpen);
      document.body.classList.toggle('no-scroll', isOpen);
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
      anchor.addEventListener('click', close);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
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
