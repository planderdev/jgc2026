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
      <article class="speaker-profile-card" id="${escapeHtml(speaker.id)}" data-aos="fade-up">
        <img src="${common().asset(speaker.image)}" alt="${escapeHtml(speaker.name)} portrait" loading="lazy" decoding="async">
        <div class="speaker-info">
          <span class="ui-badge">${escapeHtml(speaker.track)}</span>
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
    tabLinks.forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
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
      tabLinks.forEach((anchor) => {
        anchor.classList.toggle('is-active', anchor.getAttribute('href') === `#${current}`);
      });
      const wrap = tabs.closest('.tabs-wrap');
      if (wrap) tabs.classList.toggle('is-fixed', window.scrollY > wrap.offsetTop - 75);
    }

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
  }

  function renderProgramCompanyCard(company, index, variant = '') {
    const points = Array.isArray(company.points) ? company.points : [];
    const note = company.note || '';
    const thumbnail = company.thumbnail || getProgramCompanyThumbnail(index, variant);
    const body = points.length
      ? `<ul class="program-company-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : `<p class="program-company-note">${escapeHtml(note)}</p>`;

    return `
      <article class="program-company-card ${variant}">
        <div class="program-company-thumb">
          <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(company.name)} 임시 썸네일" loading="lazy" decoding="async">
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

  function renderFaqPage() {
    const mount = document.querySelector('[data-faq-page]');
    if (!mount) return;
    mount.innerHTML = data().faqs.concat([
      {
        q: '현장 등록도 가능한가요?',
        a: '사전 신청을 우선으로 운영하며, 현장 등록 가능 여부는 행사 운영 상황에 따라 안내됩니다.'
      },
      {
        q: '비즈니스 밋업 예약을 취소할 수 있나요?',
        a: '예약 조회/취소 페이지에서 예약번호와 담당자 연락처를 입력하면 예약 상태를 확인하고 취소할 수 있습니다.'
      }
    ]).map((item, index) => `
      <article class="faq-item ${index === 0 ? 'is-open' : ''}">
        <button class="faq-question" type="button">
          <span>${item.q}</span>
          <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
        </button>
        <div class="faq-answer"><p>${item.a}</p></div>
      </article>
    `).join('');
    common().initAccordions(mount);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSpeakerGrid();
    renderSchedule();
    renderProgramCompanies();
    renderPartners();
    renderFaqPage();
  });
})();
