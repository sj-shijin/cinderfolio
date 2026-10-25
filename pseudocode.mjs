/** 算法排版共用 Cinderfolio 语义色；正文与公式采用同一引擎的字体。 */
import { licenseComment } from './license.mjs';

export function createPseudocodeCss() {
  return licenseComment + `
/* 排版遵循 pseudocode.js 2.4.1（MIT）。
 * Copyright (c) 2020-2023 Saswat Padhi; (c) 2015-2019 Tate Tian.
 * 许可条款同上；Cinderfolio 负责颜色与公式引擎对应的字体。
 */
.cf-pseudocode {
  --cf-pseudocode-main: KaTeX_Main;
  --cf-pseudocode-sans: KaTeX_SansSerif;
  --cf-pseudocode-mono: KaTeX_Typewriter;
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
  color: var(--cf-foreground);
  background: var(--cf-background);
  /* 建立独立排版基准；不继承正文的字号、字重、斜体和行距。 */
  font: 400 var(--cf-pseudocode-font-size, 1rem)/1.2 var(--cf-pseudocode-main), var(--cf-pseudocode-cjk, serif);
  text-align: left;
  text-indent: 0;
  text-transform: none;
  letter-spacing: normal;
  word-spacing: normal;
  break-inside: avoid;
}
.cf-pseudocode[data-math="mathjax"] {
  --cf-pseudocode-main: CF_MathJax_Main;
  --cf-pseudocode-sans: CF_MathJax_SansSerif;
  --cf-pseudocode-mono: CF_MathJax_Typewriter;
}
.cf-pseudocode .ps-root { font: inherit; }
.cf-pseudocode .ps-algorithm {
  margin: 0.8em 0;
  padding: 0;
  border-top: 3px solid var(--cf-text-muted);
  border-bottom: 2px solid var(--cf-text-muted);
}
.cf-pseudocode .ps-algorithm.with-caption > .ps-line:first-child {
  border-bottom: 2px solid var(--cf-text-muted);
}
.cf-pseudocode .ps-root .ps-line { margin: 0; padding: 0; line-height: 1.2; }
.cf-pseudocode .ps-keyword { font-weight: 700; font-variant: normal; font-style: normal; text-transform: none; color: light-dark(var(--cf-accent-darker), var(--cf-accent-light)); }
.cf-pseudocode .ps-funcname { font-variant: small-caps; font-weight: 400; font-style: normal; text-transform: none; }
.cf-pseudocode .ps-comment { font-size: 1em; font-weight: 400; font-variant: normal; font-style: normal; text-transform: none; color: var(--cf-text-muted); }
.cf-pseudocode .ps-linenum {
  box-sizing: content-box;
  display: inline-block;
  position: relative;
  width: 1.6em;
  padding-right: 0.3em;
  font-size: 0.8em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
  color: var(--cf-text-subtle);
  user-select: none;
}
.cf-pseudocode .with-linenum .ps-line.ps-code { text-indent: -1.6em; }
.cf-pseudocode .with-linenum .ps-line.ps-code > span { text-indent: 0; }
.cf-pseudocode .with-scopelines .ps-block {
  border-left: 0.1em solid var(--cf-text-subtle);
  padding-left: 0.6em;
}
.cf-pseudocode .with-scopelines > .ps-block { border-left: 0; }
.cf-pseudocode .katex { font-size: 1em; text-indent: 0; }
.cf-pseudocode mjx-container { font-size: 1em; text-indent: 0; }
`;
}
