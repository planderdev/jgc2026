(function () {
  const common = () => window.JGCFCommon;
  const data = () => window.JGCF;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeLogoClass(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function getProgramCompanyLogo(company) {
    return data().getCompanyLogo?.(company) || company?.logo || '';
  }

  function getProgramLogoVariant(company) {
    return data().getCompanyLogoVariant?.(company) || '';
  }

  const scheduleThumbnails = [
    'assets/images/archive/2025/DSC09457.jpg',
    'assets/images/archive/2025/DSC08633.jpg',
    'assets/images/archive/2025/DSC09761.jpg',
    'assets/images/archive/2025/DSC09180.jpg',
    'assets/images/archive/2025/DSC09532.jpg',
    'assets/images/archive/2024/jgc-2024-013.jpg',
    'assets/images/archive/2025/DSC09822.jpg',
    'assets/images/archive/2025/DSC08633.jpg'
  ];

  function getScheduleThumbnail(chapterIndex, sessionIndex) {
    return scheduleThumbnails[(chapterIndex + sessionIndex) % scheduleThumbnails.length];
  }

  function renderPartnerLogo(item, index) {
    if (typeof item === 'string') {
      return `<span class="partner-logo-text">${escapeHtml(item)}</span>`;
    }

    const label = escapeHtml(item?.label || item?.name || `Partner ${String(index + 1).padStart(2, '0')}`);
    const logoClass = normalizeLogoClass(item?.logoClass);
    if (!logoClass) return `<span class="partner-logo-text">${label}</span>`;
    return `<span class="partner-logo-symbol ${logoClass}" role="img" aria-label="${label}"></span>`;
  }

  let lastSpeakerTrigger = null;
  let speakerScrollLock = null;
  let speakerTouchY = null;

  function speakerById(id) {
    return (data().speakers || []).find((speaker) => speaker.id === id);
  }

  function renderSpeakerIntroList(speaker, className = 'speaker-modal-list') {
    const introItems = Array.isArray(speaker?.intro) ? speaker.intro : [];
    if (!introItems.length) return '';
    return `<ul class="${className}">${introItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function lockSpeakerPageScroll() {
    if (speakerScrollLock) return;
    const bodyStyle = document.body.style;
    speakerScrollLock = {
      y: window.scrollY || document.documentElement.scrollTop || 0,
      htmlLocked: document.documentElement.classList.contains('no-scroll'),
      bodyLocked: document.body.classList.contains('no-scroll'),
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width
    };

    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${speakerScrollLock.y}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';
  }

  function unlockSpeakerPageScroll() {
    if (!speakerScrollLock) return;
    const state = speakerScrollLock;
    const bodyStyle = document.body.style;

    if (!state.htmlLocked) document.documentElement.classList.remove('no-scroll');
    if (!state.bodyLocked) document.body.classList.remove('no-scroll');
    bodyStyle.position = state.position;
    bodyStyle.top = state.top;
    bodyStyle.left = state.left;
    bodyStyle.right = state.right;
    bodyStyle.width = state.width;

    speakerScrollLock = null;
    window.scrollTo(0, state.y);
  }

  function scrollSpeakerModalContent(modal, deltaY) {
    const scroller = modal?.querySelector('.speaker-modal-content');
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight || !deltaY) return false;

    const max = scroller.scrollHeight - scroller.clientHeight;
    const next = Math.min(max, Math.max(0, scroller.scrollTop + deltaY));
    if (next === scroller.scrollTop) return true;

    scroller.scrollTop = next;
    return true;
  }

  function getSpeakerModal() {
    let modal = document.querySelector('[data-speaker-modal]');
    if (modal) return modal;

    modal = document.createElement('dialog');
    modal.className = 'speaker-modal';
    modal.dataset.speakerModal = '';
    modal.setAttribute('aria-labelledby', 'speaker-modal-title');
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-speaker-modal-close]')) {
        modal.close();
      }
    });

    modal.addEventListener('wheel', (event) => {
      if (!modal.open) return;
      if (scrollSpeakerModalContent(modal, event.deltaY)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { passive: false });

    modal.addEventListener('touchstart', (event) => {
      speakerTouchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    }, { passive: true });

    modal.addEventListener('touchmove', (event) => {
      if (!modal.open || speakerTouchY === null || event.touches.length !== 1) return;
      const currentY = event.touches[0].clientY;
      const deltaY = speakerTouchY - currentY;
      if (scrollSpeakerModalContent(modal, deltaY)) {
        event.preventDefault();
        event.stopPropagation();
      }
      speakerTouchY = currentY;
    }, { passive: false });

    modal.addEventListener('touchend', () => {
      speakerTouchY = null;
    });

    modal.addEventListener('close', () => {
      speakerTouchY = null;
      unlockSpeakerPageScroll();
      if (lastSpeakerTrigger) lastSpeakerTrigger.focus();
      lastSpeakerTrigger = null;
    });

    return modal;
  }

  function openSpeakerModal(speaker, trigger) {
    if (!speaker) return;
    const modal = getSpeakerModal();
    lastSpeakerTrigger = trigger || null;
    const intro = renderSpeakerIntroList(speaker);
    const media = speaker.pending
      ? `<div class="speaker-placeholder" role="img" aria-label="연사 섭외 중"><i class="ri-user-line" aria-hidden="true"></i><span>TBA</span></div>`
      : `<img src="${common().asset(speaker.image)}" alt="${escapeHtml(speaker.name)} portrait" decoding="async">`;

    modal.innerHTML = `
      <article class="speaker-modal-panel">
        <div class="speaker-modal-media">${media}</div>
        <div class="speaker-modal-content">
          <button class="speaker-modal-close" type="button" data-speaker-modal-close aria-label="닫기">
            <span class="speaker-modal-close-mark" aria-hidden="true"></span>
          </button>
          <span class="ui-badge">${escapeHtml(speaker.track)}</span>
          <h2 class="speaker-modal-title" id="speaker-modal-title">${escapeHtml(speaker.name)}</h2>
          <p class="speaker-role">
            <span>${escapeHtml(speaker.role)}</span>
            <span aria-hidden="true">|</span>
            <span>${escapeHtml(speaker.org)}</span>
          </p>
          ${speaker.bio ? `<p class="speaker-modal-bio">${escapeHtml(speaker.bio)}</p>` : ''}
          ${intro ? `<div class="speaker-modal-section"><h3>주요 약력</h3>${intro}</div>` : ''}
        </div>
      </article>
    `;

    modal.showModal();
    lockSpeakerPageScroll();
    modal.querySelector('[data-speaker-modal-close]')?.focus();
  }

  function renderSpeakerGrid() {
    const grid = document.querySelector('[data-speaker-grid]');
    if (!grid) return;
    grid.innerHTML = data().speakers.map((speaker) => {
      const cardClass = ['speaker-profile-card', speaker.pending ? 'is-pending' : '']
        .filter(Boolean)
        .join(' ');
      return `
        <article class="${cardClass}" id="${escapeHtml(speaker.id)}" data-speaker-id="${escapeHtml(speaker.id)}" data-aos="fade-up" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${escapeHtml(speaker.name)} 약력 보기">
          <span class="speaker-card-more" aria-hidden="true"><i class="ri-add-line" aria-hidden="true"></i></span>
          ${speaker.pending
            ? `<div class="speaker-placeholder" role="img" aria-label="연사 섭외 중"><i class="ri-user-line" aria-hidden="true"></i><span>TBA</span></div>`
            : `<img src="${common().asset(speaker.image)}" alt="${escapeHtml(speaker.name)} portrait" loading="lazy" decoding="async">`}
          <div class="speaker-info">
            <span class="ui-badge">${escapeHtml(speaker.track)}</span>${speaker.pending ? ' <span class="ui-badge speaker-pending-badge">섭외 중</span>' : ''}
            <h2 class="speaker-name">${escapeHtml(speaker.name)}</h2>
            <p class="speaker-role">
              <span>${escapeHtml(speaker.role)}</span>
              <span aria-hidden="true">|</span>
              <span>${escapeHtml(speaker.org)}</span>
            </p>
          </div>
        </article>
      `;
    }).join('');

    if (grid.dataset.speakerModalBound) return;
    grid.dataset.speakerModalBound = 'true';
    grid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-speaker-id]');
      if (!card) return;
      openSpeakerModal(speakerById(card.dataset.speakerId), card);
    });
    grid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-speaker-id]');
      if (!card) return;
      event.preventDefault();
      openSpeakerModal(speakerById(card.dataset.speakerId), card);
    });
  }

  function renderSchedule() {
    const tabs = document.querySelector('[data-schedule-tabs]');
    const list = document.querySelector('[data-schedule-list]');
    if (!tabs || !list) return;

    tabs.innerHTML = data().schedule.map((chapter, index) => `
      <li><a href="#${escapeHtml(chapter.id)}" class="${index === 0 ? 'is-active' : ''}">${escapeHtml(chapter.tab)}</a></li>
    `).join('');

    list.innerHTML = data().schedule.map((chapter, chapterIndex) => `
      <section class="schedule-chapter" id="${escapeHtml(chapter.id)}" data-gsap-rise>
        <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
        <div class="session-list">
        ${chapter.sessions.map((session, sessionIndex) => {
          const thumbnail = session.thumbnail || getScheduleThumbnail(chapterIndex, sessionIndex);
          return `
          <article class="session-row">
            <div class="session-copy">
              <div class="session-kicker">
                <time class="session-time">${escapeHtml(session.time)}</time>
              </div>
              <h3 class="session-title">${escapeHtml(session.title)}</h3>
              <p class="session-meta">${escapeHtml(session.meta)}</p>
            </div>
            <div class="session-thumb">
              <img src="${common().asset(thumbnail)}" alt="${escapeHtml(session.title)} 썸네일" loading="lazy" decoding="async">
            </div>
          </article>
        `;
        }).join('')}
        </div>
      </section>
    `).join('');

    const tabLinks = Array.from(tabs.querySelectorAll('a'));
    let activeTabId = '';

    function revealScheduleTab(anchor) {
      const shouldReveal = window.matchMedia?.('(max-width: 768px)').matches;
      if (!shouldReveal) return;
      const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      anchor.scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
    }

    tabLinks.forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        revealScheduleTab(anchor);
        document.querySelector(anchor.getAttribute('href')).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    function updateActive() {
      const scrollY = window.scrollY + 160;
      let current = data().schedule[0].id;
      data().schedule.forEach((chapter) => {
        const node = document.getElementById(chapter.id);
        if (node && node.offsetTop <= scrollY) current = chapter.id;
      });
      let activeAnchor = null;
      tabLinks.forEach((anchor) => {
        const isActive = anchor.getAttribute('href') === `#${current}`;
        anchor.classList.toggle('is-active', isActive);
        if (isActive) activeAnchor = anchor;
      });
      if (activeAnchor && activeTabId !== current) {
        activeTabId = current;
        revealScheduleTab(activeAnchor);
      }
      const wrap = tabs.closest('.tabs-wrap');
      if (wrap) tabs.classList.toggle('is-fixed', window.scrollY > wrap.offsetTop - 75);
    }

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
  }

  function renderProgramCompanyCard(company, index, variant = '') {
    const points = Array.isArray(company.points) ? company.points : [];
    const note = company.note || '';
    const logo = getProgramCompanyLogo(company);
    const thumbClass = `program-company-thumb${logo ? ` is-logo${getProgramLogoVariant(company)}` : ' is-empty-logo'}`;
    const thumb = logo
      ? `<img src="${escapeHtml(common().asset(logo))}" alt="${escapeHtml(`${company.name} 로고`)}" loading="lazy" decoding="async">`
      : '';
    const badge = company.field ? `<span class="ui-badge">${escapeHtml(company.field)}</span>` : '';
    const body = points.length
      ? `<ul class="program-company-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : `<p class="program-company-note">${escapeHtml(note)}</p>`;

    return `
      <article class="program-company-card ${variant}">
        <div class="${thumbClass}">
          ${thumb}
        </div>
        <div class="program-company-content">
          ${badge}
          <h4>${escapeHtml(company.name)}</h4>
          ${company.project ? `<p class="program-company-project">${escapeHtml(company.project)}</p>` : ''}
          ${body}
        </div>
      </article>
    `;
  }

  function renderProgramCompanies() {
    const main = document.querySelector('[data-main-ir-companies]');
    const rising = document.querySelector('[data-rising-ir-companies]');
    const exhibition = document.querySelector('[data-exhibition-companies]');
    const institutionOrgs = document.querySelector('[data-institution-orgs]');

    if (institutionOrgs) {
      institutionOrgs.innerHTML = (data().institutionOrgs || [])
        .map((org) => {
          const logo = getProgramCompanyLogo(org);
          const logoVariant = logo ? getProgramLogoVariant(org) : '';
          const field = org.field ? `<span>${escapeHtml(org.field)}</span>` : '';
          return `
          <div class="company-pill ${logo ? 'has-logo' : ''}">
            ${logo ? `
            <div class="program-company-thumb is-logo${logoVariant} is-pill-logo">
              <img src="${escapeHtml(common().asset(logo))}" alt="${escapeHtml(org.name)} 로고" loading="lazy" decoding="async">
            </div>
            ` : ''}
            <div class="company-pill-copy">
              <strong>${escapeHtml(org.name)}</strong>
              ${field}
            </div>
          </div>
        `;
        }).join('');
    }

    if (main) {
      main.innerHTML = (data().mainIrCompanies || [])
        .map((company, index) => renderProgramCompanyCard(company, index))
        .join('');
    }

    if (rising) {
      rising.innerHTML = (data().risingIrCompanies || [])
        .map((company, index) => renderProgramCompanyCard(company, index, 'is-compact'))
        .join('');
    }

    if (exhibition) {
      exhibition.innerHTML = (data().exhibitionCompanies || [])
        .map((company, index) => renderProgramCompanyCard(company, index, 'is-exhibition'))
        .join('');
    }
  }

  let archiveSwiper = null;
  let lastArchiveTrigger = null;
  const DEFAULT_ARCHIVE_YEAR = '2025';

  function archiveAlbumByYear(year) {
    return (data().archiveAlbums || []).find((album) => album.year === String(year));
  }

  function setArchivePageYear(root, year) {
    const buttons = Array.from(root.querySelectorAll('[data-archive-tab]'));
    const panels = Array.from(root.querySelectorAll('[data-archive-panel]'));

    buttons.forEach((button) => {
      const active = button.dataset.archiveTab === year;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.dataset.archivePanel === year;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }

  function updateArchiveCounter(modal, swiper) {
    const count = modal.querySelector('[data-archive-count]');
    if (!count || !swiper) return;
    const total = Number(swiper.slides?.length || 0);
    const current = Number((swiper.realIndex ?? swiper.activeIndex) || 0) + 1;
    count.textContent = `${current} / ${total}`;
  }

  function getArchiveLightbox() {
    let modal = document.querySelector('[data-archive-lightbox]');
    if (modal) return modal;

    modal = document.createElement('dialog');
    modal.className = 'archive-lightbox';
    modal.dataset.archiveLightbox = '';
    modal.setAttribute('aria-label', '아카이브 이미지 보기');
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-archive-close]')) {
        modal.close();
      }
    });

    modal.addEventListener('keydown', (event) => {
      if (!archiveSwiper) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        archiveSwiper.slidePrev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        archiveSwiper.slideNext();
      }
    });

    modal.addEventListener('close', () => {
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
      if (archiveSwiper) {
        archiveSwiper.destroy(true, true);
        archiveSwiper = null;
      }
      if (lastArchiveTrigger) lastArchiveTrigger.focus();
      lastArchiveTrigger = null;
    });

    return modal;
  }

  function openArchiveLightbox(album, index, trigger) {
    if (!album || !album.images?.length) return;
    const modal = getArchiveLightbox();
    const slides = album.images.map((item, itemIndex) => `
      <div class="swiper-slide">
        <figure class="archive-lightbox-slide">
          <img src="${escapeHtml(common().asset(item.src))}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" fetchpriority="low">
          <figcaption>${escapeHtml(album.year)} ${String(itemIndex + 1).padStart(2, '0')} / ${album.images.length}</figcaption>
        </figure>
      </div>
    `).join('');

    lastArchiveTrigger = trigger || null;
    modal.innerHTML = `
      <div class="archive-lightbox-shell">
        <div class="archive-lightbox-top">
          <span class="archive-lightbox-count" data-archive-count>1 / ${album.images.length}</span>
          <button class="archive-lightbox-close" type="button" data-archive-close aria-label="아카이브 닫기">
            <span class="speaker-modal-close-mark" aria-hidden="true"></span>
          </button>
        </div>
        <button class="archive-lightbox-nav is-prev" type="button" data-archive-prev aria-label="이전 이미지">
          <i class="ri-arrow-left-line" aria-hidden="true"></i>
        </button>
        <div class="swiper archive-lightbox-swiper">
          <div class="swiper-wrapper">${slides}</div>
        </div>
        <button class="archive-lightbox-nav is-next" type="button" data-archive-next aria-label="다음 이미지">
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </button>
      </div>
    `;

    modal.showModal();
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');

    if (typeof window.Swiper === 'function') {
      archiveSwiper = new window.Swiper(modal.querySelector('.archive-lightbox-swiper'), {
        initialSlide: index,
        loop: album.images.length > 1,
        speed: 420,
        keyboard: {
          enabled: true
        },
        navigation: {
          prevEl: modal.querySelector('[data-archive-prev]'),
          nextEl: modal.querySelector('[data-archive-next]')
        },
        on: {
          init() { updateArchiveCounter(modal, this); },
          slideChange() { updateArchiveCounter(modal, this); }
        }
      });
    } else {
      modal.querySelectorAll('[data-archive-prev], [data-archive-next]').forEach((button) => { button.hidden = true; });
      updateArchiveCounter(modal, { slides: album.images, activeIndex: index, realIndex: index });
    }

    modal.querySelector('[data-archive-close]')?.focus();
  }

  function renderArchivePage() {
    const root = document.querySelector('[data-archive-gallery]');
    if (!root) return;
    const albums = data().archiveAlbums || [];
    if (!albums.length) return;

    const requestedYear = archiveAlbumByYear(window.location.hash.replace('#', ''))?.year;
    const defaultYear = archiveAlbumByYear(DEFAULT_ARCHIVE_YEAR)?.year || albums[0].year;
    const activeYear = requestedYear || defaultYear;
    root.innerHTML = `
      <div class="archive-tabs" role="tablist" aria-label="아카이브 연도">
        ${albums.map((album) => `
          <button class="archive-tab ${album.year === activeYear ? 'is-active' : ''}" type="button" role="tab" id="archive-tab-${escapeHtml(album.year)}" aria-selected="${album.year === activeYear}" aria-controls="archive-panel-${escapeHtml(album.year)}" tabindex="${album.year === activeYear ? '0' : '-1'}" data-archive-tab="${escapeHtml(album.year)}">
            ${escapeHtml(album.year)}
            <span>${album.images.length}</span>
          </button>
        `).join('')}
      </div>
      <div class="archive-panels">
        ${albums.map((album) => `
          <section class="archive-panel ${album.year === activeYear ? 'is-active' : ''}" id="archive-panel-${escapeHtml(album.year)}" role="tabpanel" aria-labelledby="archive-tab-${escapeHtml(album.year)}" data-archive-panel="${escapeHtml(album.year)}" ${album.year === activeYear ? '' : 'hidden'}>
            <div class="archive-grid">
              ${album.images.map((item, index) => `
                <button class="archive-thumb" type="button" data-archive-year="${escapeHtml(album.year)}" data-archive-index="${index}" aria-label="${escapeHtml(item.alt)} 보기">
                  <img src="${escapeHtml(common().asset(item.src))}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async" fetchpriority="low">
                </button>
              `).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;

    root.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-archive-tab]');
      if (tab) {
        setArchivePageYear(root, tab.dataset.archiveTab);
        history.replaceState(null, '', `#${tab.dataset.archiveTab}`);
        return;
      }

      const thumb = event.target.closest('[data-archive-year]');
      if (!thumb) return;
      const album = archiveAlbumByYear(thumb.dataset.archiveYear);
      openArchiveLightbox(album, Number(thumb.dataset.archiveIndex || 0), thumb);
    });

    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const current = event.target.closest('[data-archive-tab]');
      if (!current) return;
      event.preventDefault();
      const buttons = Array.from(root.querySelectorAll('[data-archive-tab]'));
      const dir = event.key === 'ArrowRight' ? 1 : -1;
      const next = buttons[(buttons.indexOf(current) + dir + buttons.length) % buttons.length];
      setArchivePageYear(root, next.dataset.archiveTab);
      next.focus();
      history.replaceState(null, '', `#${next.dataset.archiveTab}`);
    });
  }

  function renderPartners() {
    const mount = document.querySelector('[data-partners]');
    if (!mount) return;
    mount.innerHTML = data().partners.map((group) => `
      <section class="partner-section">
        <header class="partner-section-head">
          <h2>${escapeHtml(group.title)}</h2>
          ${group.subtitle ? `<p>${escapeHtml(group.subtitle)}</p>` : ''}
        </header>
        <div class="partner-grid">
          ${group.items.map((item, index) => `<div class="partner-logo">${renderPartnerLogo(item, index)}</div>`).join('')}
        </div>
      </section>
    `).join('');
  }


  document.addEventListener('DOMContentLoaded', () => {
    renderSpeakerGrid();
    renderSchedule();
    renderProgramCompanies();
    renderArchivePage();
    renderPartners();
  });
})();
