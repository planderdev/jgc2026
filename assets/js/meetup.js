(function () {
  const common = () => window.JGCFCommon;
  const data = () => window.JGCF;
  const service = () => window.ReservationService;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function companyById(id) {
    return data().companies.find((company) => company.id === id);
  }

  function renderCompanyList() {
    const mount = document.querySelector('[data-company-list]');
    if (!mount) return;
    mount.innerHTML = data().companies.map((company) => `
      <div class="company-pill">
        <strong>${escapeHtml(company.name)}</strong>
        <span>${escapeHtml(company.field)}</span>
      </div>
    `).join('');
  }

  function initReserve() {
    const form = document.querySelector('[data-reserve-form]');
    if (!form) return;

    let step = 1;
    const state = {};
    const panels = Array.from(form.querySelectorAll('.step-panel'));
    const steps = Array.from(document.querySelectorAll('[data-step-indicator] li'));
    const companyMount = form.querySelector('[data-company-choices]');
    const timeMount = form.querySelector('[data-time-choices]');
    const confirmMount = form.querySelector('[data-confirm-box]');

    companyMount.innerHTML = data().companies.map((company) => `
      <label class="choice-card">
        <input type="radio" name="companyId" value="${escapeHtml(company.id)}">
        <span>
          <span>
            ${escapeHtml(company.name)}<br>
            <small>${escapeHtml(company.field)}</small>
          </span>
          <i class="ri-arrow-right-line" aria-hidden="true"></i>
        </span>
      </label>
    `).join('');

    function renderTimes() {
      const companyId = state.companyId;
      timeMount.innerHTML = data().reservationTimes.map((time) => {
        const status = companyId ? service().availability(companyId, time) : { available: true, count: 0 };
        return `
          <label class="choice-card">
            <input type="radio" name="time" value="${escapeHtml(time)}" ${status.available ? '' : 'disabled'}>
            <span>${escapeHtml(time)}${status.available ? '' : ' 마감'}</span>
          </label>
        `;
      }).join('');
    }

    function updateSteps() {
      panels.forEach((panel) => panel.classList.toggle('is-active', Number(panel.dataset.step) === step));
      steps.forEach((item, index) => {
        const number = index + 1;
        item.classList.toggle('is-active', number === step);
        item.classList.toggle('is-done', number < step);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function collectApplicant() {
      const fields = ['applicantCompany', 'managerName', 'phone', 'email', 'inquiry'];
      fields.forEach((field) => {
        state[field] = form.elements[field] ? form.elements[field].value.trim() : '';
      });
      state.attachmentName = form.elements.attachment?.files?.[0]?.name || '';
      state.privacy = form.elements.privacy.checked;
    }

    function validateCurrentStep() {
      if (step === 1) {
        const selected = form.elements.companyId.value;
        if (!selected) {
            common().toast('상담을 희망하는 기관을 선택해 주세요.');
          return false;
        }
        state.companyId = selected;
        renderTimes();
      }
      if (step === 2) {
        const selected = form.elements.time.value;
        if (!selected) {
          common().toast('희망 시간대를 선택해 주세요.');
          return false;
        }
        state.time = selected;
      }
      if (step === 3) {
        collectApplicant();
        const required = ['applicantCompany', 'managerName', 'phone', 'email', 'inquiry'];
        const missing = required.find((field) => !state[field]);
        if (missing) {
          common().toast('필수 신청 정보를 입력해 주세요.');
          return false;
        }
        if (!state.attachmentName) {
          common().toast('회사 소개서 PDF를 첨부해 주세요.');
          return false;
        }
        if (!state.privacy) {
          common().toast('개인정보 수집 및 이용에 동의해 주세요.');
          return false;
        }
        renderConfirm();
      }
      return true;
    }

    function renderConfirm() {
      const company = companyById(state.companyId);
      confirmMount.innerHTML = `
        <dl class="confirm-box">
          <div class="confirm-row"><dt>상담기관</dt><dd>${escapeHtml(company.name)}</dd></div>
          <div class="confirm-row"><dt>상담 시간</dt><dd>${escapeHtml(state.time)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(state.applicantCompany)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(state.managerName)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(state.phone)} / ${escapeHtml(state.email)}</dd></div>
          <div class="confirm-row"><dt>첨부파일</dt><dd>${escapeHtml(state.attachmentName)}</dd></div>
          <div class="confirm-row"><dt>상담 신청 내용</dt><dd>${escapeHtml(state.inquiry)}</dd></div>
        </dl>
      `;
    }

    form.addEventListener('click', (event) => {
      const action = event.target.closest('[data-step-action]');
      if (!action) return;
      const type = action.dataset.stepAction;
      if (type === 'next' && validateCurrentStep()) {
        step = Math.min(step + 1, 4);
        updateSteps();
      }
      if (type === 'prev') {
        step = Math.max(step - 1, 1);
        updateSteps();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (step !== 4) return;
      const company = companyById(state.companyId);
      const reservation = service().create({
        ...state,
        companyName: company.name,
        companyField: company.field
      });
      window.location.href = common().link(`meetup/complete.html?reservation=${encodeURIComponent(reservation.id)}`);
    });

    renderTimes();
    updateSteps();
  }

  function renderComplete() {
    const mount = document.querySelector('[data-complete-result]');
    if (!mount) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('reservation');
    const reservation = service().findByNumber(id);
    if (!reservation) {
      mount.innerHTML = `
        <div class="result-card">
          <span class="ui-badge">예약 확인</span>
          <h1 class="section-title">예약 정보를 찾을 수 없습니다</h1>
          <p class="section-subtitle">예약을 다시 진행하거나 조회 페이지에서 예약번호를 확인해 주세요.</p>
          <a class="ui-button coral" href="${common().link('meetup/reserve.html')}">다시 예약하기</a>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="result-card">
        <span class="ui-badge">예약 완료</span>
        <h1 class="section-title">비즈니스 밋업 예약이 완료되었습니다</h1>
        <div class="reservation-number">${escapeHtml(reservation.id)}</div>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>상담기관</dt><dd>${escapeHtml(reservation.companyName)}</dd></div>
          <div class="confirm-row"><dt>시간</dt><dd>${escapeHtml(reservation.time)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicantCompany)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.managerName)}</dd></div>
          <div class="confirm-row"><dt>상태</dt><dd>${reservation.status === 'confirmed' ? '예약 확정' : '예약 취소'}</dd></div>
        </dl>
        <div class="step-actions">
          <a class="ui-button secondary" href="${common().link('meetup/confirm.html')}">예약 조회</a>
          <a class="ui-button coral" href="${common().link('index.html')}">메인으로</a>
        </div>
      </div>
    `;
  }

  function initConfirm() {
    const form = document.querySelector('[data-lookup-form]');
    const result = document.querySelector('[data-lookup-result]');
    const dialog = document.querySelector('[data-cancel-dialog]');
    if (!form || !result || !dialog) return;

    let currentReservation = null;

    function closeDialog() {
      dialog.classList.remove('is-open');
    }

    function drawReservation(reservation) {
      if (!reservation) {
        result.innerHTML = '<p class="prose-block">예약번호와 담당자 연락처가 일치하는 예약이 없습니다.</p>';
        return;
      }
      currentReservation = reservation;
      result.innerHTML = `
        <span class="ui-badge">${reservation.status === 'confirmed' ? '예약 확정' : '예약 취소'}</span>
        <h2 class="side-title">${escapeHtml(reservation.companyName)}</h2>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>예약번호</dt><dd>${escapeHtml(reservation.id)}</dd></div>
          <div class="confirm-row"><dt>시간</dt><dd>${escapeHtml(reservation.time)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicantCompany)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.managerName)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(reservation.phone)}</dd></div>
        </dl>
        ${reservation.status === 'confirmed' ? '<button class="ui-button ghost" type="button" data-open-cancel>예약 취소</button>' : ''}
      `;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const reservation = service().findForLookup(form.elements.reservationNumber.value, form.elements.phone.value);
      drawReservation(reservation);
    });

    result.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-cancel]')) {
        dialog.classList.add('is-open');
      }
    });

    dialog.addEventListener('click', (event) => {
      if (event.target.matches('[data-dialog-close]') || event.target === dialog) {
        closeDialog();
      }
      if (event.target.matches('[data-confirm-cancel]') && currentReservation) {
        currentReservation = service().cancel(currentReservation.id);
        closeDialog();
        drawReservation(currentReservation);
        common().toast('예약이 취소되었습니다.');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDialog();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderCompanyList();
    initReserve();
    renderComplete();
    initConfirm();
  });
})();
