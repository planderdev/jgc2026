import { spawnSync } from 'node:child_process';
import { watch } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'assets', 'css', 'src');
const outputFile = path.join(root, 'assets', 'css', 'styles.css');
const tempFile = path.join(os.tmpdir(), `jgcf-css-${process.pid}.css`);

const sourceFiles = [
  'base.css',
  'components.css',
  'layout.css',
  'home.css',
  'pages.css',
  'responsive.css'
];

const tailwindCli = path.join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');

async function build() {
  const chunks = await Promise.all(
    sourceFiles.map((file) => fs.readFile(path.join(sourceDir, file), 'utf8'))
  );

  await fs.writeFile(tempFile, chunks.join('\n\n'), 'utf8');

  const result = spawnSync(process.execPath, [tailwindCli, '-i', tempFile, '-o', outputFile, '--minify'], {
    cwd: root,
    shell: false,
    stdio: 'inherit'
  });

  await fs.rm(tempFile, { force: true });

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

await build();

if (process.argv.includes('--watch')) {
  let timer;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build().catch((error) => {
        console.error(error);
      });
    }, 100);
  };

  for (const file of sourceFiles) {
    watch(path.join(sourceDir, file), rebuild);
  }

  process.stdin.resume();
}
