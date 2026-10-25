/** 仅在构建期运行；网页与 Marp 共用算法语法和编号约定。 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import pseudocode from 'pseudocode';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { CHTML } from 'mathjax-full/js/output/chtml.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

const require = createRequire(import.meta.url);
let mathjaxRenderer;
let mathjaxStyles;

function prepareMathJax() {
  if (mathjaxRenderer) return;
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  // 完整静态 CSS 使字体资源不依赖算法的构建顺序，也不需要浏览器再次排版。
  const output = new CHTML({ fontURL: 'fonts', adaptiveCSS: false, matchFontHeight: false });
  const document = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages, formatError: (_, error) => { throw error; } }),
    OutputJax: output,
  });
  // 上游在同时发现两个引擎时总是优先 KaTeX；隔离加载原始浏览器包，只提供 MathJax。
  // 不改依赖源码、不替换进程全局变量；适配 Node 的 DOM 输出到上游的 tex2chtml 接口。
  const context = {
    MathJax: {
      version: mathjax.version,
      tex2chtml: (tex, options) => ({ outerHTML: adaptor.outerHTML(document.convert(tex, options)) }),
    },
  };
  runInNewContext(fs.readFileSync(require.resolve('pseudocode/build/pseudocode.min.js'), 'utf8'), context);
  mathjaxRenderer = context.pseudocode;
  mathjaxStyles = adaptor.textContent(output.styleSheet(document));
}

export function pseudocodeMathEngine(meta = '', fallback = 'katex') {
  const math = meta?.match(/(?:^|\s)math=(\S+)/)?.[1] ?? fallback;
  if (!['katex', 'mathjax'].includes(math)) throw new Error(`不支持的伪代码公式引擎：${math}`);
  return math;
}

/** 围栏可覆盖排版开关；省略时使用 renderPseudocode 的统一默认值。 */
export function pseudocodeOptions(meta = '', fallback = 'katex') {
  const options = { math: pseudocodeMathEngine(meta, fallback) };
  for (const [, key, value] of meta?.matchAll(/(?:^|\s)(noEnd|scopeLines)=(true|false)(?=\s|$)/g) ?? []) {
    options[key] = value === 'true';
  }
  return options;
}

export function renderPseudocode(source, number = 1, { math = 'katex', noEnd = true, scopeLines = true } = {}) {
  pseudocodeMathEngine('', math);
  if (math === 'mathjax') prepareMathJax();
  // 上游编号使用进程级计数器；每次显式传入，避免不同页面和重建互相影响。
  const html = (math === 'mathjax' ? mathjaxRenderer : pseudocode).renderToString(source, {
    captionCount: number - 1,
    lineNumber: true,
    noEnd,
    scopeLines,
  });
  // 上游的字体命令写死 KaTeX 字体；只在输出中映射为当前引擎的字体变量。
  const fonts = { Main: 'main', SansSerif: 'sans', Typewriter: 'mono' };
  const themed = html.replace(/font-family:\s*KaTeX_(Main|SansSerif|Typewriter)/g,
    (_, font) => `font-family:var(--cf-pseudocode-${fonts[font]}),var(--cf-pseudocode-cjk,serif)`);
  return `<div class="cf-pseudocode" data-math="${math}">${themed}</div>`;
}

/** 两个引擎均使用包内字体；独立 HTML 与 PDF 无需请求 CDN。 */
export function pseudocodeMathCss(math = 'katex', { fontURL } = {}) {
  pseudocodeMathEngine('', math);
  if (math === 'mathjax') {
    prepareMathJax();
    const root = path.dirname(require.resolve('mathjax-full/package.json'));
    const fontUrl = (file, textFont = false) => fontURL ? `url("${fontURL}/${textFont ? 'text/' : ''}${file}")`
      : `url("data:font/woff;base64,${fs.readFileSync(textFont
        ? new URL(`./fonts/mathjax-text/${file}`, import.meta.url)
        : path.join(root, 'es5/output/chtml/fonts/woff-v2', file)).toString('base64')}")`;
    // v3 的公式字体 ascent/descent 接近零，由 CHTML 定位，不能直接用于普通行内文字。
    // 普通文字改用同系列的原始 TeX 字体；公式仍保留 v3 字体及其原生定位。
    // https://github.com/mathjax/MathJax/issues/2896
    const faces = [
      ['Main', 'Regular', 400, 'normal'], ['Main', 'Bold', 700, 'normal'], ['Main', 'Italic', 400, 'italic'],
      ['SansSerif', 'Regular', 400, 'normal'], ['SansSerif', 'Bold', 700, 'normal'], ['SansSerif', 'Italic', 400, 'italic'],
      ['Typewriter', 'Regular', 400, 'normal'],
    ].map(([family, variant, weight, style]) =>
      `@font-face { font-family: CF_MathJax_${family}; font-weight: ${weight}; font-style: ${style}; src: ${fontUrl(`MathJax_${family}-${variant}.woff`, true)} format("woff"); }`).join('\n');
    const css = mathjaxStyles.replace(/url\("fonts\/([^"/]+)"\)/g, (_, file) => fontUrl(file));
    const textLicense = fs.readFileSync(new URL('./fonts/mathjax-text/OFL.txt', import.meta.url), 'utf8');
    return `/* MathJax\n${fs.readFileSync(path.join(root, 'LICENSE'), 'utf8')}\n*/\n${css}\n/* MathJax TeX text fonts\n${textLicense}\n*/\n${faces}`;
  }
  const katexRequire = createRequire(import.meta.resolve('pseudocode'));
  const cssPath = katexRequire.resolve('katex/dist/katex.min.css');
  const license = fs.readFileSync(path.join(path.dirname(cssPath), '../LICENSE'), 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8').replace(/src:[^;}]+/g, declaration => {
    const font = declaration.match(/url\((fonts\/[^)]+\.woff2)\)/);
    if (!font) return declaration;
    const data = fs.readFileSync(path.join(path.dirname(cssPath), font[1])).toString('base64');
    return `src:url(data:font/woff2;base64,${data}) format("woff2")`;
  });
  return `/* KaTeX\n${license}\n*/\n${css}`;
}
