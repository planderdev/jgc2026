(function () {
  const common = () => window.JGCFCommon;
  const service = () => window.ReservationService;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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

    const submitButton = form.querySelector('button[type=submit]');
    let busy = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (!form.elements.privacy.checked) {
        common().toast('개인정보 제공에 동의해 주세요.');
        return;
      }

      const application = collectPayload(form);

      busy = true;
      submitButton.disabled = true;
      const originalLabel = submitButton.innerHTML;
      submitButton.textContent = '신청 처리 중…';

      try {
        const response = await service().createRegistration(application);
        if (!response.ok) {
          common().toast(service().messageFor(response.reason));
          return;
        }

        form.hidden = true;
        result.hidden = false;
        result.innerHTML = `
          <span class="ui-badge">신청 완료</span>
          <h2 class="section-title">행사 참가신청이 완료되었습니다</h2>
          <div class="reservation-number">${escapeHtml(response.registration_no)}</div>
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
      } finally {
        busy = false;
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initEventRegistration);
})();
