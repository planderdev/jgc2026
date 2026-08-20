(function () {
  const common = () => window.JGCFCommon;
  const STORAGE_KEY = 'jgcf2026.eventApplications';
  const SEQUENCE_KEY = 'jgcf2026.eventApplicationSequence';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function nextNumber() {
    const next = Number(localStorage.getItem(SEQUENCE_KEY) || '0') + 1;
    localStorage.setItem(SEQUENCE_KEY, String(next));
    return `JGCF-ATTEND-${String(next).padStart(6, '0')}`;
  }

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('Event application storage could not be read.', error);
      return [];
    }
  }

  function writeApplication(application) {
    const applications = readAll();
    applications.unshift(application);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }

  function fieldValue(form, name) {
    return form.elements[name] ? form.elements[name].value.trim() : '';
  }

  function setActiveType(form, type) {
    form.querySelectorAll('[data-event-type-fields]').forEach((group) => {
      const active = group.dataset.eventTypeFields === type;
      group.hidden = !active;
      group.querySelectorAll('input').forEach((input) => {
        input.required = active;
        if (!active) input.value = '';
      });
    });
  }

  function collectPayload(form) {
    const type = form.elements.participantType.value;
    const typeLabels = {
      company: '기업',
      general: '일반',
      student: '학생'
    };
    const payload = {
      id: nextNumber(),
      createdAt: new Date().toISOString(),
      type,
      typeLabel: typeLabels[type] || type,
      phone: fieldValue(form, 'phone')
    };

    if (type === 'company') {
      payload.name = fieldValue(form, 'companyManagerName');
      payload.organization = fieldValue(form, 'companyName');
    }

    if (type === 'general') {
      payload.name = fieldValue(form, 'generalName');
      payload.organization = '';
    }

    if (type === 'student') {
      payload.name = fieldValue(form, 'studentName');
      payload.organization = fieldValue(form, 'schoolName');
    }

    return payload;
  }

  function initEventRegistration() {
    const form = document.querySelector('[data-event-register-form]');
    const result = document.querySelector('[data-register-result]');
    if (!form || !result) return;

    setActiveType(form, form.elements.participantType.value);

    form.querySelectorAll('[data-event-type-option]').forEach((option) => {
      option.addEventListener('change', () => setActiveType(form, option.value));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!form.elements.privacy.checked) {
        common().toast('개인정보 제공에 동의해 주세요.');
        return;
      }

      const application = collectPayload(form);
      writeApplication(application);
      form.hidden = true;
      result.hidden = false;
      result.innerHTML = `
        <span class="ui-badge">신청 완료</span>
        <h2 class="section-title">행사 참가신청이 완료되었습니다</h2>
        <div class="reservation-number">${escapeHtml(application.id)}</div>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>구분</dt><dd>${escapeHtml(application.typeLabel)}</dd></div>
          ${application.organization ? `<div class="confirm-row"><dt>소속</dt><dd>${escapeHtml(application.organization)}</dd></div>` : ''}
          <div class="confirm-row"><dt>이름</dt><dd>${escapeHtml(application.name)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(application.phone)}</dd></div>
        </dl>
        <div class="step-actions">
          <a class="ui-button secondary" href="${common().link('program.html')}">프로그램 보기</a>
          <a class="ui-button coral" href="${common().link('meetup/reserve.html')}">비즈밋업 예약</a>
        </div>
      `;
    });
  }

  document.addEventListener('DOMContentLoaded', initEventRegistration);
})();
