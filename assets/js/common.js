(function () {
  const aboutLinks = [
    { label: '2026 주제', href: 'theme.html', key: 'theme' },
    { label: 'JGCF 소개', href: 'about.html', key: 'about' },
    { label: '행사 장소', href: 'venue.html', key: 'venue' }
  ];

  const meetupLinks = [
    { label: '밋업 안내', href: 'meetup/index.html', key: 'meetup' },
    { label: '밋업 예약', href: 'meetup/reserve.html', key: 'meetupReserve' },
    { label: '예약 조회·취소', href: 'meetup/confirm.html', key: 'meetupConfirm' }
  ];

  const nav = [
    { label: 'About', href: 'theme.html', key: 'aboutGroup', children: aboutLinks },
    { label: 'Opening', href: 'opening.html', key: 'opening' },
    { label: 'Speakers', href: 'speakers.html', key: 'speakers' },
    { label: 'Program', href: 'program.html', key: 'program' },
    { label: 'Archive', href: 'archive.html', key: 'archive' },
    { label: 'Business Meetup', href: 'meetup/index.html', key: 'meetup' },
    { label: 'Partners', href: 'partners.html', key: 'partners' }
  ];

  // 실제 계정이 열리면 URL을 채우세요. 비어 있으면 아이콘을 렌더링하지 않습니다.
  // 링크가 '#'으로 남아 클릭해도 아무 일이 없는 상태를 만들지 않기 위한 장치입니다.
  // 제주콘텐츠진흥원 공식 채널(ofjeju.kr 기준). 행사 전용 계정이 생기면 바꾸세요.
  const socialLinks = [
    { label: '제주콘텐츠진흥원 YouTube', icon: 'ri-youtube-fill', href: 'https://www.youtube.com/@제주콘텐츠진흥원' },
    { label: '제주콘텐츠진흥원 Instagram', icon: 'ri-instagram-line', href: 'https://www.instagram.com/ofjeju.kr/' },
    { label: '제주콘텐츠진흥원 Facebook', icon: 'ri-facebook-fill', href: 'https://www.facebook.com/JejuContentsAgency/' }
  ];

  // 언어: <html lang="en"> 이면 영문판. 영문 페이지는 /en/ 아래에 있고 같은 JS를 쓴다.
  const LANG = document.documentElement.lang === 'en' ? 'en' : 'ko';
  const LANG_PREFIX = LANG === 'en' ? 'en/' : '';
  const page = document.body.dataset.page || '';

  /**
   * 내부 링크는 항상 사이트 루트 기준 절대 경로로 만든다.
   * cleanUrls 환경에서 /meetup(디렉터리 index)과 /en/... 처럼 깊이가 다른 페이지가
   * 섞여 있어 상대 경로는 깨지기 쉽다. 'index.html' -> '/', 'meetup/index.html' -> '/meetup'.
   */
  function link(path) {
    if (!path || path.startsWith('http') || path.startsWith('#') || path.startsWith('/')) return path;
    const clean = path
      .replace(/(^|\/)index\.html(?=[#?]|$)/, '$1')
      .replace(/\.html(?=[#?]|$)/, '')
      .replace(/\/$/, '');
    const out = `/${LANG_PREFIX}${clean}`.replace(/\/+$/, '');
    return out || '/';
  }

  function asset(path) {
    if (!path || path.startsWith('http') || path.startsWith('/') || path.startsWith('data:')) return path;
    return `/${path}`;
  }

  /** 같은 페이지의 다른 언어 주소. /en/about <-> /about */
  function altLangHref() {
    const here = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (LANG === 'en') return here.replace(/^\/en(?=\/|$)/, '') || '/';
    return here === '/' ? '/en/' : `/en${here}`;
  }

  function isActive(item) {
    if (item.key === page) return true;
    if (item.key === 'aboutGroup') return ['theme', 'about', 'venue'].includes(page);
    if (item.key === 'meetup') return page.startsWith('meetup');
    if (item.children) return item.children.some((child) => child.key === page);
    return false;
  }

  function renderHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;

    const desktopNav = nav.map((item) => {
      const active = isActive(item) ? ' is-active' : '';
      const children = item.children ? `
        <div class="layer-menu" aria-label="${item.label} submenu">
          <ul>
            ${item.children.map((child) => `<li><a href="${link(child.href)}">${child.label}</a></li>`).join('')}
          </ul>
        </div>
      ` : '';
      return `
        <div class="nav-item${active}">
          <a class="nav-pill" href="${link(item.href)}">${item.label}${item.children ? '<i class="ri-arrow-down-s-line" aria-hidden="true"></i>' : ''}</a>
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
            <div class="language-switch" aria-label="Language">
              ${LANG === 'en'
                ? `<a href="${altLangHref()}" hreflang="ko" lang="ko">KR</a><span>|</span><span aria-current="true">EN</span>`
                : `<span aria-current="true">KR</span><span>|</span><a href="${altLangHref()}" hreflang="en" lang="en">EN</a>`}
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
              <div class="language-switch mobile-language-switch" aria-label="Language" data-no-i18n>
                ${LANG === 'en'
                  ? `<a href="${altLangHref()}" hreflang="ko" lang="ko">한국어</a><span>|</span><span aria-current="true">English</span>`
                  : `<span aria-current="true">한국어</span><span>|</span><a href="${altLangHref()}" hreflang="en" lang="en">English</a>`}
              </div>
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
              <address class="footer-info">
                <span>제주글로벌콘텐츠포럼 및 비즈니스 네트워킹 운영사무국</span>
                <span>제주특별자치도 제주시 신산로 82 제주콘텐츠진흥원 내 1층 Be IN; (비인)</span>
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
                <a href="${link('register-confirm.html')}">참가신청 조회·취소</a>
                <a href="${link('meetup/reserve.html')}">밋업 예약</a>
                <a href="${link('meetup/confirm.html')}">예약 조회·취소</a>
                <a href="${link('program.html')}">프로그램</a>
                <a href="${link('archive.html')}">아카이브</a>
                <a href="${link('partners.html')}">파트너</a>
              </div>
            </details>
            <nav class="footer-policy" aria-label="Footer policy">
              <a href="${link('privacy.html')}">개인정보처리방침</a>
              <a href="${link('copyright.html')}">저작권 보호방침</a>
              <a href="${link('legal.html')}">법적고지</a>
            </nav>
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

  /* ── 폼 검증 표시 ──
     알림은 화면 가운데 토스트로, 문제 칸은 빨간 테두리 + 아래 안내 문구로.
     밋업 예약·참가신청이 같은 규칙을 쓴다. */

  /** 받침 유무에 따라 '을/를'을 고른다. */
  function withObjectParticle(word) {
    const code = word.charCodeAt(word.length - 1);
    const hasFinal = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
    return `${word}${hasFinal ? '을' : '를'}`;
  }

  /** 필드의 라벨 텍스트. 없으면 name을 그대로 쓴다. */
  function fieldLabel(form, name) {
    const el = form.elements[name];
    const label = el?.closest('.form-field, .ui-checkbox')?.querySelector('.form-label');
    return label ? label.textContent.trim() : name;
  }

  /** 검증에 걸린 필드를 표시하고 아래에 이유를 적는다. 입력이 바뀌면 풀린다. */
  function markInvalid(form, name, message) {
    const el = form.elements[name];
    if (!el) return;
    const field = el.closest('.form-field, .ui-checkbox');
    if (!field) return;
    field.classList.add('is-invalid');
    let note = field.querySelector('.form-error');
    if (message && !note) {
      note = document.createElement('span');
      note.className = 'form-error';
      field.appendChild(note);
    }
    if (note) note.textContent = message;
    const clear = () => { field.classList.remove('is-invalid'); note?.remove(); };
    el.addEventListener('input', clear, { once: true });
    el.addEventListener('change', clear, { once: true });
  }

  /** 서버(jgcf_create_reservation 등)와 같은 규칙: 숫자만 세어 9~11자리. */
  const PHONE_HINT = '연락처는 숫자 9~11자리로 입력해 주세요. 예: 010-1234-5678';
  function isValidPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 11;
  }

  function clearInvalid(form) {
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    form.querySelectorAll('.form-error').forEach((el) => el.remove());
  }

  function focusField(form, name) {
    const el = form.elements[name];
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.focus({ preventScroll: true });
  }

  /**
   * 비어 있는 필수 필드를 전부 표시하고 첫 칸으로 이동한 뒤 토스트를 띄운다.
   * @returns {boolean} 전부 채워져 있으면 true
   */
  function reportMissing(form, names) {
    const missing = names.filter((name) => {
      const el = form.elements[name];
      if (!el) return false;
      if (el.type === 'checkbox') return !el.checked;
      if (el.type === 'file') return !el.files?.length;
      return !el.value.trim();
    });
    missing.forEach((name) => {
      const el = form.elements[name];
      const label = fieldLabel(form, name);
      markInvalid(form, name, el.type === 'checkbox' ? '' : `${withObjectParticle(label)} 입력해 주세요.`);
    });
    if (!missing.length) return true;
    focusField(form, missing[0]);
    toast(missing.length === 1
      ? (form.elements[missing[0]].type === 'checkbox'
        ? '개인정보 제공에 동의해야 신청할 수 있습니다.'
        : `${withObjectParticle(fieldLabel(form, missing[0]))} 입력해 주세요.`)
      : `입력하지 않은 항목이 ${missing.length}개 있습니다. 빨간 표시를 확인해 주세요.`);
    return false;
  }

  /** 완료 화면의 번호 복사 버튼. 클립보드가 막힌 환경이면 번호를 선택 상태로 둔다. */
  function bindCopyNumber(root) {
    const button = root.querySelector('[data-copy-number]');
    const source = root.querySelector('[data-copy-source]');
    if (!button || !source) return;
    button.addEventListener('click', async () => {
      const text = source.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        toast(`${text} 를 복사했습니다.`);
      } catch (error) {
        const range = document.createRange();
        range.selectNodeContents(source);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        toast('번호를 길게 눌러 복사해 주세요.');
      }
    });
  }

  /** 체크인 QR. 폰 카메라로 찍으면 관리자 화면이 그 번호로 열린다. 라이브러리가 없으면 조용히 건너뛴다. */
  function renderCheckinQr(mount, number) {
    if (!mount || !number || typeof window.qrcode !== 'function') return;
    const url = `${window.location.origin}/admin?q=${encodeURIComponent(number)}`;
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      mount.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      const svg = mount.querySelector('svg');
      if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `체크인 QR ${number}`); }
    } catch (error) {
      console.warn('QR을 만들지 못했습니다.', error);
    }
  }

  window.JGCFCommon = {
    lang: LANG,
    altLangHref,
    bindCopyNumber,
    renderCheckinQr,
    base: "/",
    link,
    asset,
    toast,
    withObjectParticle,
    markInvalid,
    clearInvalid,
    focusField,
    reportMissing,
    isValidPhone,
    PHONE_HINT,
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
