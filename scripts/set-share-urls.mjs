/**
 * 공유용 절대 URL 설정
 *
 * og:image와 og:url은 절대 URL이어야 합니다. 페이스북은 상대 경로를 해석하지만
 * 카카오톡을 비롯한 일부 크롤러는 읽지 못해 미리보기가 뜨지 않습니다.
 *
 * 사용법:
 *   node scripts/set-share-urls.mjs https://example.com
 *
 * 도메인이 바뀌면 새 주소로 다시 실행하면 전 페이지가 갱신됩니다.
 * 몇 번을 실행해도 결과는 같습니다.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || '').replace(/\/+$/, '');

if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error('사용법: node scripts/set-share-urls.mjs https://example.com');
  console.error('  프로토콜을 포함한 도메인만 넘겨주세요. 경로는 붙이지 않습니다.');
  process.exit(1);
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'tmp', 'tools', 'scripts'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = (await htmlFiles(root)).sort();
let changed = 0;

for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  let source = await fs.readFile(file, 'utf8');
  const before = source;

  // og:image를 절대 URL로. 이미 절대 URL이면 경로만 남기고 새 base를 붙여
  // 여러 번 실행해도 값이 겹쳐 쌓이지 않게 한다.
  const toAssetPath = (value) => {
    let out = value;
    let previous;
    do {
      previous = out;
      out = out.replace(/^https?:\/\/[^/]+/, '').replace(/^(\.\.\/|\/)+/, '');
    } while (out !== previous);
    return out;
  };

  source = source.replace(
    /(<meta property="og:image" content=")([^"]*)(")/,
    (_, open, value, close) => `${open}${base}/${toAssetPath(value)}${close}`
  );

  // og:url은 페이지 자신의 주소. 홈은 도메인 루트로 둔다.
  // cleanUrls 기준 정식 주소: 확장자 제거, index는 디렉터리 주소로
  const cleanPath = rel === 'index.html' ? ''
    : rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const canonical = `${base}/${cleanPath}`;
  // canonical도 같은 주소로. 검색엔진이 vercel.app과 커스텀 도메인을 같은 페이지로 본다.
  if (/<link rel="canonical"/.test(source)) {
    source = source.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
  } else {
    source = source.replace(
      /^([ \t]*)(<meta property="og:url" content="[^"]*">\n)/m,
      `$1<link rel="canonical" href="${canonical}">\n$1$2`
    );
  }

  // hreflang: 한국어 페이지와 /en/ 페이지를 서로 연결한다. 짝이 없는 페이지(관리자 등)는 건너뛴다.
  const isEn = rel.startsWith('en/');
  const koRel = isEn ? rel.slice(3) : rel;
  const enRel = `en/${koRel}`;
  const hasPair = isEn ? true : fsSync.existsSync(path.join(root, enRel));
  source = source.replace(/^[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n/gm, '');
  if (hasPair) {
    const koClean = koRel === 'index.html' ? '' : koRel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
    const koUrl = `${base}/${koClean}`;
    const enUrl = `${base}/en${koClean ? `/${koClean}` : ''}`;
    const tags = [
      `<link rel="alternate" hreflang="ko" href="${koUrl}">`,
      `<link rel="alternate" hreflang="en" href="${enUrl}">`,
      `<link rel="alternate" hreflang="x-default" href="${koUrl}">`
    ];
    source = source.replace(
      /^([ \t]*)(<link rel="canonical" href="[^"]*">\n)/m,
      (m, indent, line) => `${indent}${line}${tags.map((t) => `${indent}${t}\n`).join('')}`
    );
  }

  if (/<meta property="og:url"/.test(source)) {
    source = source.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`);
  } else {
    // 들여쓰기를 보존해야 한다. og:image 줄의 선행 공백을 그대로 새 줄에도 쓴다.
    source = source.replace(
      /^([ \t]*)(<meta property="og:image" content="[^"]*">\n)/m,
      `$1<meta property="og:url" content="${canonical}">\n$1$2`
    );
  }

  if (source !== before) {
    await fs.writeFile(file, source, 'utf8');
    changed += 1;
    console.log(`  ${rel}`);
  }
}

console.log(`\n${files.length}개 페이지 중 ${changed}개 갱신 (base: ${base})`);
