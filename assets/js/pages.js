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
    const filter = document.querySelector('[data-speaker-filter]');
    const search = document.querySelector('[data-speaker-search]');

    function draw() {
      const track = filter && filter.value ? filter.value : 'all';
      const keyword = search ? search.value.trim().toLowerCase() : '';
      const speakers = data().speakers.filter((speaker) => {
        const byTrack = track === 'all' || speaker.track === track;
        const haystack = `${speaker.name} ${speaker.role} ${speaker.org} ${speaker.bio}`.toLowerCase();
        return byTrack && (!keyword || haystack.includes(keyword));
      });

      grid.innerHTML = speakers.map((speaker) => `
        <article class="speaker-profile-card" id="${escapeHtml(speaker.id)}" data-aos="fade-up">
          <img src="${common().asset(speaker.image)}" alt="${escapeHtml(speaker.name)} portrait">
          <div class="speaker-info">
            <span class="ui-badge">${escapeHtml(speaker.track)}</span>
            <h2 class="speaker-name">${escapeHtml(speaker.name)}</h2>
            <p class="speaker-role">${escapeHtml(speaker.role)}<br>${escapeHtml(speaker.org)}</p>
          </div>
        </article>
      `).join('') || '<p class="prose-block">조건에 맞는 연사가 없습니다.</p>';
    }

    if (filter) filter.addEventListener('change', draw);
    if (search) search.addEventListener('input', draw);
    draw();
  }

  function renderSchedule() {
    const tabs = document.querySelector('[data-schedule-tabs]');
    const list = document.querySelector('[data-schedule-list]');
    if (!tabs || !list) return;

    tabs.innerHTML = data().schedule.map((chapter, index) => `
      <li><a href="#${escapeHtml(chapter.id)}" class="${index === 0 ? 'is-active' : ''}">${escapeHtml(chapter.tab)}</a></li>
    `).join('');

    list.innerHTML = data().schedule.map((chapter) => `
      <section class="schedule-chapter" id="${escapeHtml(chapter.id)}" data-gsap-rise>
        <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
        ${chapter.sessions.map((session) => `
          <article class="session-row">
            <time class="session-time">${escapeHtml(session.time)}</time>
            <div>
              <h3 class="session-title">${escapeHtml(session.title)}</h3>
              <p class="session-meta">${escapeHtml(session.meta)}</p>
            </div>
          </article>
        `).join('')}
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
    const body = points.length
      ? `<ul class="program-company-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : `<p class="program-company-note">${escapeHtml(note)}</p>`;

    return `
      <article class="program-company-card ${variant}">
        <span class="ui-badge">${escapeHtml(company.field)}</span>
        <h4>${escapeHtml(company.name)}</h4>
        ${company.project ? `<p class="program-company-project">${escapeHtml(company.project)}</p>` : ''}
        ${body}
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
        <div class="faq-answer">${item.a}</div>
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
