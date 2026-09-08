/**
 * 아카이브 그리드용 축소본 생성 (macOS sips 사용).
 *
 * 원본(assets/images/archive/<연도>/)은 라이트박스에서 그대로 쓰고,
 * 그리드는 여기서 만든 assets/images/archive/thumbs/<연도>/ 를 쓴다.
 * 원본이 바뀌면 다시 실행한다: node scripts/build-archive-thumbs.mjs
 *
 * 긴 변 800px(3열 그리드 셀 ~420px의 레티나 2배), JPEG 품질 72.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'assets', 'images', 'archive');
const outRoot = path.join(srcRoot, 'thumbs');

let made = 0;
let skipped = 0;
for (const year of fs.readdirSync(srcRoot)) {
  const srcDir = path.join(srcRoot, year);
  if (year === 'thumbs' || !fs.statSync(srcDir).isDirectory()) continue;
  const outDir = path.join(outRoot, year);
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const src = path.join(srcDir, file);
    const out = path.join(outDir, file.replace(/\.(png|webp)$/i, '.jpg'));
    // 원본이 더 새로울 때만 다시 만든다
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) { skipped += 1; continue; }
    execFileSync('sips', ['-Z', '800', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', src, '--out', out], { stdio: 'pipe' });
    made += 1;
  }
}
console.log(`축소본 ${made}개 생성, ${skipped}개 최신 유지 → assets/images/archive/thumbs/`);
