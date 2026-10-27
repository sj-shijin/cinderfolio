# MathJax TeX 普通文字字体

用于论文式伪代码的标题、关键词、函数名与行号。公式渲染器仍为 MathJax 3.2.2。

MathJax 3 的 `woff-v2` 字体把 ascent/descent 设为接近零的值，交由 CHTML 补足字形边界；直接作为普通文字字体会导致标题碰到横线。按[维护者建议](https://github.com/mathjax/MathJax/issues/2896)，普通文字使用同系列、具有完整垂直度量的原始 TeX 字体。

- 来源：[MathJax 2.7.9 / fonts/HTML-CSS/TeX/woff](https://github.com/mathjax/MathJax/tree/2.7.9/fonts/HTML-CSS/TeX/woff)
- 字体文件按上游原样保存，公式运行时使用 MathJax 3.2.2。
- `OFL.txt` 保留字体 name 表中的版权及保留字体名声明，并附 SIL Open Font License 1.1 全文。
- `SHA256SUMS` 记录本目录七份字体的校验和。
- 网页按需加载；独立 Marp HTML 内嵌字体，PDF 使用同一份字形。
