#!/usr/bin/env node
/** 共用原生 Marp CLI 构建与监听；文稿在原目录渲染，不复制使用方素材。 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { marpCli, waitForObservation } from '@marp-team/marp-cli';
import { createMarpCss } from '../marp.mjs';
import { pseudocodeMathCss } from '../pseudocode-render.mjs';

const example = new URL('../examples/marp.md', import.meta.url);
const defaultFonts = new URL('../fonts/marp/', import.meta.url);
const resolvePath = value => value instanceof URL ? fileURLToPath(value) : path.resolve(value);

async function themeWithFonts(output, fontDirectory) {
  const directory = resolvePath(fontDirectory);
  const relative = path.relative(path.dirname(output), directory).split(path.sep).map(encodeURIComponent).join('/') || '.';
  const fonts = await fs.readFile(path.join(directory, 'font.css'), 'utf8');
  // 字体声明进入主题 CSS，原生 watch 每次重建都能保留，无需事后改写 HTML。
  return `${pseudocodeMathCss()}\n${pseudocodeMathCss('mathjax')}\n${createMarpCss()}\n${fonts.replaceAll('url("./', `url("${relative}/`)}`;
}

/** 默认输出在源文件旁；output / fontDirectory 供网站等使用方显式安排导出资源。 */
export async function buildMarp(input = example, { output, fontDirectory = defaultFonts, watch = false, preview = false } = {}) {
  const file = resolvePath(input);
  const target = resolvePath(output ?? path.join(path.dirname(file), `${path.parse(file).name}.html`));
  if (file === target) throw new Error('输出 HTML 不能覆盖输入文稿。');
  await fs.access(file);
  const temporary = await fs.mkdtemp(path.join(tmpdir(), 'cinderfolio-marp-'));
  let stop;
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    const theme = path.join(temporary, 'cf-marp.css');
    await fs.writeFile(theme, await themeWithFonts(target, fontDirectory));
    const rendering = marpCli([
      file, '--theme', theme,
      '--config-file', fileURLToPath(new URL('../marp-engine.mjs', import.meta.url)),
      '--output', target,
      ...(watch ? ['--watch'] : []),
      ...(preview ? ['--preview'] : []),
    ]);
    if (watch || preview) {
      const observation = await Promise.race([waitForObservation(), rendering.then(() => null)]);
      if (observation) {
        stop = observation.stop;
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        console.log(`Cinderfolio-Marp：正在监听 ${file}\n预览文件：${target}\n保存 Markdown 后自动刷新；Ctrl+C 停止。`);
      }
    }
    const status = await rendering;
    if (status !== 0) throw new Error(`Marp HTML 生成失败：${status}`);
    return target;
  } finally {
    if (stop) {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
    }
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

/** 网站双比例样张；使用方负责准备目标目录中的图片与字体。 */
export async function buildMarpExample(output = new URL('../dist/marp/', import.meta.url), options = {}) {
  const directory = resolvePath(output);
  const source = await fs.readFile(example, 'utf8');
  const temporary = await fs.mkdtemp(path.join(tmpdir(), 'cinderfolio-marp-example-'));
  try {
    const outputs = [];
    for (const [size, filename] of [['16:9', 'example.html'], ['4:3', 'example-4-3.html']]) {
      const input = path.join(temporary, 'example.md');
      await fs.writeFile(input, source.replace(/^size:.*$/m, `size: ${size}`));
      outputs.push(await buildMarp(input, { ...options, output: path.join(directory, filename) }));
    }
    return outputs;
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

// 兼容 npm 的符号链接入口；被导入时，调用方参数可能并非文件。
if (process.argv[1] && fileURLToPath(import.meta.url) === await fs.realpath(process.argv[1]).catch(() => null)) {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        watch: { type: 'boolean', short: 'w' },
        preview: { type: 'boolean', short: 'p' },
        'no-open': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) {
      console.log(`用法：npm run marp -- [文稿.md]
      npm run marp-preview -- [文稿.md] [--no-open]
      cinderfolio-marp [文稿.md] [--watch | --preview]

无文稿参数时使用仓库中的 examples/marp.md；默认在源文件旁生成同名 HTML。
--preview 构建并打开 Marp 预览窗口，保存 Markdown 后自动刷新。
--no-open 配合预览命令只监听，便于手动打开 HTML 或供 AI 助手调试。
-o, --output 可指定 HTML 路径；此时使用方自行保证相对资源路径正确。
字体引用 Cinderfolio 原有文件，图片等素材保持原有路径，不复制或搬动。`);
    } else {
      if (positionals.length > 1) throw new Error('每次指定一份 Markdown 文稿；用 --help 查看用法。');
      const output = await buildMarp(positionals[0] ?? example, {
        output: values.output,
        watch: values.watch || values.preview,
        preview: values.preview && !values['no-open'],
      });
      console.log(`Cinderfolio-Marp：${output}`);
    }
  } catch (error) {
    console.error(`Cinderfolio-Marp：${error.message}`);
    process.exitCode = 1;
  }
}
