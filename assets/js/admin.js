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
  let tab = 'overview';
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
        .filter((r) => !status
          || (status === 'attended' ? !!r.attended_at
            : status === 'absent' ? (r.status === 'confirmed' && !r.attended_at)
            : r.status === status))
        .filter((r) => match(r, ['reservation_no', 'applicant_company', 'manager_name', 'phone', 'email', 'company_name']));
    }
    if (tab === 'registrations') {
      return registrations
        .filter((r) => !status
          || (status === 'attended' ? !!r.attended_at
            : status === 'absent' ? (r.status === 'confirmed' && !r.attended_at)
            : r.status === status))
        .filter((r) => match(r, ['registration_no', 'name', 'organization', 'phone', 'email']));
    }
    if (tab === 'overview') return [overview()];
    // summary — data.js의 상담기관 전체를 기준으로 예약이 없는 기관도 0건으로 보여준다
    const map = new Map();
    for (const c of (window.JGCF?.companies || [])) {
      map.set(c.name, { company_id: c.id, company_name: c.name, confirmed: 0, cancelled: 0, slots: [], by: {} });
    }
    for (const r of reservations) {
      const s = map.get(r.company_name) || { company_id: r.company_id, company_name: r.company_name, confirmed: 0, cancelled: 0, slots: [], by: {} };
      if (r.status === 'confirmed') { s.confirmed += 1; s.slots.push(r.time_slot); s.by[r.time_slot] = r.applicant_company; } else s.cancelled += 1;
      map.set(r.company_name, s);
    }
    return [...map.values()].sort((a, b) => b.confirmed - a.confirmed || a.company_name.localeCompare(b.company_name, 'ko'));
  }

  // ── 현황 집계 ─────────────────────────────────────────
  const BOOKABLE = () => {
    const times = window.JGCF?.reservationTimes || [];
    const breaks = window.JGCF?.reservationBreaks || {};
    return times.filter((t) => !breaks[t]);
  };
  // 마감 시각. 서버의 jgcf_reservation_cutoff()와 같은 값이며 화면 D-day 표시용이다.
  const MEETUP_CUTOFF = new Date('2026-09-16T00:00:00+09:00');

  function kstDay(input) {
    return new Date(input).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD
  }

  function overview() {
    const companies = window.JGCF?.companies || [];
    const slots = BOOKABLE();
    const capacity = companies.length * slots.length;
    const confirmed = reservations.filter((r) => r.status === 'confirmed');
    const cancelled = reservations.length - confirmed.length;
    const confirmedRegistrations = registrations.filter((r) => r.status !== 'cancelled');
    const cancelledRegistrations = registrations.length - confirmedRegistrations.length;
    const byType = { company: 0, general: 0, student: 0 };
    confirmedRegistrations.forEach((r) => { byType[r.participant_type] = (byType[r.participant_type] || 0) + 1; });

    const today = kstDay(Date.now());
    const newToday = reservations.filter((r) => kstDay(r.created_at) === today).length
      + registrations.filter((r) => kstDay(r.created_at) === today).length;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = kstDay(Date.now() - i * 86400000);
      days.push({ key, label: key.slice(5).replace('-', '/'),
        n: reservations.filter((r) => kstDay(r.created_at) === key).length + registrations.filter((r) => kstDay(r.created_at) === key).length });
    }

    const slotLoad = slots.map((t) => ({ t, n: confirmed.filter((r) => r.time_slot === t).length }));
    const msLeft = MEETUP_CUTOFF - Date.now();

    const attendedMeetup = confirmed.filter((r) => r.attended_at).length;
    const attendedEvent = confirmedRegistrations.filter((r) => r.attended_at).length;

    return { capacity, confirmed: confirmed.length, cancelled, rate: capacity ? confirmed.length / capacity : 0,
      attendedMeetup, attendedEvent,
      registrations: confirmedRegistrations.length, cancelledRegistrations, byType, newToday, days, slotLoad, companies: companies.length,
      dday: Math.ceil(msLeft / 86400000), closed: msLeft <= 0,
      emptyCompanies: companies.filter((c) => !confirmed.some((r) => r.company_id === c.id)).length };
  }

  const TYPE_LABEL = { company: '기업', general: '일반', student: '학생' };

  /** 출석 토글 버튼. 눌린 상태는 초록, 시각은 툴팁으로. */
  function attendButton(kind, no, attendedAt) {
    const on = !!attendedAt;
    return `<button class="admin-mini attend ${on ? 'on' : ''}" data-attend="${esc(no)}" data-kind="${kind}" data-on="${on ? 1 : 0}"
      title="${on ? '출석 ' + kst(attendedAt) + ' · 누르면 해제' : '누르면 출석 처리'}">${on ? '출석 ✓' : '출석'}</button>`;
  }
  function attendBadge(attendedAt) {
    return attendedAt ? `<span class="admin-badge ok" title="${kst(attendedAt)}">출석</span>` : '<span class="admin-badge off" style="background:var(--color-bg-muted);color:var(--color-text-muted)">미도착</span>';
  }

  function renderOverview(o) {
    const pct = (n) => `${Math.round(n * 100)}%`;
    const maxDay = Math.max(1, ...o.days.map((d) => d.n));
    const maxSlot = Math.max(1, o.companies);
    return `
      <div class="ov-tiles">
        <div class="ov-tile"><small>밋업 예약률</small><strong>${pct(o.rate)}<em>${o.confirmed} / ${o.capacity}</em></strong><p>확정 ${o.confirmed}건 · 취소 ${o.cancelled}건</p></div>
        <div class="ov-tile"><small>행사 참가신청</small><strong>${o.registrations}<em>명</em></strong><p>기업 ${o.byType.company} · 일반 ${o.byType.general} · 학생 ${o.byType.student} · 취소 ${o.cancelledRegistrations}</p></div>
        <div class="ov-tile"><small>오늘 신규</small><strong>${o.newToday}<em>건</em></strong><p>예약 + 참가신청 (KST 기준)</p></div>
        <div class="ov-tile ${o.closed ? '' : 'warn'}"><small>밋업 예약 마감</small><strong>${o.closed ? '마감' : `D-${o.dday}`}</strong><p>9/15(화) 자정 · ${o.closed ? '접수 종료됨' : '이후엔 사무국 대신 취소만'}</p></div>
        <div class="ov-tile"><small>행사 당일 출석</small><strong>${o.attendedMeetup + o.attendedEvent}<em>명</em></strong><p>밋업 ${o.attendedMeetup}/${o.confirmed} · 참가 ${o.attendedEvent}/${o.registrations}</p></div>
        <div class="ov-tile"><small>예약 없는 기관</small><strong>${o.emptyCompanies}<em>/ ${o.companies}</em></strong><p>확정 예약이 0건인 상담기관</p></div>
      </div>
      <div class="ov-grid">
        <div class="ov-card">
          <h3>시간대별 점유 (확정 기관 수)</h3>
          <div class="ov-rows">${o.slotLoad.map((s) => `
            <div class="ov-row"><span>${esc(s.t)}</span><span class="bar"><i style="width:${(s.n / maxSlot) * 100}%"></i></span><span class="num">${s.n} / ${o.companies}</span></div>`).join('')}
          </div>
          <p class="ov-note">붐비는 시간대는 막대가 길게, 비어 있는 시간대는 짧게 보입니다.</p>
        </div>
        <div class="ov-card">
          <h3>최근 7일 신규 접수</h3>
          <div class="ov-days">${o.days.map((d) => `
            <div class="ov-day"><b>${d.n}</b><i style="height:${Math.max(2, (d.n / maxDay) * 64)}px"></i><span>${esc(d.label)}</span></div>`).join('')}
          </div>
          <p class="ov-note">예약과 참가신청을 합한 일별 건수입니다. 숫자는 새로고침으로 갱신됩니다.</p>
        </div>
      </div>`;
  }

  function renderSummary(rows) {
    const slots = BOOKABLE();
    const allTimes = window.JGCF?.reservationTimes || slots;
    const breaks = window.JGCF?.reservationBreaks || {};
    const rate = (n) => (slots.length ? Math.round((n / slots.length) * 100) : 0);
    const table = `<table class="admin-table"><thead><tr>
      <th>상담기관</th><th>예약률</th><th>확정</th><th>취소</th><th>확정 시간대</th>
    </tr></thead><tbody>${rows.map((s) => `<tr>
      <td><strong>${esc(s.company_name)}</strong></td>
      <td><span class="sum-rate"><span class="bar"><i style="width:${rate(s.confirmed)}%"></i></span><span>${rate(s.confirmed)}%</span></span></td>
      <td>${s.confirmed}</td><td>${s.cancelled}</td>
      <td class="wrap">${s.slots.length ? esc([...s.slots].sort().join(', ')) : '<span style="color:var(--color-neutral-400)">없음</span>'}</td>
    </tr>`).join('')}</tbody></table>`;

    const grid = `<div class="slot-wrap">
      <h3>시간대 점유 격자</h3>
      <p>가로는 시간, 세로는 상담기관입니다. 칸에 마우스를 올리면 신청 기업이 보입니다.</p>
      <div class="slot-grid" style="--slots:${allTimes.length}">
        <div></div>${allTimes.map((t) => `<div class="hd">${esc(t)}</div>`).join('')}
        ${rows.map((s) => `<div class="lbl" title="${esc(s.company_name)}">${esc(s.company_name)}</div>${allTimes.map((t) =>
          breaks[t] ? `<div class="c brk" title="${esc(t)} ${esc(breaks[t])}"></div>`
          : `<div class="c ${s.by[t] ? 'on' : ''}" title="${esc(t)}${s.by[t] ? ' · ' + esc(s.by[t]) : ' · 비어 있음'}"></div>`).join('')}`).join('')}
      </div>
      <div class="slot-legend"><span class="on">확정</span><span>비어 있음</span><span class="brk">점심시간</span></div>
    </div>`;
    return table + grid;
  }

  // 좁은 화면(접수 데스크의 태블릿·폰)에서는 14열짜리 표 대신 카드로 보여준다.
  // 출석 버튼과 연락처가 가로 스크롤 없이 바로 보이는 게 목적이다.
  const narrow = window.matchMedia('(max-width: 900px)');

  function telLink(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits ? `<a href="tel:${digits}">${esc(phone)}</a>` : esc(phone);
  }

  let renderCards = function (rows) {
    if (mode === 'partner') {
      return `<div class="admin-cards">${rows.map((r) => `<article class="admin-card">
        <header><strong>${esc(r.time_slot)}</strong>${attendBadge(r.attended_at)}</header>
        <h4>${esc(r.applicant_company)}</h4>
        <p>${esc(r.manager_name)} · ${telLink(r.phone)}</p>
        <p class="muted">${esc(r.email)}</p>
        <p class="inquiry">${esc(r.inquiry)}</p>
        ${r.attachment_path ? `<footer><button class="admin-mini" data-download="${esc(r.attachment_path)}" data-filename="${esc(r.attachment_name || 'file.pdf')}">소개서 PDF</button></footer>` : ''}
      </article>`).join('')}</div>`;
    }
    if (tab === 'reservations') {
      return `<div class="admin-cards">${rows.map((r) => `<article class="admin-card ${r.status === 'confirmed' ? '' : 'is-off'}">
        <header><strong>${esc(r.time_slot)}</strong><span class="admin-badge ${r.status === 'confirmed' ? 'ok' : 'off'}">${r.status === 'confirmed' ? '확정' : '취소'}</span>
          ${r.status === 'confirmed' ? attendButton('reservation', r.reservation_no, r.attended_at) : ''}</header>
        <h4>${esc(r.applicant_company)} <small>→ ${esc(r.company_name)}</small></h4>
        <p>${esc(r.manager_name)} · ${telLink(r.phone)}</p>
        <p class="muted">${esc(r.reservation_no)} · ${esc(r.email)}</p>
        <p class="inquiry">${esc(r.inquiry)}</p>
        <footer>
          ${r.attachment_path ? `<button class="admin-mini" data-download="${esc(r.attachment_path)}" data-filename="${esc(r.attachment_name || 'file.pdf')}">소개서 PDF</button>` : ''}
          ${r.status === 'confirmed' ? `<button class="admin-mini" data-cancel="${esc(r.reservation_no)}">취소</button>` : ''}
        </footer>
      </article>`).join('')}</div>`;
    }
    if (tab === 'registrations') {
      return `<div class="admin-cards">${rows.map((r) => `<article class="admin-card ${r.status === 'confirmed' ? '' : 'is-off'}">
        <header><strong>${esc(TYPE_LABEL[r.participant_type] || r.participant_type)}</strong><span class="admin-badge ${r.status === 'confirmed' ? 'ok' : 'off'}">${r.status === 'confirmed' ? '확정' : '취소'}</span>
          ${r.status === 'confirmed' ? attendButton('registration', r.registration_no, r.attended_at) : ''}</header>
        <h4>${esc(r.name)}${r.organization ? ` <small>${esc(r.organization)}</small>` : ''}</h4>
        <p>${telLink(r.phone)}${r.email ? ` · ${esc(r.email)}` : ''}</p>
        <p class="muted">${esc(r.registration_no)} · ${kst(r.created_at)}</p>
        <footer>${r.status === 'confirmed' ? `<button class="admin-mini" data-cancel-registration="${esc(r.registration_no)}">취소</button>` : ''}</footer>
      </article>`).join('')}</div>`;
    }
    return null;
  };

  function render() {
    const rows = currentRows();
    $('[data-count]').textContent = tab === 'overview' ? '' : `${rows.length}건`;
    $('[data-search]').hidden = mode !== 'partner' && tab === 'overview';
    $('[data-csv]').hidden = mode !== 'partner' && tab === 'overview';
    $('[data-filter-company]').hidden = mode === 'partner' || tab !== 'reservations';
    $('[data-filter-status]').hidden = mode === 'partner' || !['reservations', 'registrations'].includes(tab);
    const mount = $('[data-table-mount]');

    if (tab === 'overview' && mode !== 'partner') { mount.innerHTML = renderOverview(rows[0]); return; }
    if (!rows.length) { mount.innerHTML = '<p class="admin-empty">표시할 항목이 없습니다.</p>'; return; }

    if (narrow.matches) {
      const cards = renderCards(rows);
      if (cards) { mount.innerHTML = cards; return; }
    }

    if (mode === 'partner') {
      // 취소·상태 열이 없다. 파트너에게 오는 것은 전부 확정 건이고,
      // 취소 권한은 사무국과 신청자에게만 있다.
      mount.innerHTML = `<table class="admin-table"><thead><tr>
        <th>시간</th><th>출석</th><th>신청기업</th><th>담당자</th><th>연락처</th><th>메일</th><th>상담내용</th><th>소개서</th><th>신청일시</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td><strong>${esc(r.time_slot)}</strong></td>
        <td>${attendBadge(r.attended_at)}</td>
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
        <th>연락처</th><th>메일</th><th>상담내용</th><th>첨부</th><th>신청일시</th><th>출석</th><th></th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.reservation_no)}</td>
        <td><span class="admin-badge ${r.status === 'confirmed' ? 'ok' : 'off'}">${r.status === 'confirmed' ? '확정' : '취소'}</span></td>
        <td>${esc(r.company_name)}</td><td>${esc(r.time_slot)}</td>
        <td>${esc(r.applicant_company)}</td><td>${esc(r.manager_name)}</td>
        <td>${esc(r.phone)}</td><td>${esc(r.email)}</td>
        <td class="wrap">${esc(r.inquiry)}</td>
        <td>${r.attachment_path ? `<button class="admin-mini" data-download="${esc(r.attachment_path)}" data-filename="${esc(r.attachment_name || 'file.pdf')}">PDF</button>` : '-'}</td>
        <td>${kst(r.created_at)}</td>
        <td>${r.status === 'confirmed' ? attendButton('reservation', r.reservation_no, r.attended_at) : ''}</td>
        <td>${r.status === 'confirmed' ? `<button class="admin-mini" data-cancel="${esc(r.reservation_no)}">취소</button>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
      return;
    }

    if (tab === 'registrations') {
      mount.innerHTML = `<table class="admin-table"><thead><tr>
        <th>신청번호</th><th>상태</th><th>구분</th><th>이름</th><th>소속</th><th>연락처</th><th>메일</th><th>신청일시</th><th>취소일시</th><th>출석</th><th></th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(r.registration_no)}</td>
        <td><span class="admin-badge ${r.status === 'confirmed' ? 'ok' : 'off'}">${r.status === 'confirmed' ? '확정' : '취소'}</span></td>
        <td>${esc(TYPE_LABEL[r.participant_type] || r.participant_type)}</td>
        <td>${esc(r.name)}</td><td>${esc(r.organization || '-')}</td>
        <td>${esc(r.phone)}</td><td>${esc(r.email || '-')}</td><td>${kst(r.created_at)}</td><td>${kst(r.cancelled_at)}</td>
        <td>${r.status === 'confirmed' ? attendButton('registration', r.registration_no, r.attended_at) : ''}</td>
        <td>${r.status === 'confirmed' ? `<button class="admin-mini" data-cancel-registration="${esc(r.registration_no)}">취소</button>` : ''}</td>
      </tr>`).join('')}</tbody></table>`;
      return;
    }

    mount.innerHTML = renderSummary(rows);
  }

  // ── CSV ─────────────────────────────────────────────────
  function downloadCsv() {
    const rows = currentRows();
    let header, line;
    if (mode === 'partner') {
      header = ['시간','출석','신청기업','담당자','연락처','메일','상담내용','소개서','신청일시'];
      line = (r) => [r.time_slot, r.attended_at ? '출석' : '', r.applicant_company, r.manager_name, r.phone, r.email, r.inquiry, r.attachment_name || '', kst(r.created_at)];
    } else if (tab === 'reservations') {
      header = ['예약번호','상태','상담기관','시간','신청기업','담당자','연락처','메일','상담내용','첨부파일','신청일시','취소일시','출석','출석시각'];
      line = (r) => [r.reservation_no, r.status === 'confirmed' ? '확정' : '취소', r.company_name, r.time_slot,
        r.applicant_company, r.manager_name, r.phone, r.email, r.inquiry, r.attachment_name || '', kst(r.created_at), kst(r.cancelled_at),
        r.attended_at ? '출석' : '', kst(r.attended_at)];
    } else if (tab === 'registrations') {
      header = ['신청번호','상태','구분','이름','소속','연락처','메일','신청일시','취소일시','출석','출석시각'];
      line = (r) => [r.registration_no, r.status === 'confirmed' ? '확정' : '취소', TYPE_LABEL[r.participant_type] || r.participant_type,
        r.name, r.organization || '', r.phone, r.email || '', kst(r.created_at), kst(r.cancelled_at),
        r.attended_at ? '출석' : '', kst(r.attended_at)];
    } else {
      header = ['상담기관','예약률','확정','취소','확정 시간대'];
      line = (s) => [s.company_name, `${Math.round((s.confirmed / Math.max(1, BOOKABLE().length)) * 100)}%`, s.confirmed, s.cancelled, [...s.slots].sort().join(' ')];
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
    let cancelKind = 'reservation';

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
      applyQrQuery();
    }

    // 완료 화면 QR을 폰 카메라로 찍으면 /admin?q=번호 로 들어온다.
    // 로그인 뒤 그 번호로 검색해 해당 행만 보여준다. 파트너 계정은 자기 목록 안에서 검색.
    function applyQrQuery() {
      const q = new URLSearchParams(window.location.search).get('q');
      if (!q) return;
      const no = q.trim().toUpperCase();
      if (mode !== 'partner') {
        tab = /^JGCF-ATTEND-/.test(no) ? 'registrations' : 'reservations';
        document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
      }
      $('[data-search]').value = no;
      render();
      window.history.replaceState(null, '', window.location.pathname);
      const hit = document.querySelector('[data-attend]');
      if (hit) { hit.scrollIntoView({ block: 'center' }); hit.focus(); }
      else common().toast(`${no} 에 해당하는 항목이 없습니다.`);
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
    narrow.addEventListener('change', () => { if (session) render(); });
    $('[data-csv]').addEventListener('click', downloadCsv);
    $('[data-print]').addEventListener('click', () => {
      // 인쇄 머리글: 무엇을, 언제, 몇 건. 좁은 화면에서는 카드 대신 표를 찍도록 한 번 다시 그린다.
      const titles = { overview: '현황', reservations: '비즈니스 밋업 예약 명단', registrations: '행사 참가신청 명단', summary: '상담기관별 현황' };
      const title = mode === 'partner' ? `${partnerName} 상담 일정` : titles[tab];
      const rows = currentRows();
      $('[data-print-head]').innerHTML = `<h2>JGCF 2026 · ${esc(title)}</h2><span>${rows.length}건 · 2026. 9. 16. (수) · 출력 ${kst(new Date().toISOString())}</span>`;
      const wasNarrow = narrow.matches;
      if (wasNarrow) { const m = $('[data-table-mount]'); m.innerHTML = ''; const keep = renderCards; renderCards = () => null; render(); renderCards = keep; }
      window.print();
      if (wasNarrow) render();
    });

    $('[data-table-mount]').addEventListener('click', (e) => {
      const dl = e.target.closest('[data-download]');
      if (dl) { downloadAttachment(dl.dataset.download, dl.dataset.filename); return; }
      const attend = e.target.closest('[data-attend]');
      if (attend) {
        const next = attend.dataset.on !== '1';
        attend.disabled = true;
        rpc('jgcf_admin_set_attendance', { p_kind: attend.dataset.kind, p_no: attend.dataset.attend, p_attended: next })
          .then((r) => {
            if (!r.ok) { alert('출석 처리하지 못했습니다: ' + (r.reason || '')); return; }
            const list = attend.dataset.kind === 'reservation' ? reservations : registrations;
            const key = attend.dataset.kind === 'reservation' ? 'reservation_no' : 'registration_no';
            const row = list.find((x) => x[key] === attend.dataset.attend);
            if (row) row.attended_at = r.attended_at;
            render();
          })
          .finally(() => { attend.disabled = false; });
        return;
      }
      const cancel = e.target.closest('[data-cancel]');
      if (cancel) {
        cancelTarget = cancel.dataset.cancel;
        cancelKind = 'reservation';
        $('#admin-cancel-title').textContent = '이 예약을 취소할까요?';
        $('[data-cancel-target]').textContent = `${cancelTarget} — 취소하면 해당 시간대가 다시 열립니다.`;
        dialog.showModal();
        return;
      }
      const cancelRegistration = e.target.closest('[data-cancel-registration]');
      if (cancelRegistration) {
        cancelTarget = cancelRegistration.dataset.cancelRegistration;
        cancelKind = 'registration';
        $('#admin-cancel-title').textContent = '이 참가신청을 취소할까요?';
        $('[data-cancel-target]').textContent = `${cancelTarget} — 취소하면 현장 체크인 명단에서 제외됩니다.`;
        dialog.showModal();
      }
    });

    dialog.addEventListener('click', async (e) => {
      if (e.target.matches('[data-dialog-close]') || e.target === dialog) { dialog.close(); return; }
      if (e.target.matches('[data-confirm-cancel]') && cancelTarget) {
        e.target.disabled = true;
        const r = cancelKind === 'registration'
          ? await rpc('jgcf_admin_cancel_registration', { p_registration_no: cancelTarget })
          : await rpc('jgcf_admin_cancel', { p_reservation_no: cancelTarget });
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
