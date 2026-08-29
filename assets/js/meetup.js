(function () {
  const common = () => window.JGCFCommon;
  const data = () => window.JGCF;
  const service = () => window.ReservationService;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 예약 완료 화면에 보여줄 내용을 넘기는 통로.
  // 조회 함수는 담당자 연락처를 요구하므로 완료 페이지에서 다시 조회할 수 없다.
  const COMPLETE_KEY = 'jgcf2026.lastReservation';
  // "다른 기관도 예약하기"로 넘어올 때 3단계 정보를 넘기는 키. 한 번 쓰고 지운다.
  const PREFILL_KEY = 'jgcf2026.reservationPrefill';

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

    // 직전 예약 정보로 3단계를 채운다. 소개서는 파일 입력에 넣을 수 없으므로
    // 서버에 이미 올라간 경로를 재사용하고, 새 파일을 고르면 그걸 우선한다.
    let reuseAttachment = null;
    try {
      const prefill = JSON.parse(sessionStorage.getItem(PREFILL_KEY) || 'null');
      sessionStorage.removeItem(PREFILL_KEY);
      if (prefill) {
        ['applicantCompany', 'managerName', 'phone', 'email', 'inquiry'].forEach((name) => {
          if (form.elements[name] && prefill[name]) form.elements[name].value = prefill[name];
        });
        if (prefill.attachmentPath && prefill.attachmentName) {
          reuseAttachment = { path: prefill.attachmentPath, name: prefill.attachmentName };
          const field = form.elements.attachment?.closest('.form-field');
          const help = field?.querySelector('.form-help');
          if (help) {
            help.innerHTML = `이전 예약의 <strong>${escapeHtml(prefill.attachmentName)}</strong>을 그대로 씁니다. 바꾸려면 새 파일을 선택하세요.`;
          }
          form.elements.attachment.required = false;
        }
        common().toast('이전 예약 정보를 불러왔습니다. 상담기관과 시간을 선택해 주세요.');
      }
    } catch (error) {
      console.warn('프리필 정보를 읽지 못했습니다.', error);
    }

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
      const range = data().slotRange || ((t) => t);
      timeMount.innerHTML = data().reservationTimes.map((time) => {
        const breakLabel = breaks[time];
        // 상담 길이가 드러나도록 시작~종료로 보여준다. 저장되는 값은 시작 시각 그대로.
        const shown = breakLabel ? time : range(time);
        const label = breakLabel ? `${time} ${breakLabel}` : (takenSet.has(time) ? `${shown} 마감` : shown);
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
      state.attachmentName = state.attachmentFile?.name || (reuseAttachment ? reuseAttachment.name : '');
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
        const isPdf = !file || /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
        if (!isPdf) {
          common().markInvalid(form, 'attachment', 'PDF 파일만 첨부할 수 있습니다.');
          common().focusField(form, 'attachment');
          common().toast('회사 소개서는 PDF 형식만 첨부할 수 있습니다.');
          return false;
        }
        if (file && file.size > ATTACHMENT_MAX_MB * 1024 * 1024) {
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
        const upload = state.attachmentFile
          ? await service().uploadAttachment(state.attachmentFile)
          : { ok: true, path: reuseAttachment.path, name: reuseAttachment.name };
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
          if (result.reason === 'slot_taken' || result.reason === 'time_conflict') {
            step = 2;
            updateSteps();
            await refreshTimes();
          } else if (result.reason === 'company_duplicate') {
            step = 1;
            updateSteps();
          }
          return;
        }

        sessionStorage.setItem(COMPLETE_KEY, JSON.stringify({
          reservation_no: result.reservation_no,
          company_name: company.name,
          time_slot: state.time,
          applicant_company: state.applicantCompany,
          manager_name: state.managerName,
          status: 'confirmed',
          prefill: {
            applicantCompany: state.applicantCompany,
            managerName: state.managerName,
            phone: state.phone,
            email: state.email,
            inquiry: state.inquiry,
            attachmentPath: upload.path,
            attachmentName: upload.name
          }
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
          <div class="result-head">
            <span class="ui-badge">예약 확인</span>
            <h1 class="result-title">표시할 예약 정보가 없습니다</h1>
            <p class="result-lead">예약 완료 직후에만 이 화면에서 확인할 수 있습니다. 예약번호와 담당자 연락처로 조회해 주세요.</p>
          </div>
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
        <div class="result-head">
          <span class="result-icon" aria-hidden="true"><i class="ri-check-line"></i></span>
          <h1 class="result-title">비즈니스 밋업 예약이 완료되었습니다</h1>
          <p class="result-lead">예약번호는 조회와 취소에 필요합니다. 담당자 연락처와 함께 보관해 주세요.</p>
        </div>
        <div class="result-number">
          <span class="result-number-label">예약번호</span>
          <strong data-copy-source>${escapeHtml(reservation.reservation_no)}</strong>
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
          <div class="confirm-row"><dt>상담기관</dt><dd>${escapeHtml(reservation.company_name)}</dd></div>
          <div class="confirm-row"><dt>상담 시간</dt><dd>2026. 9. 16. (수) ${escapeHtml(reservation.time_slot)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicant_company)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.manager_name)}</dd></div>
          <div class="confirm-row"><dt>상태</dt><dd><span class="ui-badge result-status">예약 확정</span></dd></div>
        </dl>
        <div class="result-more">
          <p>다른 상담기관과도 만나고 싶다면 같은 정보로 바로 이어서 예약할 수 있습니다. 같은 시간대와 같은 기관은 중복 예약되지 않습니다.</p>
          <button class="ui-button coral" type="button" data-reserve-more>다른 기관도 예약하기 <i class="ri-arrow-right-line" aria-hidden="true"></i></button>
        </div>
        <div class="step-actions">
          <a class="ui-button secondary" href="${common().link('meetup/confirm.html')}">예약 조회·취소</a>
          <a class="ui-button secondary" href="${common().link('index.html')}">메인으로</a>
        </div>
      </div>
    `;
    common().bindCopyNumber(mount);
    common().renderCheckinQr(mount.querySelector('[data-checkin-qr]'), reservation.reservation_no);
    mount.querySelector('[data-reserve-more]')?.addEventListener('click', () => {
      if (reservation.prefill) sessionStorage.setItem(PREFILL_KEY, JSON.stringify(reservation.prefill));
      window.location.href = common().link('meetup/reserve.html');
    });
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

    function drawReservation(reservation, others = []) {
      current = reservation;
      const confirmed = reservation.status === 'confirmed';
      const othersHtml = others.length ? `
        <div class="lookup-others">
          <h3>같은 연락처의 다른 예약 <span>${others.length}건</span></h3>
          <ul>${others.map((o) => `<li><button type="button" data-lookup-other="${escapeHtml(o.reservation_no)}"><strong>${escapeHtml(o.time_slot)}</strong> ${escapeHtml(o.company_name)} <small>${escapeHtml(o.reservation_no)}</small></button></li>`).join('')}</ul>
        </div>` : '';
      result.innerHTML = `
        <div class="lookup-result-head">
          <span class="ui-badge ${confirmed ? 'result-status' : 'result-status off'}">${confirmed ? '예약 확정' : '예약 취소됨'}</span>
          <h2 class="lookup-result-title">${escapeHtml(reservation.company_name)}</h2>
          <p class="lookup-result-when">2026. 9. 16. (수) ${escapeHtml(reservation.time_slot)} 상담</p>
        </div>
        <dl class="confirm-box">
          <div class="confirm-row"><dt>예약번호</dt><dd>${escapeHtml(reservation.reservation_no)}</dd></div>
          <div class="confirm-row"><dt>신청 기업</dt><dd>${escapeHtml(reservation.applicant_company)}</dd></div>
          <div class="confirm-row"><dt>담당자</dt><dd>${escapeHtml(reservation.manager_name)}</dd></div>
          <div class="confirm-row"><dt>연락처</dt><dd>${escapeHtml(reservation.phone)}</dd></div>
        </dl>
        ${confirmed
          ? (open
            ? `<div class="lookup-result-actions">
                 <p class="form-help">취소하면 해당 시간대가 다른 신청자에게 열립니다. 취소 접수는 9월 15일 자정까지 가능합니다.</p>
                 <button class="ui-button ghost" type="button" data-open-cancel>예약 취소</button>
               </div>`
            : '<div class="lookup-result-actions"><p class="form-help">취소 접수는 행사 전날 자정에 마감되었습니다. 변경이 필요하면 운영사무국(064-735-0677)에 문의해 주세요.</p></div>')
          : `<div class="lookup-result-actions"><p class="form-help">취소된 예약입니다. 다시 예약하려면 새 예약을 진행해 주세요.</p><a class="ui-button coral" href="${common().link('meetup/reserve.html')}">새 예약</a></div>`}
        ${confirmed ? `<div class="result-qr">
          <div class="result-qr-code" data-checkin-qr></div>
          <div class="result-qr-text"><strong>행사 당일 체크인 QR</strong><p>접수 데스크에서 이 화면을 보여주세요. 직원이 카메라로 찍으면 바로 출석 처리됩니다.</p></div>
        </div>` : ''}
        ${othersHtml}
      `;
      common().renderCheckinQr(result.querySelector('[data-checkin-qr]'), reservation.reservation_no);
      result.querySelectorAll('[data-lookup-other]').forEach((button) => {
        button.addEventListener('click', () => {
          form.elements.reservationNumber.value = button.dataset.lookupOther;
          form.requestSubmit();
        });
      });
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
      const reservationNo = form.elements.reservationNumber.value;
      const phone = form.elements.phone.value;
      common().clearInvalid(form);
      if (!common().reportMissing(form, ['reservationNumber', 'phone'])) return;

      submitButton.disabled = true;
      result.innerHTML = '<div class="lookup-empty"><p>조회 중입니다…</p></div>';
      try {
        const response = await service().findForLookup(reservationNo, phone);
        if (response.ok) {
          currentPhone = phone;
          drawReservation(response.reservation, response.others || []);
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
