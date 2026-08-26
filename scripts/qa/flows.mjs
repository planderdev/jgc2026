/**
 * 기능 플로우 — 실제 Supabase를 호출한다.
 * 밋업 예약(생성→타 브라우저 마감 반영→같은 기관/같은 시간 중복 차단→조회→취소→재개방),
 * 참가신청(서버 번호 발급→완료 페이지→중복 차단), 마감 상태 UI(응답 가로채기).
 *
 * 테스트 데이터는 신청기업·이름에 __QA__ 표시를 남긴다. 이 표시를 보고 run.mjs가
 * 실행 끝에 예약·참가신청·첨부를 지운다(lib.mjs의 cleanupQa). 표시를 바꾸면
 * 테스트 데이터가 운영 DB에 그대로 남으니 함께 고쳐야 한다.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { baseUrl, newPage, QA_TAG, qaPhone, runSuite, stamp } from './lib.mjs';

export default () => runSuite('기능 플로우', async ({ browser, r }) => {
  const base = baseUrl();
  const pdf = path.join(os.tmpdir(), 'jgcf-qa-sample.pdf');
  await fs.writeFile(pdf, '%PDF-1.4\n%%EOF\n');
  const s = stamp();
  const phone = qaPhone(s);
  const email = `qa${s}@example.com`;

  // ── 밋업 예약
  const a = await newPage(browser);
  await a.page.goto(`${base}/meetup/reserve`, { waitUntil: 'load' }); await a.page.waitForTimeout(1200);
  await a.page.locator('[data-company-choices] input').first().check();
  await a.page.click('[data-step="1"] [data-step-action="next"]');
  await a.page.waitForSelector('[data-time-choices] input', { timeout: 15000 }); await a.page.waitForTimeout(400);
  r.check(await a.page.locator('[data-time-choices] input[value="12:00"]').isDisabled(), '점심시간 슬롯 비활성');
  const slotEl = a.page.locator('[data-time-choices] input:not([disabled])').first();
  const slot = await slotEl.getAttribute('value'); await slotEl.check();
  await a.page.click('[data-step="2"] [data-step-action="next"]'); await a.page.waitForTimeout(400);
  await a.page.fill('[name=applicantCompany]', `${QA_TAG} 자동검증`);
  await a.page.fill('[name=managerName]', '검증담당');
  await a.page.fill('[name=phone]', phone);
  await a.page.fill('[name=email]', 'not-an-email');
  await a.page.fill('[name=inquiry]', 'QA 자동 검증');
  await a.page.setInputFiles('[name=attachment]', pdf);
  await a.page.check('[name=privacy]');
  await a.page.click('[data-step="3"] [data-step-action="next"]'); await a.page.waitForTimeout(400);
  r.check(await a.page.locator('[data-step="3"]').evaluate((e) => e.classList.contains('is-active')), '잘못된 이메일 3단계에서 차단');
  await a.page.fill('[name=email]', email);
  await a.page.click('[data-step="3"] [data-step-action="next"]'); await a.page.waitForTimeout(400);
  await a.page.click('[data-step="4"] button[type=submit]');
  await a.page.waitForURL('**/meetup/complete**', { timeout: 25000 }).catch(() => {});
  await a.page.waitForTimeout(1000);
  const resNo = (await a.page.locator('[data-copy-source]').textContent().catch(() => '') || '').trim();
  r.check(/^JGCF-2026-[A-Z2-9]{6}$/.test(resNo), '예약 생성 + 서버 발급 난수 번호', resNo || a.page.url());
  await a.context.close();

  // 타 브라우저에서 마감 반영 + 중복 신청 차단
  const b = await newPage(browser);
  await b.page.goto(`${base}/meetup/reserve`, { waitUntil: 'load' }); await b.page.waitForTimeout(1000);
  await b.page.locator('[data-company-choices] input').first().check();
  await b.page.click('[data-step="1"] [data-step-action="next"]');
  await b.page.waitForSelector('[data-time-choices] input', { timeout: 15000 }); await b.page.waitForTimeout(400);
  r.check(await b.page.locator(`[data-time-choices] input[value="${slot}"]`).isDisabled(), '다른 브라우저에서도 슬롯 마감 반영', slot);
  // 같은 담당자가 같은 기관을 다른 시간에 다시 → company_duplicate
  await b.page.locator('[data-time-choices] input:not([disabled])').nth(3).check();
  await b.page.click('[data-step="2"] [data-step-action="next"]'); await b.page.waitForTimeout(400);
  await b.page.fill('[name=applicantCompany]', `${QA_TAG} 중복시도`);
  await b.page.fill('[name=managerName]', '검증담당');
  await b.page.fill('[name=phone]', phone);
  await b.page.fill('[name=email]', email);
  await b.page.fill('[name=inquiry]', 'QA 중복');
  await b.page.setInputFiles('[name=attachment]', pdf);
  await b.page.check('[name=privacy]');
  await b.page.click('[data-step="3"] [data-step-action="next"]'); await b.page.waitForTimeout(400);
  await b.page.click('[data-step="4"] button[type=submit]'); await b.page.waitForTimeout(3000);
  const t = await b.page.locator('.toast').textContent().catch(() => '');
  r.check(/이미 예약하셨습니다/.test(t || '') && !b.page.url().includes('complete'), '같은 담당자·같은 기관 중복 차단', (t || '').trim().slice(0, 40));
  await b.context.close();

  // 조회·취소 (또 다른 브라우저)
  const c = await newPage(browser);
  await c.page.goto(`${base}/meetup/confirm`, { waitUntil: 'load' }); await c.page.waitForTimeout(900);
  await c.page.fill('[name=reservationNumber]', resNo); await c.page.fill('[name=phone]', '010-0000-0000');
  await c.page.click('[data-lookup-form] button[type=submit]'); await c.page.waitForTimeout(2000);
  r.check(/일치하는 예약이 없/.test(await c.page.locator('[data-lookup-result]').innerText()), '연락처 불일치 조회 차단');
  await c.page.fill('[name=phone]', phone);
  await c.page.click('[data-lookup-form] button[type=submit]'); await c.page.waitForTimeout(2000);
  r.check(/예약 확정/.test(await c.page.locator('[data-lookup-result]').innerText()), '예약 조회 성공');
  await c.page.click('[data-open-cancel]'); await c.page.waitForTimeout(300);
  r.check(await c.page.locator('[data-cancel-dialog]').evaluate((d) => d.open === true && d.contains(document.activeElement)), '취소 다이얼로그 열림 + 포커스 진입');
  await c.page.click('[data-confirm-cancel]'); await c.page.waitForTimeout(2000);
  r.check(/예약 취소/.test(await c.page.locator('[data-lookup-result]').innerText()), '예약 취소 반영');
  await c.context.close();

  const d = await newPage(browser);
  await d.page.goto(`${base}/meetup/reserve`, { waitUntil: 'load' }); await d.page.waitForTimeout(1000);
  await d.page.locator('[data-company-choices] input').first().check();
  await d.page.click('[data-step="1"] [data-step-action="next"]');
  await d.page.waitForSelector('[data-time-choices] input', { timeout: 15000 }); await d.page.waitForTimeout(400);
  r.check(await d.page.locator(`[data-time-choices] input[value="${slot}"]`).isEnabled(), '취소 후 슬롯 재개방', slot);
  await d.context.close();

  // ── 참가신청
  const e = await newPage(browser);
  await e.page.goto(`${base}/register`, { waitUntil: 'load' }); await e.page.waitForTimeout(900);
  await e.page.locator('[data-event-type-option][value=general]').check(); await e.page.waitForTimeout(300);
  await e.page.fill('[name=generalName]', `${QA_TAG} 자동검증`);
  await e.page.fill('[name=phone]', qaPhone(stamp()));
  await e.page.check('[data-event-register-form] [name=privacy]');
  await e.page.click('[data-event-register-form] button[type=submit]');
  await e.page.waitForURL('**/register-complete**', { timeout: 15000 }).catch(() => {});
  await e.page.waitForTimeout(900);
  const regNo = (await e.page.locator('[data-copy-source]').textContent().catch(() => '') || '').trim();
  r.check(/^JGCF-ATTEND-[A-Z2-9]{6}$/.test(regNo), '참가신청 서버 저장 + 완료 페이지', regNo || e.page.url());
  const body = await e.page.locator('[data-register-complete-result]').innerText().catch(() => '');
  r.check(!/홍길동/.test(body), '완료 페이지에 예시 데이터 없음');
  await e.context.close();

  // ── 마감 상태 UI (서버 응답 가로채기 — 실제 마감 시각과 무관하게 검증)
  const closed = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await closed.route(/rpc\/jgcf_(reservation|registration)_open/, (q) => q.fulfill({ status: 200, contentType: 'application/json', body: 'false' }));
  const f = await closed.newPage();
  await f.goto(`${base}/meetup/reserve`, { waitUntil: 'load' }); await f.waitForTimeout(1200);
  r.check(await f.locator('[data-reserve-form]').isHidden() && /접수가 마감/.test(await f.locator('.result-card:visible').first().innerText().catch(() => '')), '마감 시 예약 페이지 안내 카드');
  await f.goto(`${base}/register`, { waitUntil: 'load' }); await f.waitForTimeout(1200);
  r.check(await f.locator('[data-event-register-form]').isHidden(), '마감 시 참가신청 폼 숨김');
  await closed.close();
});
