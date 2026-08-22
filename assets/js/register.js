(function () {
  const common = () => window.JGCFCommon;
  const service = () => window.ReservationService;
  const COMPLETE_KEY = 'jgcf.registration.complete';

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
            phone: application.phone
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
          <span class="ui-badge">참가신청 확인</span>
          <h1 class="section-title">표시할 신청 정보가 없습니다</h1>
          <p class="section-subtitle">신청 완료 직후에만 이 화면에서 확인할 수 있습니다. 참가신청을 진행해 주세요.</p>
          <div class="step-actions">
            <a class="ui-button coral" href="${common().link('register.html')}">참가신청 하기</a>
            <a class="ui-button secondary" href="${common().link('index.html')}">메인으로</a>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="result-card">
        <span class="ui-badge">참가신청 완료</span>
        <h1 class="section-title">행사 참가신청이 완료되었습니다</h1>
        <div class="reservation-number">${escapeHtml(registration.registration_no)}</div>
        <p class="section-subtitle">신청번호는 현장 확인 시 필요할 수 있으니 보관해 주세요.</p>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>구분</dt><dd>${escapeHtml(registration.type_label)}</dd></div>
          ${registration.organization ? `<div class="confirm-row"><dt>소속</dt><dd>${escapeHtml(registration.organization)}</dd></div>` : ''}
          <div class="confirm-row"><dt>이름</dt><dd>${escapeHtml(registration.name)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(registration.phone)}</dd></div>
          <div class="confirm-row"><dt>행사 일시</dt><dd>2026. 9. 16. Wed 10:00-18:00</dd></div>
          <div class="confirm-row"><dt>행사 장소</dt><dd>제주특별자치도 제주시 신산로 82 제주콘텐츠진흥원 내 1층 Be IN; (비인)</dd></div>
        </dl>
        <div class="step-actions">
          <a class="ui-button secondary" href="${common().link('program.html')}">프로그램 보기</a>
          <a class="ui-button coral" href="${common().link('meetup/reserve.html')}">비즈밋업 예약</a>
        </div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEventRegistration();
    renderRegistrationComplete();
  });
})();
