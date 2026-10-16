/**
 * 把 edgeone/entry.js 及其依赖的 src/ 打包成自包含单文件。
 *
 * 站点级 EdgeOne 边缘函数只能在控制台单文件编辑（ZIP/CLI 是 Makers 的路径），
 * 所以部署前必须打成单文件：npm run build:edgeone
 */

import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// esbuild 随 wrangler 一起安装，未单独声明为依赖
let build;
try {
  ({ build } = await import('esbuild'));
} catch {
  console.error('✗ 找不到 esbuild。它随 wrangler 一起安装，请先在 workers/ 下运行 npm install。');
  process.exit(1);
}

const CODE_PACKAGE_LIMIT = 5 * 1024 * 1024;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(root, 'edgeone/dist/film-index-baidu-pan.js');

await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(root, 'edgeone/entry.js')],
  outfile,
  bundle: true,
  // 打成 IIFE：控制台编辑器按普通脚本执行，避免依赖 ESM 解析
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  banner: {
    js: [
      '/* 由 scripts/build-edgeone.mjs 自动生成，请勿直接编辑。',
      ' * 修改 workers/src/ 后重新运行：npm run build:edgeone */'
    ].join('\n')
  }
});

const { size } = await stat(outfile);
const kb = (size / 1024).toFixed(1);

if (size > CODE_PACKAGE_LIMIT) {
  console.error(`✗ 产物 ${kb} KB 超出边缘函数代码包上限 5 MB`);
  process.exit(1);
}

console.log(`✓ 已生成 edgeone/dist/film-index-baidu-pan.js（${kb} KB）`);
console.log('  粘贴到 EdgeOne 控制台：站点 → 边缘函数 → 函数管理 → 新建函数');
