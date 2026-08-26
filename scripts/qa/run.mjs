/**
 * QA 실행기.
 *   npm run qa                       로컬 파일을 cleanUrls 방식으로 띄워 전체 실행
 *   npm run qa -- --base=https://…   배포된 사이트를 대상으로 실행
 *   npm run qa -- --only=render,ui   일부 스위트만
 *   npm run qa -- --keep             테스트 데이터를 지우지 않고 남긴다
 * 하나라도 FAIL이면 종료 코드 1.
 *
 * QA는 운영 Supabase를 그대로 쓴다. 그래서 실행이 끝나면 스위트가 만든 테스트
 * 예약·참가신청·첨부를 스스로 지우고, 남은 게 없는지 다시 확인한다.
 */
import { baseUrl, cleanupQa, isLive, startStaticServer } from './lib.mjs';
import render from './render.mjs';
import ui from './ui.mjs';
import flows from './flows.mjs';
import security from './security.mjs';

const SUITES = { render, ui, flows, security };
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',') : Object.keys(SUITES);

let server = null;
if (!isLive()) {
  server = await startStaticServer(4199);
  console.log(`로컬 서버: ${server.url} (cleanUrls 에뮬레이션)`);
} else {
  console.log(`대상: ${baseUrl()}`);
}

const started = Date.now();
const startedIso = new Date().toISOString();
const results = {};
for (const name of only) {
  if (!SUITES[name]) { console.log(`알 수 없는 스위트: ${name}`); continue; }
  results[name] = await SUITES[name]();
}
server?.close();

// 뒷정리 — 이 실행이 만든 테스트 데이터를 지운다.
let cleanupFailed = false;
if (!process.argv.includes('--keep')) {
  const c = await cleanupQa({ since: startedIso });
  if (c.skipped) {
    console.log(`\n■ 뒷정리  —  건너뜀: ${c.skipped}`);
  } else if (c.remaining > 0) {
    cleanupFailed = true;
    console.log(`\n■ 뒷정리  —  ✗ 테스트 데이터가 ${c.remaining}건 남았습니다. 운영 DB를 확인하세요.`);
  } else {
    console.log(`\n■ 뒷정리  —  ✓ 예약 ${c.reservations} · 참가신청 ${c.registrations} · 첨부 ${c.files} 삭제, 잔여 0`);
  }
}

const failed = Object.entries(results).filter(([, ok]) => !ok).map(([n]) => n);
const bad = failed.length || cleanupFailed;
console.log(`\n${'─'.repeat(48)}\n${bad ? `✗ FAIL: ${[...failed, ...(cleanupFailed ? ['뒷정리'] : [])].join(', ')}` : '✓ 전체 통과'}  (${Math.round((Date.now() - started) / 1000)}s)`);
process.exit(bad ? 1 : 0);
