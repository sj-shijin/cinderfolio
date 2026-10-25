import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';
import { buildMarpExample } from '../scripts/build_marp.mjs';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../scripts/build_marp.mjs', import.meta.url));
const run = (args, cwd) => execute(process.execPath, [cli, ...args], { cwd });

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'cinderfolio-marp-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function until(check, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await setTimeout(50);
  }
  assert.fail(message);
}

test('原地构建中文路径文稿，保留任意相对素材、字体和 Pele / Shiki', async t => {
  const directory = await fixture(t);
  await fs.mkdir(path.join(directory, 'cinderfolio')); // 避免主题名与目录重名的回归。
  const manuscript = path.join(directory, '文稿 目录');
  await fs.mkdir(manuscript);
  await fs.mkdir(path.join(directory, '共享图片'));
  const image = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect width="80" height="40"/></svg>';
  const asset = path.join(directory, '共享图片', '图 1.svg');
  await fs.writeFile(asset, image);
  await fs.writeFile(path.join(manuscript, 'LICENSE'), '使用方自己的许可');
  const source = `---
marp: true
size: 4:3
theme: default
---
## 本地文稿

![width:80px](<../共享图片/图 1.svg>)

\`\`\`js
const value = 42;
\`\`\`

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`;
  const input = path.join(manuscript, '我的演示.md');
  const target = path.join(manuscript, '我的演示.html');
  await fs.writeFile(input, source);
  const { stdout } = await run([input], directory);
  assert.ok(stdout.includes(target));
  const html = await fs.readFile(target, 'utf8');
  assert.match(html, /viewBox="0 0 960 720"/);
  assert.match(html, /--cf-background:\s*#fafaf8/);
  assert.match(html, /--cf-background:\s*#121212/);
  assert.match(html, /class="shiki /);
  assert.match(html, /pele-flowchart/);
  const imageUrl = html.match(/<img[^>]*src="([^"]+)"/)[1];
  assert.equal(fileURLToPath(new URL(imageUrl, pathToFileURL(target))), asset);
  const fontUrl = html.match(/url\(["']?([^"'\s)]*InterVariable\.woff2)/)[1];
  assert.ok((await fs.stat(fileURLToPath(new URL(fontUrl, pathToFileURL(target))))).isFile());
  assert.deepEqual((await fs.readdir(manuscript)).sort(), ['LICENSE', '我的演示.html', '我的演示.md']);
  assert.equal(await fs.readFile(input, 'utf8'), source);
  assert.equal(await fs.readFile(asset, 'utf8'), image);
  assert.equal(await fs.readFile(path.join(manuscript, 'LICENSE'), 'utf8'), '使用方自己的许可');

  await assert.rejects(run(['missing.md'], directory), error => error.code === 1 && /ENOENT/.test(error.stderr));
  await assert.rejects(run([input, 'other.md'], directory), error => error.code === 1 && /每次指定一份/.test(error.stderr));
  const bin = path.join(directory, 'cinderfolio-marp');
  await fs.symlink(cli, bin);
  assert.match((await execute(process.execPath, [bin, '--help'], { cwd: directory })).stdout, /--preview/);
  const imported = await execute(process.execPath, [
    '--input-type=module', '-e',
    `const { buildMarp } = await import(${JSON.stringify(pathToFileURL(cli).href)}); console.log(typeof buildMarp);`,
    'caller-argument',
  ], { cwd: directory });
  assert.equal(imported.stdout.trim(), 'function');
});

test('原生监听可在编辑器原子保存后重建 HTML，退出时正常关闭', async t => {
  const directory = await fixture(t);
  const input = path.join(directory, 'talk.md');
  const output = path.join(directory, 'talk.html');
  await fs.writeFile(input, '## 第一版\n');
  const child = spawn(process.execPath, [cli, input, '--preview', '--no-open'], { cwd: directory });
  let log = '';
  child.stdout.on('data', data => { log += data; });
  child.stderr.on('data', data => { log += data; });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exit = once(child, 'exit');
    child.kill('SIGTERM');
    await exit;
  };
  t.after(stop);
  await until(() => log.includes('正在监听'), `未启动监听：${log}`);
  let html = await fs.readFile(output, 'utf8');
  assert.match(html, /第一版/);
  const endpoint = html.match(/window\.__marpCliWatchWS="([^"]+)"/)[1];
  const socket = new WebSocket(endpoint);
  t.after(() => socket.close());
  assert.equal((await once(socket, 'message', { signal: AbortSignal.timeout(10000) }))[0].data, 'ready');
  const refreshed = once(socket, 'message', { signal: AbortSignal.timeout(10000) });
  await fs.writeFile(path.join(directory, 'talk.tmp'), '## 第二版\n');
  await fs.rename(path.join(directory, 'talk.tmp'), input);
  assert.equal((await refreshed)[0].data, 'reload');
  await until(async () => (await fs.readFile(output, 'utf8')).includes('第二版'), '保存后没有重新构建');
  html = await fs.readFile(output, 'utf8');
  assert.match(html, /InterVariable\.woff2/);
  assert.doesNotMatch(html, /第一版/);
  socket.close();
  await stop();
  assert.equal(child.exitCode, 0, log);
});

test('网站 API 保留双比例文件名，资源布局由使用方安排', async t => {
  const directory = await fixture(t);
  const readFile = fs.readFile;
  const example = new URL('../examples/marp.md', import.meta.url);
  // 将源样张切到 4:3 后，网站仍需分别生成两种比例。
  t.mock.method(fs, 'readFile', async (file, ...options) => {
    const content = await readFile(file, ...options);
    return String(file) === String(example) ? content.replace(/^size:.*$/m, 'size: 4:3') : content;
  });
  await buildMarpExample(directory);
  for (const [filename, width] of [['example.html', 1280], ['example-4-3.html', 960]]) {
    const html = await fs.readFile(path.join(directory, filename), 'utf8');
    assert.ok(html.includes(`viewBox="0 0 ${width} 720"`));
    assert.match(html, /InterVariable\.woff2/);
  }
  assert.deepEqual((await fs.readdir(directory)).sort(), ['example-4-3.html', 'example.html']);
});
