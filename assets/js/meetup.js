(function () {
  const common = () => window.JGCFCommon;
  const data = () => window.JGCF;
  const service = () => window.ReservationService;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 예약 완료 화면에 보여줄 내용을 넘기는 통로.
  // 조회 함수는 담당자 연락처를 요구하므로 완료 페이지에서 다시 조회할 수 없다.
  const COMPLETE_KEY = 'jgcf2026.lastReservation';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 첨부 상한. 서버 버킷(file_size_limit)과 같은 값이어야 한다.
  const ATTACHMENT_MAX_MB = 20;

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

  function renderClosedNotice(form) {
    const shell = form.closest('.reserve-shell') || form.parentElement;
    form.hidden = true;
    const notice = document.createElement('div');
    notice.className = 'result-card';
    notice.innerHTML = `
      <span class="ui-badge">접수 마감</span>
      <h2 class="section-title">비즈니스 밋업 예약 접수가 마감되었습니다</h2>
      <p class="section-subtitle">예약 접수와 취소는 행사 전날(9월 15일) 자정까지 가능했습니다. 변경이 필요하면 운영사무국에 문의해 주세요.</p>
      <div class="step-actions">
        <a class="ui-button secondary" href="${common().link('meetup/confirm.html')}">예약 조회</a>
        <a class="ui-button coral" href="${common().link('index.html')}">메인으로</a>
      </div>
    `;
    shell.appendChild(notice);
  }

  function initReserve() {
    const form = document.querySelector('[data-reserve-form]');
    if (!form) return;

    // 마감 여부는 서버가 최종 판정한다. 여기서는 헛수고를 막기 위한 안내만 한다.
    service().isOpen().then((open) => { if (!open) renderClosedNotice(form); });

    let step = 1;
    let busy = false;
    const state = {};
    const panels = Array.from(form.querySelectorAll('.step-panel'));
    const steps = Array.from(document.querySelectorAll('[data-step-indicator] li'));
    const companyMount = form.querySelector('[data-company-choices]');
    const timeMount = form.querySelector('[data-time-choices]');
    const confirmMount = form.querySelector('[data-confirm-box]');
    const submitButton = form.querySelector('[data-step="4"] button[type=submit]');

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

    function drawTimes(taken) {
      const breaks = data().reservationBreaks || {};
      const takenSet = new Set(taken || []);
      timeMount.innerHTML = data().reservationTimes.map((time) => {
        const breakLabel = breaks[time];
        const label = breakLabel ? `${time} ${breakLabel}` : (takenSet.has(time) ? `${time} 마감` : time);
        const disabled = breakLabel || takenSet.has(time) ? 'disabled' : '';
        return `
          <label class="choice-card">
            <input type="radio" name="time" value="${escapeHtml(time)}" ${disabled}>
            <span>${escapeHtml(label)}</span>
          </label>
        `;
      }).join('');
    }

    /** 서버에서 마감 시간대를 받아 시간 선택지를 다시 그린다. */
    async function refreshTimes() {
      timeMount.innerHTML = '<p class="section-subtitle">예약 가능한 시간을 확인하는 중입니다…</p>';
      const taken = await service().takenSlots(state.companyId);
      drawTimes(taken);
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
      state.attachmentFile = form.elements.attachment?.files?.[0] || null;
      state.attachmentName = state.attachmentFile?.name || '';
      state.privacy = form.elements.privacy.checked;
    }

    const FIELD_LABEL = {
      applicantCompany: '신청 기업명', managerName: '담당자 이름', phone: '연락처',
      email: '메일 주소', inquiry: '상담 신청 내용'
    };

    async function validateCurrentStep() {
      common().clearInvalid(form);
      if (step === 1) {
        const selected = form.elements.companyId.value;
        if (!selected) {
          companyMount.classList.add('is-invalid');
          companyMount.addEventListener('change', () => companyMount.classList.remove('is-invalid'), { once: true });
          companyMount.scrollIntoView({ block: 'center', behavior: 'smooth' });
          common().toast('상담을 희망하는 기관을 하나 선택해 주세요.');
          return false;
        }
        state.companyId = selected;
        await refreshTimes();
      }
      if (step === 2) {
        const selected = form.elements.time.value;
        if (!selected) {
          timeMount.classList.add('is-invalid');
          timeMount.addEventListener('change', () => timeMount.classList.remove('is-invalid'), { once: true });
          timeMount.scrollIntoView({ block: 'center', behavior: 'smooth' });
          common().toast('희망 시간대를 하나 선택해 주세요.');
          return false;
        }
        state.time = selected;
      }
      if (step === 3) {
        collectApplicant();
        const required = ['applicantCompany', 'managerName', 'phone', 'email', 'inquiry'];
        // 비어 있는 필드를 전부 표시하고, 첫 번째로 이동한다.
        const missing = required.filter((field) => !state[field]);
        missing.forEach((field) => common().markInvalid(form, field, `${common().withObjectParticle(FIELD_LABEL[field])} 입력해 주세요.`));
        if (missing.length) {
          common().focusField(form, missing[0]);
          common().toast(missing.length === 1
            ? `${common().withObjectParticle(FIELD_LABEL[missing[0]])} 입력해 주세요.`
            : `입력하지 않은 항목이 ${missing.length}개 있습니다. 빨간 표시를 확인해 주세요.`);
          return false;
        }
        if (!common().isValidPhone(state.phone)) {
          common().markInvalid(form, 'phone', common().PHONE_HINT);
          common().focusField(form, 'phone');
          common().toast('연락처를 정확하게 입력해 주세요.');
          return false;
        }
        if (!EMAIL_PATTERN.test(state.email)) {
          common().markInvalid(form, 'email', '메일 주소 형식이 올바르지 않습니다. 예: name@company.com');
          common().focusField(form, 'email');
          common().toast('메일 주소를 정확하게 입력해 주세요.');
          return false;
        }
        if (!state.attachmentName) {
          common().markInvalid(form, 'attachment', '회사 소개서 PDF 파일을 첨부해 주세요.');
          common().focusField(form, 'attachment');
          common().toast('회사 소개서 PDF를 첨부해 주세요.');
          return false;
        }
        // 업로드를 시도하기 전에 형식·용량을 먼저 본다. 큰 파일을 다 올린 뒤 거부되면 시간만 버린다.
        const file = state.attachmentFile;
        const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
        if (!isPdf) {
          common().markInvalid(form, 'attachment', 'PDF 파일만 첨부할 수 있습니다.');
          common().focusField(form, 'attachment');
          common().toast('회사 소개서는 PDF 형식만 첨부할 수 있습니다.');
          return false;
        }
        if (file.size > ATTACHMENT_MAX_MB * 1024 * 1024) {
          const mb = (file.size / 1024 / 1024).toFixed(1);
          common().markInvalid(form, 'attachment', `파일이 ${mb}MB입니다. ${ATTACHMENT_MAX_MB}MB 이하로 줄여서 첨부해 주세요.`);
          common().focusField(form, 'attachment');
          common().toast(`첨부파일은 ${ATTACHMENT_MAX_MB}MB 이하여야 합니다.`);
          return false;
        }
        if (!state.privacy) {
          common().markInvalid(form, 'privacy', '');
          common().focusField(form, 'privacy');
          common().toast('개인정보 제공에 동의해야 예약할 수 있습니다.');
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

    form.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-step-action]');
      if (!action || busy) return;
      const type = action.dataset.stepAction;

      if (type === 'next') {
        busy = true;
        action.disabled = true;
        try {
          if (await validateCurrentStep()) {
            step = Math.min(step + 1, 4);
            updateSteps();
          }
        } finally {
          busy = false;
          action.disabled = false;
        }
      }

      if (type === 'prev') {
        step = Math.max(step - 1, 1);
        updateSteps();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (step !== 4 || busy) return;

      busy = true;
      submitButton.disabled = true;
      const originalLabel = submitButton.innerHTML;
      submitButton.textContent = '예약 처리 중…';

      try {
        const upload = await service().uploadAttachment(state.attachmentFile);
        if (!upload.ok) {
          common().toast(upload.reason === 'network'
            ? service().messageFor('network')
            : `첨부파일을 올리지 못했습니다. PDF 형식과 ${ATTACHMENT_MAX_MB}MB 이하인지 확인해 주세요.`);
          return;
        }

        const company = companyById(state.companyId);
        const result = await service().create({
          ...state,
          companyName: company.name,
          companyField: company.field,
          attachmentPath: upload.path,
          attachmentName: upload.name
        });

        if (!result.ok) {
          common().toast(service().messageFor(result.reason));
          // 시간대를 뺏겼다면 2단계로 돌려보내 다시 고르게 한다.
          if (result.reason === 'slot_taken') {
            step = 2;
            updateSteps();
            await refreshTimes();
          }
          return;
        }

        sessionStorage.setItem(COMPLETE_KEY, JSON.stringify({
          reservation_no: result.reservation_no,
          company_name: company.name,
          time_slot: state.time,
          applicant_company: state.applicantCompany,
          manager_name: state.managerName,
          status: 'confirmed'
        }));

        window.location.href = common().link('meetup/complete.html');
      } finally {
        busy = false;
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    });

    drawTimes([]);
    updateSteps();
  }

  function renderComplete() {
    const mount = document.querySelector('[data-complete-result]');
    if (!mount) return;

    let reservation = null;
    try {
      reservation = JSON.parse(sessionStorage.getItem(COMPLETE_KEY) || 'null');
    } catch (error) {
      console.warn('예약 완료 정보를 읽지 못했습니다.', error);
    }

    if (!reservation) {
      mount.innerHTML = `
        <div class="result-card">
          <span class="ui-badge">예약 확인</span>
          <h1 class="section-title">표시할 예약 정보가 없습니다</h1>
          <p class="section-subtitle">예약 완료 직후에만 이 화면에서 확인할 수 있습니다. 예약번호와 담당자 연락처로 조회해 주세요.</p>
          <div class="step-actions">
            <a class="ui-button secondary" href="${common().link('meetup/confirm.html')}">예약 조회</a>
            <a class="ui-button coral" href="${common().link('meetup/reserve.html')}">다시 예약하기</a>
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="result-card">
        <span class="ui-badge">예약 완료</span>
        <h1 class="section-title">비즈니스 밋업 예약이 완료되었습니다</h1>
        <div class="reservation-number">${escapeHtml(reservation.reservation_no)}</div>
        <p class="section-subtitle">예약번호는 조회와 취소에 필요합니다. 담당자 연락처와 함께 보관해 주세요.</p>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>상담기관</dt><dd>${escapeHtml(reservation.company_name)}</dd></div>
          <div class="confirm-row"><dt>시간</dt><dd>${escapeHtml(reservation.time_slot)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicant_company)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.manager_name)}</dd></div>
          <div class="confirm-row"><dt>상태</dt><dd>예약 확정</dd></div>
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

    let current = null;
    let currentPhone = '';
    let open = true;
    const submitButton = form.querySelector('button[type=submit]');
    service().isOpen().then((value) => { open = value; });

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

    function drawReservation(reservation) {
      current = reservation;
      result.innerHTML = `
        <span class="ui-badge">${reservation.status === 'confirmed' ? '예약 확정' : '예약 취소'}</span>
        <h2 class="side-title">${escapeHtml(reservation.company_name)}</h2>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>예약번호</dt><dd>${escapeHtml(reservation.reservation_no)}</dd></div>
          <div class="confirm-row"><dt>시간</dt><dd>${escapeHtml(reservation.time_slot)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicant_company)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.manager_name)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(reservation.phone)}</dd></div>
        </dl>
        ${reservation.status === 'confirmed'
          ? (open
            ? '<button class="ui-button ghost" type="button" data-open-cancel>예약 취소</button>'
            : '<p class="form-help">취소 접수는 행사 전날 자정에 마감되었습니다. 변경이 필요하면 운영사무국에 문의해 주세요.</p>')
          : ''}
      `;
    }

    function drawMessage(text) {
      current = null;
      result.innerHTML = `<p class="prose-block">${escapeHtml(text)}</p>`;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const reservationNo = form.elements.reservationNumber.value;
      const phone = form.elements.phone.value;

      submitButton.disabled = true;
      result.innerHTML = '<p class="prose-block">조회 중입니다…</p>';
      try {
        const response = await service().findForLookup(reservationNo, phone);
        if (response.ok) {
          currentPhone = phone;
          drawReservation(response.reservation);
        } else {
          drawMessage(service().messageFor(response.reason));
        }
      } finally {
        submitButton.disabled = false;
      }
    });

    result.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-cancel]')) openDialog();
    });

    dialog.addEventListener('click', async (event) => {
      if (event.target.matches('[data-dialog-close]') || event.target === dialog) {
        closeDialog();
        return;
      }

      if (event.target.matches('[data-confirm-cancel]') && current) {
        const button = event.target;
        button.disabled = true;
        try {
          const response = await service().cancel(current.reservation_no, currentPhone);
          closeDialog();
          if (response.ok) {
            drawReservation(response.reservation);
            common().toast('예약이 취소되었습니다.');
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
    renderCompanyList();
    initReserve();
    renderComplete();
    initConfirm();
  });
})();
