(function () {
  /**
   * 운영 관리 화면.
   *
   * 로그인 토큰으로 jgcf_admin_* 함수를 호출한다. 토큰이 있어도
   * admin_users 명단에 없는 계정은 서버가 forbidden으로 거절하므로,
   * 이 화면 자체는 숨겨야 할 비밀이 아니다.
   */
  const config = () => window.JGCFSupabase;
  const TOKEN_KEY = 'jgcf2026.adminSession';

  const $ = (sel) => document.querySelector(sel);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  let session = null;   // { access_token, email }
  let mode = 'admin';   // 'admin' | 'partner' — jgcf_whoami 결과로 정해진다
  let partnerName = '';
  let tab = 'reservations';
  let reservations = [];
  let registrations = [];

  function saveSession(s) { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(s)); session = s; }
  function loadSession() {
    try { session = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); } catch { session = null; }
  }
  function clearSession() { sessionStorage.removeItem(TOKEN_KEY); session = null; }

  async function api(path, options) {
    const { url, publishableKey } = config();
    const res = await fetch(url + path, {
      ...options,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session ? session.access_token : publishableKey}`,
        'Content-Type': 'application/json',
        ...(options && options.headers)
      }
    });
    return res;
  }

  async function rpc(name, payload) {
    const res = await api(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(payload || {}) });
    if (res.status === 401) { logout('세션이 만료되었습니다. 다시 로그인해 주세요.'); return { ok: false, reason: 'expired' }; }
    if (!res.ok) return { ok: false, reason: 'network' };
    return res.json();
  }

  // ── 로그인 ──────────────────────────────────────────────
  async function login(email, password) {
    const { url, publishableKey } = config();
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      return { ok: false, message: '메일 주소 또는 비밀번호가 올바르지 않습니다.' };
    }
    saveSession({ access_token: body.access_token, email });
    return { ok: true };
  }

  function logout(message) {
    clearSession();
    $('[data-admin-panel]').hidden = true;
    $('[data-login-panel]').hidden = false;
    if (message) $('[data-login-error]').textContent = message;
  }

  // ── 데이터 ──────────────────────────────────────────────
  async function loadData() {
    const mount = $('[data-table-mount]');
    mount.innerHTML = '<p class="admin-empty">불러오는 중…</p>';

    if (mode === 'partner') {
      // 파트너는 자기 기관의 확정 예약만 받는다. 참가신청·타 기관 데이터는
      // 서버가 아예 내려주지 않는다.
      const r = await rpc('jgcf_partner_reservations');
      if (!r.ok) {
        if (r.reason === 'forbidden') { logout('이 계정은 조회 권한이 없습니다. 사무국에 문의하세요.'); return; }
        mount.innerHTML = '<p class="admin-empty">목록을 불러오지 못했습니다. 새로고침을 눌러 주세요.</p>';
        return;
      }
      reservations = r.rows;
      registrations = [];
      render();
      return;
    }

    const [r1, r2] = await Promise.all([rpc('jgcf_admin_reservations'), rpc('jgcf_admin_registrations')]);
    if (!r1.ok || !r2.ok) {
      if (r1.reason === 'forbidden' || r2.reason === 'forbidden') {
        logout('이 계정은 관리자 권한이 없습니다. 사무국에 문의하세요.');
        return;
      }
      mount.innerHTML = '<p class="admin-empty">목록을 불러오지 못했습니다. 새로고침을 눌러 주세요.</p>';
      return;
    }
    reservations = r1.rows;
    registrations = r2.rows;
    fillCompanyFilter();
    render();
  }

  function fillCompanyFilter() {
    const select = $('[data-filter-company]');
    const names = [...new Set(reservations.map((r) => r.company_name))].sort();
    select.innerHTML = '<option value="">전체 상담기관</option>'
      + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  }

  function kst(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function currentRows() {
    const q = ($('[data-search]').value || '').toLowerCase();
    const company = $('[data-filter-company]').value;
    const status = $('[data-filter-status]').value;
    const match = (row, fields) => !q || fields.some((f) => String(row[f] || '').toLowerCase().includes(q));

    if (tab === 'reservations') {
      if (mode === 'partner') {
        return reservations.filter((r) => match(r, ['reservation_no', 'applicant_company', 'manager_name', 'phone', 'email']));
      }
      return reservations
        .filter((r) => (!company || r.company_name === company))
        .filter((r) => (!status || r.status === status))
        .filter((r) => match(r, ['reservation_no', 'applicant_company', 'manager_name', 'phone', 'email', 'company_name']));
    }
    if (tab === 'registrations') {
      return registrations.filter((r) => match(r, ['registration_no', 'name', 'organization', 'phone']));
    }
    // summary
    const map = new Map();
    for (const r of reservations) {
      const s = map.get(r.company_name) || { company_name: r.company_name, confirmed: 0, cancelled: 0, slots: [] };
      if (r.status === 'confirmed') { s.confirmed += 1; s.slots.push(r.time_slot); } else s.cancelled += 1;
      map.set(r.company_name, s);
    }
    return [...map.values()].sort((a, b) => b.confirmed - a.confirmed);
  }

  const TYPE_LABEL = { company: '기업', general: '일반', student: '학생' };

  function render() {
    const rows = currentRows();
    $('[data-count]').textContent = `${rows.length}건`;
    $('[data-filter-company]').hidden = mode === 'partner' || tab !== 'reservations';
    $('[data-filter-status]').hidden = mode === 'partner' || tab !== 'reservations';
    const mount = $('[data-table-mount]');

    if (!rows.length) { mount.innerHTML = '<p class="admin-empty">표시할 항목이 없습니다.</p>'; return; }

    if (mode === 'partner') {
      // 취소·상태 열이 없다. 파트너에게 오는 것은 전부 확정 건이고,
      // 취소 권한은 사무국과 신청자에게만 있다.
      mount.innerHTML = `<table class="admin-table"><thead><tr>
        <th>시간</th><th>신청기업</th><th>담당자</th><th>연락처</th><th>메일</th><th>상담내용</th><th>소개서</th><th>신청일시</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td><strong>${esc(r.time_slot)}</strong></td>
        <td>${esc(r.applicant_company)}</td><td>${esc(r.manager_name)}</td>
        <td>${esc(r.phone)}</td><td>${esc(r.email)}</td>
        <td class="wrap">${esc(r.inquiry)}</td>
        <td>${r.attachment_path ? `<button class="admin-mini" data-download="${esc(r.attachment_path)}" data-filename="${esc(r.attachment_name || 'file.pdf')}">PDF</button>` : '-'}</td>
        <td>${kst(r.created_at)}</td>
      </tr>`).join('')}</tbody></table>`;
      return;
    }

    if (tab === 'reservations') {
      mount.innerHTML = `<table class="admin-table"><thead><tr>
        <th>예약번호</th><th>상태</th><th>상담기관</th><th>시간</th><th>신청기업</th><th>담당자</th>
        <th>연락처</th><th>메일</th><th>상담내용</th><th>첨부</th><th>신청일시</th><th></th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.reservation_no)}</td>
        <td><span class="admin-badge ${r.status === 'confirmed' ? 'ok' : 'off'}">${r.status === 'confirmed' ? '확정' : '취소'}</span></td>
        <td>${esc(r.company_name)}</td><td>${esc(r.time_slot)}</td>
        <td>${esc(r.applicant_company)}</td><td>${esc(r.manager_name)}</td>
        <td>${esc(r.phone)}</td><td>${esc(r.email)}</td>
        <td class="wrap">${esc(r.inquiry)}</td>
        <td>${r.attachment_path ? `<button class="admin-mini" data-download="${esc(r.attachment_path)}" data-filename="${esc(r.attachment_name || 'file.pdf')}">PDF</button>` : '-'}</td>
        <td>${kst(r.created_at)}</td>
        <td>${r.status === 'confirmed' ? `<button class="admin-mini" data-cancel="${esc(r.reservation_no)}">취소</button>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
      return;
    }

    if (tab === 'registrations') {
      mount.innerHTML = `<table class="admin-table"><thead><tr>
        <th>신청번호</th><th>구분</th><th>이름</th><th>소속</th><th>연락처</th><th>신청일시</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.registration_no)}</td><td>${esc(TYPE_LABEL[r.participant_type] || r.participant_type)}</td>
        <td>${esc(r.name)}</td><td>${esc(r.organization || '-')}</td>
        <td>${esc(r.phone)}</td><td>${kst(r.created_at)}</td>
      </tr>`).join('')}</tbody></table>`;
      return;
    }

    mount.innerHTML = `<table class="admin-table"><thead><tr>
      <th>상담기관</th><th>확정</th><th>취소</th><th>확정 시간대</th>
    </tr></thead><tbody>${rows.map((s) => `<tr>
      <td>${esc(s.company_name)}</td><td>${s.confirmed}</td><td>${s.cancelled}</td>
      <td class="wrap">${esc(s.slots.sort().join(', '))}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  // ── CSV ─────────────────────────────────────────────────
  function downloadCsv() {
    const rows = currentRows();
    let header, line;
    if (mode === 'partner') {
      header = ['시간','신청기업','담당자','연락처','메일','상담내용','소개서','신청일시'];
      line = (r) => [r.time_slot, r.applicant_company, r.manager_name, r.phone, r.email, r.inquiry, r.attachment_name || '', kst(r.created_at)];
    } else if (tab === 'reservations') {
      header = ['예약번호','상태','상담기관','시간','신청기업','담당자','연락처','메일','상담내용','첨부파일','신청일시','취소일시'];
      line = (r) => [r.reservation_no, r.status === 'confirmed' ? '확정' : '취소', r.company_name, r.time_slot,
        r.applicant_company, r.manager_name, r.phone, r.email, r.inquiry, r.attachment_name || '', kst(r.created_at), kst(r.cancelled_at)];
    } else if (tab === 'registrations') {
      header = ['신청번호','구분','이름','소속','연락처','신청일시'];
      line = (r) => [r.registration_no, TYPE_LABEL[r.participant_type] || r.participant_type, r.name, r.organization || '', r.phone, kst(r.created_at)];
    } else {
      header = ['상담기관','확정','취소','확정 시간대'];
      line = (s) => [s.company_name, s.confirmed, s.cancelled, s.slots.sort().join(' ')];
    }
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    // BOM을 붙여야 엑셀이 한글을 제대로 연다.
    const csv = '﻿' + [header, ...rows.map(line)].map((r) => r.map(cell).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `jgcf2026-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── 첨부 다운로드 (비공개 버킷, 관리자 토큰으로만 열림) ──
  async function downloadAttachment(path, filename) {
    const res = await api(`/storage/v1/object/authenticated/${config().attachmentBucket}/${path}`, { method: 'GET' });
    if (!res.ok) { alert('파일을 내려받지 못했습니다.'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── 이벤트 ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const loginPanel = $('[data-login-panel]');
    const adminPanel = $('[data-admin-panel]');
    const dialog = $('[data-admin-cancel-dialog]');
    let cancelTarget = null;

    async function enter() {
      const who = await rpc('jgcf_whoami');
      if (!who.ok || who.role === 'none') {
        logout('이 계정은 조회 권한이 없습니다. 사무국에 문의하세요.');
        return;
      }
      mode = who.role;
      partnerName = who.company_name || '';

      loginPanel.hidden = true;
      adminPanel.hidden = false;
      $('[data-admin-email]').textContent = session.email;

      if (mode === 'partner') {
        document.querySelector('.admin-head .side-title').textContent = '상담 예약 현황';
        document.querySelector('.admin-head .section-kicker').textContent = partnerName;
        document.querySelector('.admin-tabs').hidden = true;
        $('[data-search]').placeholder = '검색 (기업·담당자·연락처)';
        tab = 'reservations';
      }
      await loadData();
    }

    $('[data-login-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      $('[data-login-error]').textContent = '';
      const r = await login(e.target.elements.email.value.trim(), e.target.elements.password.value);
      btn.disabled = false;
      if (!r.ok) { $('[data-login-error]').textContent = r.message; return; }
      enter();
    });

    $('[data-logout]').addEventListener('click', () => logout());

    document.querySelectorAll('.admin-tabs button').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      document.querySelectorAll('.admin-tabs button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    }));

    $('[data-search]').addEventListener('input', render);
    $('[data-filter-company]').addEventListener('change', render);
    $('[data-filter-status]').addEventListener('change', render);
    $('[data-refresh]').addEventListener('click', loadData);
    $('[data-csv]').addEventListener('click', downloadCsv);

    $('[data-table-mount]').addEventListener('click', (e) => {
      const dl = e.target.closest('[data-download]');
      if (dl) { downloadAttachment(dl.dataset.download, dl.dataset.filename); return; }
      const cancel = e.target.closest('[data-cancel]');
      if (cancel) {
        cancelTarget = cancel.dataset.cancel;
        $('[data-cancel-target]').textContent = `${cancelTarget} — 취소하면 해당 시간대가 다시 열립니다.`;
        dialog.showModal();
      }
    });

    dialog.addEventListener('click', async (e) => {
      if (e.target.matches('[data-dialog-close]') || e.target === dialog) { dialog.close(); return; }
      if (e.target.matches('[data-confirm-cancel]') && cancelTarget) {
        e.target.disabled = true;
        const r = await rpc('jgcf_admin_cancel', { p_reservation_no: cancelTarget });
        e.target.disabled = false;
        dialog.close();
        if (!r.ok && r.reason !== 'expired') alert('취소하지 못했습니다: ' + (r.reason || '')); 
        await loadData();
      }
    });

    loadSession();
    if (session) enter(); else loginPanel.hidden = false;
  });
})();
