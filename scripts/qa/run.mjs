/**
 * QA 실행기.
 *   npm run qa                       로컬 파일을 cleanUrls 방식으로 띄워 전체 실행
 *   npm run qa -- --base=https://…   배포된 사이트를 대상으로 실행
 *   npm run qa -- --only=render,ui   일부 스위트만
 * 하나라도 FAIL이면 종료 코드 1.
 */
import { baseUrl, isLive, startStaticServer } from './lib.mjs';
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
const results = {};
for (const name of only) {
  if (!SUITES[name]) { console.log(`알 수 없는 스위트: ${name}`); continue; }
  results[name] = await SUITES[name]();
}
server?.close();

const failed = Object.entries(results).filter(([, ok]) => !ok).map(([n]) => n);
console.log(`\n${'─'.repeat(48)}\n${failed.length ? `✗ FAIL: ${failed.join(', ')}` : '✓ 전체 통과'}  (${Math.round((Date.now() - started) / 1000)}s)`);
process.exit(failed.length ? 1 : 0);
