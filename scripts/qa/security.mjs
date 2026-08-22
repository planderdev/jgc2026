/**
 * 보안 경계 — 브라우저 공개 키로 직접 공격해 본다. 브라우저 없이 fetch만 쓴다.
 * 테이블 직접 조회 → [], 건수 노출 없음, 수정·삭제 거부, 관리자 뷰 거부,
 * 첨부 버킷 목록·공개 접근 거부, PDF 아닌 파일 업로드 거부.
 * 관리자/파트너 자격증명이 환경변수에 있으면 권한 경계까지 본다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { reporter, root } from './lib.mjs';

function readConfig() {
  const src = fs.readFileSync(path.join(root, 'assets/js/supabaseConfig.js'), 'utf8');
  const url = src.match(/url:\s*'([^']+)'/)[1];
  const key = src.match(/publishableKey:\s*'([^']+)'/)[1];
  const bucket = src.match(/attachmentBucket:\s*'([^']+)'/)[1];
  return { url, key, bucket };
}

export default async () => {
  const r = reporter('보안 경계');
  const { url, key, bucket } = readConfig();
  const H = (token = key, extra = {}) => ({ apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra });
  const get = (p, token) => fetch(`${url}${p}`, { headers: H(token) });
  const rpc = (name, body, token) => fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: H(token), body: JSON.stringify(body || {}) }).then((x) => x.json());

  try {
    const rows = await (await get('/rest/v1/reservations?select=*')).json();
    r.check(Array.isArray(rows) && rows.length === 0, '공개 키로 reservations 직접 조회 → 빈 결과');
    const cntRes = await fetch(`${url}/rest/v1/reservations?select=*`, { headers: H(key, { Prefer: 'count=exact' }) });
    r.check(/\*\/0$/.test(cntRes.headers.get('content-range') || ''), '건수(count)도 노출되지 않음', cntRes.headers.get('content-range') || '');
    const upd = await fetch(`${url}/rest/v1/reservations?reservation_no=eq.X`, { method: 'PATCH', headers: H(), body: '{"status":"cancelled"}' });
    const del = await fetch(`${url}/rest/v1/reservations?reservation_no=eq.X`, { method: 'DELETE', headers: H() });
    r.check(upd.status >= 400 || (await upd.text()) === '', '직접 UPDATE 거부');
    r.check(del.status >= 400 || (await del.text()) === '', '직접 DELETE 거부');
    const view = await (await get('/rest/v1/admin_reservations?select=*')).json();
    r.check(!Array.isArray(view) && /permission denied/.test(view.message || ''), '관리자 뷰 접근 거부');
    // 익명은 실행 권한 자체가 없어 401(permission denied)로 막힌다.
    // forbidden JSON은 로그인했지만 명단에 없는 계정에게 돌아가는 응답이다.
    const adminFn = await rpc('jgcf_admin_reservations');
    r.check(/permission denied/.test(adminFn.message || '') || adminFn.reason === 'forbidden', '익명의 관리자 함수 호출 거부', adminFn.message || adminFn.reason || '');
    const badSlot = await rpc('jgcf_create_reservation', { p_company_id: 'kb-investment', p_company_name: 'x', p_company_field: 'x', p_time_slot: '10:15', p_applicant_company: '__QA__', p_manager_name: '__QA__', p_phone: '010-9999-9999', p_email: 'qa-slot@example.com', p_inquiry: '__QA__' });
    r.check(badSlot.reason === 'invalid_slot', '목록 밖 시간(10:15) 예약 서버 거부', badSlot.reason || '');
    const attendFn = await rpc('jgcf_admin_set_attendance', { p_kind: 'reservation', p_no: 'JGCF-2026-XXXXXX', p_attended: true });
    r.check(/permission denied/.test(attendFn.message || '') || attendFn.reason === 'forbidden', '익명의 출석 처리 호출 거부', attendFn.message || attendFn.reason || '');
    const list = await fetch(`${url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: H(), body: '{"prefix":""}' }).then((x) => x.json());
    r.check(Array.isArray(list) && list.length === 0, '첨부 버킷 목록 조회 → 빈 결과');
    const pub = await fetch(`${url}/storage/v1/object/public/${bucket}/`);
    r.check(pub.status >= 400, '첨부 버킷 공개 URL 접근 거부', String(pub.status));
    const evil = await fetch(`${url}/storage/v1/object/${bucket}/qa/x.html`, { method: 'POST', headers: H(key, { 'Content-Type': 'text/html' }), body: '<script>1</script>' }).then((x) => x.json());
    r.check(/mime/i.test(evil.error || evil.message || ''), 'PDF 아닌 파일 업로드 거부');

    // 권한 경계 (자격증명이 있을 때만)
    const login = async (email, password) => {
      const t = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: H(), body: JSON.stringify({ email, password }) }).then((x) => x.json());
      return t.access_token || null;
    };
    const pe = process.env.QA_PARTNER_EMAIL, pp = process.env.QA_PARTNER_PASSWORD;
    if (pe && pp) {
      const tok = await login(pe, pp);
      r.check(!!tok, '파트너 계정 로그인');
      if (tok) {
        const who = await rpc('jgcf_whoami', {}, tok);
        r.check(who.role === 'partner', '파트너 역할 판별', who.company_id || '');
        const mine = await rpc('jgcf_partner_reservations', {}, tok);
        r.check(mine.ok === true && Array.isArray(mine.rows), '파트너 자기 기관 예약 조회', `${mine.rows?.length ?? '?'}건`);
        const adm = await rpc('jgcf_admin_reservations', {}, tok);
        r.check(adm.reason === 'forbidden', '파트너의 관리자 함수 호출 → forbidden');
        const tbl = await (await get('/rest/v1/reservations?select=*', tok)).json();
        r.check(Array.isArray(tbl) && tbl.length === 0, '파트너 토큰으로 테이블 직접 조회 → 빈 결과');
      }
    } else {
      r.note('파트너 권한 경계 검사 생략', 'QA_PARTNER_EMAIL / QA_PARTNER_PASSWORD 를 설정하면 실행');
    }
    const ae = process.env.QA_ADMIN_EMAIL, ap = process.env.QA_ADMIN_PASSWORD;
    if (ae && ap) {
      const tok = await login(ae, ap);
      const who = tok ? await rpc('jgcf_whoami', {}, tok) : {};
      r.check(who.role === 'admin', '관리자 계정 로그인 + 역할 판별');
    } else {
      r.note('관리자 로그인 검사 생략', 'QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD 를 설정하면 실행');
    }
  } catch (error) {
    r.fail('보안 경계 중단', String(error.message));
  }
  return r.print();
};
