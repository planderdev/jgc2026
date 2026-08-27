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

  const programCompanyThumbnails = [
    'https://cdn.pixabay.com/photo/2015/01/08/18/27/startup-593341_1280.jpg',
    'https://images.unsplash.com/photo-1603201667141-5a2d4c673378?auto=format&fit=crop&w=640&q=80',
    'https://cdn.pixabay.com/photo/2015/01/08/18/27/startup-593342_1280.jpg',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=640&q=80',
    'https://cdn.pixabay.com/photo/2020/01/19/13/40/startup-4777863_1280.jpg',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=640&q=80'
  ];

  const programLogoByTitle = {
    '프리아이디어': 'assets/images/program/freeidea.svg',
    '귤바티': 'assets/images/program/gyulbati.svg',
    '인스피어': 'assets/images/program/insphere.svg',
    '제주특별자치도경제통상진흥원': 'assets/images/program/jeju-business.svg',
    '제주창조경제혁신센터': 'assets/images/program/jeju-creative.svg',
    '제주지식재산센터': 'assets/images/program/jeju-intelle.svg',
    '케이컴퍼니': 'assets/images/program/kcompany.svg',
    '기술보증기금 부산문화콘텐츠금융센터': 'assets/images/program/kibo.svg',
    '계란바구니': 'assets/images/program/memoreal.svg',
    '재단법인 넥스트챌린지': 'assets/images/program/nc.svg',
    '뉴키즈인베스트먼트': 'assets/images/program/newkid.svg',
    '제주창조경제혁신센터 스타트업원스톱지원센터': 'assets/images/program/onestop.svg',
    '사이': 'assets/images/program/teahouse.svg'
  };

  const programPortraitLogoTitles = new Set(['사이']);

  function getProgramCompanyLogo(company) {
    return company?.logo || programLogoByTitle[company?.name] || '';
  }

  function getProgramLogoVariant(company) {
    return programPortraitLogoTitles.has(company?.name) ? ' is-portrait-logo' : '';
  }

  function getProgramCompanyThumbnail(index, variant) {
    const offset = variant === 'is-compact' ? 3 : variant === 'is-exhibition' ? 6 : 0;
    return programCompanyThumbnails[(index + offset) % programCompanyThumbnails.length];
  }

  const scheduleThumbnails = [
    'assets/images/home/program-tour.jpg',
    'assets/images/home/program-business.jpg',
    'assets/images/home/event-opening.jpg',
    'assets/images/program/session-stage.jpg',
    'assets/images/home/event-conference.jpg',
    'assets/images/home/event-networking.jpg',
    'assets/images/home/event-showcase.jpg',
    'assets/images/home/event-audience.jpg'
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

  function renderSpeakerGrid() {
    const grid = document.querySelector('[data-speaker-grid]');
    if (!grid) return;
    grid.innerHTML = data().speakers.map((speaker) => `
      <article class="speaker-profile-card ${speaker.pending ? 'is-pending' : ''}" id="${escapeHtml(speaker.id)}" data-aos="fade-up">
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
    `).join('');
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
                <span>Session ${String(sessionIndex + 1).padStart(2, '0')}</span>
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
    const thumbnail = logo || company.thumbnail || getProgramCompanyThumbnail(index, variant);
    const thumbClass = `program-company-thumb${logo ? ` is-logo${getProgramLogoVariant(company)}` : ''}`;
    const thumbAlt = logo ? `${company.name} 로고` : `${company.name} 썸네일`;
    const body = points.length
      ? `<ul class="program-company-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : `<p class="program-company-note">${escapeHtml(note)}</p>`;

    return `
      <article class="program-company-card ${variant}">
        <div class="${thumbClass}">
          <img src="${escapeHtml(common().asset(thumbnail))}" alt="${escapeHtml(thumbAlt)}" loading="lazy" decoding="async">
        </div>
        <div class="program-company-content">
          <span class="ui-badge">${escapeHtml(company.field)}</span>
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
          return `
          <div class="company-pill ${logo ? 'has-logo' : ''}">
            ${logo ? `
            <div class="program-company-thumb is-logo${logoVariant} is-pill-logo">
              <img src="${escapeHtml(common().asset(logo))}" alt="${escapeHtml(org.name)} 로고" loading="lazy" decoding="async">
            </div>
            ` : ''}
            <div class="company-pill-copy">
              <strong>${escapeHtml(org.name)}</strong>
              <span>${escapeHtml(org.field)}</span>
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
    renderPartners();
  });
})();
