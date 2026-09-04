(function () {
  const common = () => window.JGCFCommon;
  const service = () => window.ReservationService;
  const COMPLETE_KEY = 'jgcf.registration.complete';
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const TYPE_LABEL = {
    company: '기업',
    general: '일반',
    student: '학생'
  };

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

  function typeLabel(registration) {
    return registration.type_label || TYPE_LABEL[registration.participant_type] || registration.participant_type || '';
  }

  function renderRegistrationRows(registration) {
    return `
      <div class="confirm-row"><dt>구분</dt><dd>${escapeHtml(typeLabel(registration))}</dd></div>
      ${registration.organization ? `<div class="confirm-row"><dt>소속</dt><dd>${escapeHtml(registration.organization)}</dd></div>` : ''}
      <div class="confirm-row"><dt>이름</dt><dd>${escapeHtml(registration.name)}</dd></div>
      <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(registration.phone)}</dd></div>
      ${registration.email ? `<div class="confirm-row"><dt>메일 주소</dt><dd>${escapeHtml(registration.email)}</dd></div>` : ''}
      <div class="confirm-row"><dt>행사 일시</dt><dd>2026. 9. 16. (수) 10:00–18:00</dd></div>
      <div class="confirm-row"><dt>행사 장소</dt><dd>비인공연장 등 제주콘텐츠진흥원 일원</dd></div>
    `;
  }

  function collectPayload(form) {
    const type = form.elements.participantType.value;
    const payload = {
      type,
      typeLabel: TYPE_LABEL[type] || type,
      phone: fieldValue(form, 'phone'),
      email: fieldValue(form, 'email')
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
    if (!form) return;

    setActiveType(form, form.elements.participantType.value);

    // 행사 종료 후에는 접수하지 않는다. 최종 판정은 서버가 하고 여기서는 안내만 한다.
    service().isRegistrationOpen().then((open) => {
      if (open) return;
      form.hidden = true;
      const notice = document.createElement('div');
      notice.className = 'result-card';
      notice.innerHTML = `
        <span class="ui-badge">접수 마감</span>
        <h2 class="section-title">참가신청 접수가 마감되었습니다</h2>
        <p class="section-subtitle">2026 제주글로벌콘텐츠포럼은 종료되었습니다. 참여해 주신 모든 분께 감사드립니다.</p>
        <div class="step-actions">
          <a class="ui-button coral" href="${common().link('index.html')}">메인으로</a>
        </div>
      `;
      form.insertAdjacentElement('afterend', notice);
    });

    form.querySelectorAll('[data-event-type-option]').forEach((option) => {
      option.addEventListener('change', () => setActiveType(form, option.value));
    });

    const submitButton = form.querySelector('button[type=submit]');
    let busy = false;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;

      // 보이는 필수 칸 + 동의 체크를 한 번에 검사해 문제 칸을 모두 표시한다.
      common().clearInvalid(form);
      const requiredNames = [...form.querySelectorAll('input[required]')]
        .filter((input) => !input.closest('[hidden]'))
        .map((input) => input.name);
      if (!common().reportMissing(form, [...requiredNames, 'privacy'])) return;
      if (!common().isValidPhone(form.elements.phone.value)) {
        common().markInvalid(form, 'phone', common().PHONE_HINT);
        common().focusField(form, 'phone');
        common().toast('연락처를 정확하게 입력해 주세요.');
        return;
      }
      if (!EMAIL_PATTERN.test(fieldValue(form, 'email'))) {
        common().markInvalid(form, 'email', '메일 주소 형식이 올바르지 않습니다. 예: name@company.com');
        common().focusField(form, 'email');
        common().toast('메일 주소를 정확하게 입력해 주세요.');
        return;
      }

      const application = collectPayload(form);

      busy = true;
      submitButton.disabled = true;
      const originalLabel = submitButton.innerHTML;
      submitButton.textContent = '신청 처리 중…';

      try {
        // 서버에 저장하고 실제 발급된 신청번호를 받는다. 저장 없이 완료
        // 페이지로 넘어가면 사무국 명단에 남지 않고 번호도 가짜가 된다.
        const response = await service().createRegistration(application);
        if (!response.ok) {
          common().toast(service().messageFor(response.reason));
          return;
        }

        try {
          sessionStorage.setItem(COMPLETE_KEY, JSON.stringify({
            registration_no: response.registration_no,
            type_label: application.typeLabel,
            organization: application.organization,
            name: application.name,
            phone: application.phone,
            email: application.email
          }));
        } catch (error) {
          console.warn('참가신청 완료 정보를 저장하지 못했습니다.', error);
        }

        window.location.href = common().link('register-complete.html');
      } finally {
        busy = false;
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    });
  }

  function renderRegistrationComplete() {
    const mount = document.querySelector('[data-register-complete-result]');
    if (!mount) return;

    let registration = null;
    try {
      registration = JSON.parse(sessionStorage.getItem(COMPLETE_KEY) || 'null');
    } catch (error) {
      console.warn('참가신청 완료 정보를 읽지 못했습니다.', error);
    }

    if (!registration) {
      mount.innerHTML = `
        <div class="result-card">
          <div class="result-head">
            <span class="ui-badge">참가신청 확인</span>
            <h1 class="result-title">표시할 신청 정보가 없습니다</h1>
            <p class="result-lead">신청 완료 직후에만 이 화면에서 확인할 수 있습니다. 참가신청을 진행해 주세요.</p>
          </div>
          <div class="step-actions">
            <a class="ui-button secondary" href="${common().link('index.html')}">메인으로</a>
            <a class="ui-button coral" href="${common().link('register.html')}">참가신청 하기</a>
            <a class="ui-button secondary" href="${common().link('register-confirm.html')}">신청 조회·취소</a>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="result-card">
        <div class="result-head">
          <span class="result-icon" aria-hidden="true"><i class="ri-check-line"></i></span>
          <h1 class="result-title">행사 참가신청이 완료되었습니다</h1>
          <p class="result-lead">신청번호는 조회와 취소, 현장 확인에 필요할 수 있으니 보관해 주세요.</p>
        </div>
        <div class="result-number">
          <span class="result-number-label">신청번호</span>
          <strong data-copy-source>${escapeHtml(registration.registration_no)}</strong>
          <button class="ui-button ghost" type="button" data-copy-number>복사</button>
        </div>
        <div class="result-qr">
          <div class="result-qr-code" data-checkin-qr></div>
          <div class="result-qr-text">
            <strong>행사 당일 체크인 QR</strong>
            <p>접수 데스크에서 이 화면을 보여주세요. 캡처해 두셔도 됩니다. 직원이 카메라로 찍으면 바로 출석 처리됩니다.</p>
          </div>
        </div>
        <dl class="confirm-box">
          ${renderRegistrationRows(registration)}
        </dl>
        <div class="step-actions">
          <a class="ui-button secondary" href="${common().link('register-confirm.html')}">신청 조회·취소</a>
          <a class="ui-button secondary" href="${common().link('program.html')}">프로그램 보기</a>
          <a class="ui-button coral" href="${common().link('meetup/reserve.html')}">비즈밋업 예약</a>
        </div>
      </div>
    `;
    common().bindCopyNumber(mount);
    common().renderCheckinQr(mount.querySelector('[data-checkin-qr]'), registration.registration_no);
  }

  function initRegistrationConfirm() {
    const form = document.querySelector('[data-registration-lookup-form]');
    const result = document.querySelector('[data-registration-lookup-result]');
    const dialog = document.querySelector('[data-registration-cancel-dialog]');
    if (!form || !result || !dialog) return;

    let current = null;
    let currentPhone = '';
    let open = true;
    const submitButton = form.querySelector('button[type=submit]');
    service().isRegistrationOpen().then((value) => { open = value; });

    function openDialog() {
      dialog.showModal();
      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
    }

    function closeDialog() {
      if (dialog.open) dialog.close();
    }

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    });

    function drawRegistration(registration) {
      current = registration;
      const confirmed = registration.status === 'confirmed';
      result.innerHTML = `
        <div class="lookup-result-head">
          <span class="ui-badge ${confirmed ? 'result-status' : 'result-status off'}">${confirmed ? '신청 확정' : '신청 취소됨'}</span>
          <h2 class="lookup-result-title">${escapeHtml(registration.name)}</h2>
          <p class="lookup-result-when">2026. 9. 16. (수) 10:00–18:00 참가신청</p>
        </div>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>신청번호</dt><dd>${escapeHtml(registration.registration_no)}</dd></div>
          ${renderRegistrationRows(registration)}
        </dl>
        ${confirmed
          ? (open
            ? `<div class="lookup-result-actions">
                 <p class="form-help">참석이 어려우시면 참가신청을 취소해 주세요. 취소 접수는 행사 종료 전까지 가능합니다.</p>
                 <button class="ui-button ghost" type="button" data-open-registration-cancel>참가신청 취소</button>
               </div>`
            : '<div class="lookup-result-actions"><p class="form-help">참가신청 취소가 마감되었습니다. 변경이 필요하면 운영사무국(064-735-0677)에 문의해 주세요.</p></div>')
          : `<div class="lookup-result-actions"><p class="form-help">취소된 참가신청입니다. 다시 참석하려면 새로 참가신청을 진행해 주세요.</p><a class="ui-button coral" href="${common().link('register.html')}">새 참가신청</a></div>`}
        ${confirmed ? `<div class="result-qr">
          <div class="result-qr-code" data-checkin-qr></div>
          <div class="result-qr-text"><strong>행사 당일 체크인 QR</strong><p>접수 데스크에서 이 화면을 보여주세요. 직원이 카메라로 찍으면 바로 출석 처리됩니다.</p></div>
        </div>` : ''}
      `;
      common().renderCheckinQr(result.querySelector('[data-checkin-qr]'), registration.registration_no);
    }

    function drawMessage(text, tone = 'error') {
      current = null;
      result.innerHTML = `<div class="lookup-empty ${tone === 'error' ? 'is-error' : ''}">
        <i class="${tone === 'error' ? 'ri-search-line' : 'ri-calendar-check-line'}" aria-hidden="true"></i>
        <p>${escapeHtml(text)}</p>
      </div>`;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const registrationNo = form.elements.registrationNumber.value;
      const phone = form.elements.phone.value;
      common().clearInvalid(form);
      if (!common().reportMissing(form, ['registrationNumber', 'phone'])) return;

      submitButton.disabled = true;
      result.innerHTML = '<div class="lookup-empty"><p>조회 중입니다…</p></div>';
      try {
        const response = await service().findRegistrationForLookup(registrationNo, phone);
        if (response.ok) {
          currentPhone = phone;
          drawRegistration(response.registration);
        } else {
          drawMessage(service().messageFor(response.reason));
        }
      } finally {
        submitButton.disabled = false;
      }
    });

    result.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-registration-cancel]')) openDialog();
    });

    dialog.addEventListener('click', async (event) => {
      if (event.target.matches('[data-dialog-close]') || event.target === dialog) {
        closeDialog();
        return;
      }

      if (event.target.matches('[data-confirm-registration-cancel]') && current) {
        const button = event.target;
        button.disabled = true;
        try {
          const response = await service().cancelRegistration(current.registration_no, currentPhone);
          closeDialog();
          if (response.ok) {
            drawRegistration(response.registration);
            common().toast('참가신청이 취소되었습니다.');
          } else {
            drawMessage(service().messageFor(response.reason));
            common().toast(service().messageFor(response.reason));
          }
          result.focus();
        } finally {
          button.disabled = false;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEventRegistration();
    renderRegistrationComplete();
    initRegistrationConfirm();
  });
})();
