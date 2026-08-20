(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const common = () => window.JGCFCommon;
  const data = () => window.JGCF || {};

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function asset(path) {
    return common() ? common().asset(path) : path;
  }

  function link(path) {
    return common() ? common().link(path) : path;
  }

  function refreshAos() {
    if (window.AOS) {
      window.setTimeout(() => AOS.refresh(), 80);
    }
  }

  function makeSwiper(selector, options) {
    if (!window.Swiper || !document.querySelector(selector)) return null;
    return new Swiper(selector, options);
  }

  function cssLength(name, fallback = 0) {
    const styles = getComputedStyle(document.documentElement);
    const raw = styles.getPropertyValue(name).trim();
    const resolved = raw.replace(/var\((--[a-zA-Z0-9-_]+)\)/g, (_, token) => styles.getPropertyValue(token).trim());
    const value = parseFloat(resolved);
    return Number.isFinite(value) ? value : fallback;
  }

  function carouselEdgeOffsetOptions() {
    const mobile = cssLength('--home-carousel-edge-offset-mobile', 16);
    const tablet = cssLength('--home-carousel-edge-offset-tablet', 24);
    const desktop = cssLength('--home-carousel-edge-offset-desktop', 32);

    return {
      slidesOffsetBefore: desktop,
      slidesOffsetAfter: desktop,
      breakpoints: {
        0: {
          slidesOffsetBefore: mobile,
          slidesOffsetAfter: mobile
        },
        768: {
          slidesOffsetBefore: tablet,
          slidesOffsetAfter: tablet
        },
        1025: {
          slidesOffsetBefore: desktop,
          slidesOffsetAfter: desktop
        }
      }
    };
  }

  function renderHomeEventCard(item) {
    return `
      <div class="swiper-slide">
        <article class="home-event-card">
          <a href="${link('program.html')}" aria-label="${escapeHtml(item.title)} program detail">
            <span class="home-event-media">
              <img src="${asset(item.image)}" alt="" loading="lazy" decoding="async">
            </span>
            <span class="home-event-title">${escapeHtml(item.title)}</span>
            <span class="home-event-meta">${escapeHtml(item.date)}<br>${escapeHtml(item.location)}</span>
          </a>
        </article>
      </div>
    `;
  }

  function renderSpecialProgramCard(item, index) {
    const tags = (item.region || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const note = item.note ? `<small>${escapeHtml(item.note)}</small>` : '';
    const loading = index < 4 ? 'eager' : 'lazy';
    return `
      <div class="swiper-slide">
        <article class="home-special-card" style="--program-tone: ${escapeHtml(item.tone)}">
          <a href="${link(item.href || 'program.html#main-ir-title')}" aria-label="${escapeHtml(item.title)} IR company detail">
            <span class="home-special-copy">
              <span class="home-special-tags">${tags}</span>
              <strong>${escapeHtml(item.title)}</strong>
              ${note}
            </span>
            <span class="home-special-image">
              <img src="${asset(item.image)}" alt="" loading="${loading}" decoding="async">
            </span>
          </a>
        </article>
      </div>
    `;
  }

  function renderHomeFaqItem(item, index) {
    return `
      <article class="faq-item home-faq-item ${index === 0 ? 'is-open' : ''}">
        <button class="faq-question home-faq-question" type="button">
          <span>${escapeHtml(item.q)}</span>
          <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
        </button>
        <div class="faq-answer home-faq-answer">
          <p>${escapeHtml(item.a)}</p>
        </div>
      </article>
    `;
  }

  function normalizeLogoClass(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function normalizePartner(item, index) {
    if (typeof item === 'string') {
      return {
        label: item,
        logoClass: ''
      };
    }

    return {
      label: item?.label || item?.name || `Partner ${String(index + 1).padStart(2, '0')}`,
      logoClass: normalizeLogoClass(item?.logoClass)
    };
  }

  function renderPartner(item, index) {
    const partner = normalizePartner(item, index);
    const label = escapeHtml(partner.label);
    const content = partner.logoClass
      ? `<span class="partner-logo-symbol ${partner.logoClass}" role="img" aria-label="${label}"></span>`
      : `<span class="home-partner-name">${label}</span>`;

    return `
      <article class="home-partner-card">
        ${content}
      </article>
    `;
  }

  function getHomePartnerGroups(partnerData) {
    if (Array.isArray(partnerData.groups)) return partnerData.groups;
    if (Array.isArray(partnerData.items)) {
      return [
        {
          title: 'Partners',
          subtitle: '협력기관',
          items: partnerData.items
        }
      ];
    }
    return [];
  }

  function renderPartnerGroup(group) {
    const items = Array.isArray(group?.items) ? group.items : [];
    if (!items.length) return '';
    return `
      <section class="home-partner-group" aria-label="${escapeHtml(group.title || 'Partners')}">
        <header class="home-partner-group-head">
          <h3>${escapeHtml(group.title || 'Partners')}</h3>
          ${group.subtitle ? `<p>${escapeHtml(group.subtitle)}</p>` : ''}
        </header>
        <div class="home-partner-list" data-home-partners>
        ${items.map(renderPartner).join('')}
        </div>
      </section>
    `;
  }

  function renderPartnerGroups(groups) {
    return `
      <div class="home-partner-stack">
        ${groups.map(renderPartnerGroup).join('')}
      </div>
    `;
  }

  function initHomeEvents() {
    const section = document.querySelector('.home-events');
    const mount = section?.querySelector('[data-home-events]');
    const items = data().homeEvents || [];
    if (!section || !mount || !items.length) return;

    mount.innerHTML = items.map(renderHomeEventCard).join('');
    makeSwiper('.home-events-swiper', {
      loop: false,
      rewind: true,
      slidesPerView: 'auto',
      ...carouselEdgeOffsetOptions(),
      speed: 620,
      navigation: {
        nextEl: '.home-events-next',
        prevEl: '.home-events-prev'
      },
      autoplay: reduceMotion ? false : {
        delay: 2800,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      }
    });
  }

  function initSpecialPrograms() {
    const section = document.querySelector('.home-special');
    const mount = section?.querySelector('[data-special-programs]');
    const items = data().specialPrograms || [];
    if (!section || !mount || !items.length) return;

    mount.innerHTML = items.map(renderSpecialProgramCard).join('');
    makeSwiper('.home-special-swiper', {
      loop: false,
      rewind: true,
      slidesPerView: 'auto',
      ...carouselEdgeOffsetOptions(),
      speed: 620,
      navigation: {
        nextEl: '.home-special-next',
        prevEl: '.home-special-prev'
      },
      autoplay: reduceMotion ? false : {
        delay: 3200,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      }
    });
  }

  function initHomeFaq() {
    const section = document.querySelector('.home-faq');
    const mount = section?.querySelector('[data-home-faq-list]');
    const items = (data().faqs || []).slice(0, 4);
    if (!section || !mount || !items.length) return;

    mount.innerHTML = items.map(renderHomeFaqItem).join('');
    window.JGCFCommon?.initAccordions?.(section);
  }

  function initPartnerSection() {
    const mount = document.querySelector('[data-home-partner-groups]');
    const partnerData = data().homePartners || {};
    const groups = getHomePartnerGroups(partnerData).filter((group) => Array.isArray(group?.items) && group.items.length);
    if (!mount || !groups.length) return;

    mount.innerHTML = renderPartnerGroups(groups);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHomeEvents();
    initSpecialPrograms();
    initHomeFaq();
    initPartnerSection();
    refreshAos();
  });
})();
