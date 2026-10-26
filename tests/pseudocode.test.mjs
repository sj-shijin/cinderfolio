import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import pseudocode from 'pseudocode';
import { renderPseudocode, pseudocodeMathCss, pseudocodeMathEngine, pseudocodeOptions } from '../pseudocode-render.mjs';

const source = String.raw`\begin{algorithm}
\caption{CDCL}
\begin{algorithmic}
\STATE $C \gets$ \CALL{Propagate}{}
\IF{$C \ne \mathrm{None}$}
  \RETURN $\bot$
\ENDIF
\end{algorithmic}
\end{algorithm}`;

test('默认隐藏结束行并显示缩进竖线，允许显式覆盖', () => {
  for (const options of [{}, { noEnd: false, scopeLines: false }]) {
    const expected = pseudocode.renderToString(source, { captionCount: 0, lineNumber: true, noEnd: true, scopeLines: true, ...options });
    assert.equal(renderPseudocode(source, 1, options), `<div class="cf-pseudocode" data-math="katex">${expected}</div>`);
    // 两个引擎的完整排版矩阵在核心验证；网站和 Marp 只检查选项接入。
    for (const math of ['katex', 'mathjax']) {
      const html = renderPseudocode(source, 1, { math, ...options });
      assert.equal(html.includes('with-scopelines'), options.scopeLines ?? true, math);
      assert.equal(html.includes('end if'), options.noEnd === false, math);
      assert.equal((html.match(/class="ps-linenum"/g) ?? []).length, options.noEnd === false ? 4 : 3, math);
    }
  }
});

test('构建期输出算法结构和公式，独立编号不受上次渲染影响', () => {
  const first = renderPseudocode(source);
  assert.match(first, /class="cf-pseudocode"/);
  assert.match(first, /class="katex"/);
  assert.match(first, /class="ps-linenum"/);
  assert.match(renderPseudocode(source, 2), /Algorithm 2/);
  assert.equal(renderPseudocode(source), first);
  assert.doesNotMatch(first, /<script|cdn\./);
});

test('独立 Marp 使用本地内嵌的 KaTeX 字体，不依赖外部请求', () => {
  const css = pseudocodeMathCss();
  assert.match(css, /\.katex/);
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(urls.length > 0);
  assert.ok(urls.every(url => url.startsWith('data:font/woff2;base64,')));
});

test('两个公式引擎实际分别排版，交错渲染不会串引擎或编号', () => {
  const katex = renderPseudocode(source, 1, { math: 'katex' });
  const mathjax = renderPseudocode(source, 1, { math: 'mathjax' });
  assert.match(katex, /data-math="katex"/);
  assert.match(mathjax, /data-math="mathjax"/);
  assert.match(mathjax, /<mjx-container[^>]+jax="CHTML"/);
  assert.doesNotMatch(mathjax, /class="katex"/);
  assert.equal(renderPseudocode(source, 1, { math: 'katex' }), katex);
  assert.equal(renderPseudocode(source, 1, { math: 'mathjax' }), mathjax);
  assert.equal(pseudocodeMathEngine(undefined, 'mathjax'), 'mathjax');
  assert.equal(pseudocodeMathEngine('pseudocode math=katex', 'mathjax'), 'katex');
  assert.throws(() => pseudocodeMathEngine('math=unknown'), /不支持/);
  assert.deepEqual(pseudocodeOptions('', 'mathjax'), { math: 'mathjax' });
  for (const enabled of [true, false]) {
    assert.deepEqual(pseudocodeOptions(`math=katex noEnd=${enabled} scopeLines=${enabled}`, 'mathjax'),
      { math: 'katex', noEnd: enabled, scopeLines: enabled });
  }
});

test('MathJax 字形、正文粗体和字体命令都使用同一套本地字体', () => {
  const styled = source.replace('\\caption{CDCL}', String.raw`\caption{\textrm{CDCL} \textsf{SAT} \texttt{solve}}`);
  const html = renderPseudocode(styled, 1, { math: 'mathjax' });
  for (const role of ['main', 'sans', 'mono']) assert.ok(html.includes(`var(--cf-pseudocode-${role})`));
  assert.doesNotMatch(html, /KaTeX_/);
  const css = pseudocodeMathCss('mathjax');
  assert.match(css, /mjx-c/);
  assert.match(css, /font-family: CF_MathJax_Main; font-weight: 700/);
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(urls.length > 0);
  assert.ok(urls.every(url => url.includes('data:font/woff;base64,')));
  const external = pseudocodeMathCss('mathjax', { fontURL: './mathjax-fonts' });
  assert.doesNotMatch(external, /data:font/);
  assert.match(external, /url\("\.\/mathjax-fonts\/MathJax_Main-Bold\.woff"\)/);
});

test('MathJax 普通文字使用完整高度的字体，公式保留 CHTML 专用字体', () => {
  const css = pseudocodeMathCss('mathjax', { fontURL: './fonts' });
  const faces = [...css.matchAll(/@font-face[^{]*\{([^}]+)\}/g)].map(match => match[1]);
  const textFaces = faces.filter(face => /font-family: CF_MathJax_/.test(face));
  assert.equal(textFaces.length, 7);
  for (const face of textFaces) {
    const file = face.match(/url\("\.\/fonts\/text\/([^"]+)"\)/)?.[1];
    assert.ok(file, '普通文字必须加载单独的字体资源');
    const woff = fs.readFileSync(new URL(`../fonts/mathjax-text/${file}`, import.meta.url));
    const tables = {};
    for (let i = 0; i < woff.readUInt16BE(12); i++) {
      const entry = 44 + i * 20;
      const offset = woff.readUInt32BE(entry + 4);
      const length = woff.readUInt32BE(entry + 8);
      const original = woff.readUInt32BE(entry + 12);
      const data = woff.subarray(offset, offset + length);
      tables[woff.toString('ascii', entry, entry + 4)] = length < original ? inflateSync(data) : data;
    }
    const em = tables.head.readUInt16BE(18);
    // CHTML 专用字体只有 ±0.03em，普通文字需要覆盖字母的上升部和下降部。
    assert.ok(tables.hhea.readInt16BE(4) / em > 0.65, `${file} 上升高度不足`);
    assert.ok(tables.hhea.readInt16BE(6) / em < -0.15, `${file} 下降高度不足`);
  }
  const mathFaces = faces.filter(face => /font-family:\s*MJX/.test(face));
  assert.ok(mathFaces.length > 0);
  assert.ok(mathFaces.every(face => !face.includes('/text/')));
});
