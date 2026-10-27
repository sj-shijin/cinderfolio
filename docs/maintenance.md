# Cinderfolio 维护

长期准则见 [AGENTS.md](../AGENTS.md)，接入与使用见 [README](../README.md)。本文记录实现原理、维护流程和必要的使用条件，精确参数在所属代码中维护。

## 修改与验证

```sh
npm ci
npm run build      # 更新主题文件，保留 dist/ 中的其他产物
npm run check      # 核验产物与必要对比度
npm test           # 配色、真实语法、渲染、资源与 CLI
npm run marp       # 构建默认演示 HTML
npm pack --dry-run # 检查分发清单
```

[CI](../.github/workflows/ci.yml) 使用 Node.js 24 执行这些检查。源码与锁文件纳入版本管理，`dist/`、依赖和演示 HTML 由本地构建生成。使用方固定子模块提交；主题提交、推送后，由使用方更新所引用的版本。

配色和适配器检查亮暗主题、默认与自定义种子；Shiki 改动使用真实语法；Marp 排版检查 16:9 与 4:3。分页、章节跳转和布局作用域用小文稿验证，正式演示检查编译、渲染、章节链接及资源完整性。

浏览器验收检查翻页、字体、图片和控制台。验证监听时实际打开 HTML，临时修改并保存文稿，确认自动刷新后恢复修改；交付前结束监听并构建静态 HTML。使用与停止命令见 [Marp 用法](../README.md#marp)。

## Marp 排版与渲染

[`marp.mjs`](../marp.mjs) 提供自包含主题 CSS，整合 Pele、Shiki 和算法样式。画幅由 Marp `size` 决定：16:9 为 1280×720，4:3 为 960×720；布局通过原生 `data-size` 适配。

正文以 `##` 页题开头，页内小标题使用 `###`。`compact` 调整正文密度，标题、强调线和正文起点保持稳定；封面与过渡页使用各自版式。字号、边距和间隔的精确值在 `marp.mjs` 维护。

`header` 从当前页延续到后页，`_header` 仅覆盖当前页。顶层章节链接平分页眉，用 `strong` 标记当前章节；分页调整后同步实际幻灯片序号：

```markdown
<!-- header: '**[引言](#2)** [方法](#5)' -->
<!-- footer: 研究汇报 · 作者 -->

## 研究问题
```

封面用 `_class: cover`，主标题居中于强调线上方，副标题置于标题内的 `small`；作者、单位、日期可按需保留，信息组自动居中。过渡页用 `_class: transition`，章节标题前后可写编号和引导句；强调线与封面共用位置。

```markdown
<!--
_class: cover
_paginate: skip
_header: ""
_footer: ""
-->

# 报告标题 <small>副标题</small>

作者

单位

日期

---

<!-- _class: transition -->

02

## 研究方法

从问题到方案。
```

`transition: fade 300ms` 控制 Marp CLI 的 HTML 翻页动画，`_transition` 控制单次翻页；它与上述 `transition` 版式各自独立。浏览器需支持 View Transitions API，PDF 保持静态。详见[官方转场文档](https://github.com/marp-team/marp-cli/blob/main/docs/bespoke-transitions/README.md)。

分栏使用 `cf-cols / cf-col`，HTML 标签与 Markdown 间保留空行。默认等宽、左上对齐，`cf-w1`–`cf-w5` 设置宽度权重；`cf-align-*` 先指定纵向 `t / m / b`，再指定横向 `l / c / r`。独立 `cf-col` 是全宽内容组，空栏和空组自动收起。

```markdown
<div class="cf-cols">

<div class="cf-col cf-w3 cf-align-ml">

左侧说明。

</div>
<div class="cf-col cf-w2 cf-align-tc">

![图示](./assets/figure.png)

</div>
</div>
```

纵向对齐需要可分配的高度。默认 HTML 允许列表会移除标签的 `style` 属性，任意比例、额外高度和代码字号通过局部样式设置：

```html
<style scoped>
.cf-col.wide { flex-grow: 2.5; } /* 与默认一栏组成 2.5:1。 */
.cf-cols.tall { min-height: 320px; }
pre code { font-size: 24px; }
.cf-col.diagram { --cf-marp-column-media-height: 300px; }
</style>
```

`--cf-marp-column-media-height` 默认 `none`，作用于双栏代码和 Pele 图表。媒体与代码保留横向防溢出及 Marp 原生缩放，总高度由文稿作者安排；图片可用 `w:` / `h:` 指定尺寸，图注用 `figcaption`。分割背景图的兼容范围见 [README](../README.md#适配范围)。

[`marp-engine.mjs`](../marp-engine.mjs) 在构建期将 `mermaid` 围栏交给 Pele、`pseudocode` 交给算法渲染器，其余交给 Shiki；未知语言按纯文本转义，代码保留原生自动缩放。Pele 按 Markdown 行号生成稳定的 `idPrefix`，同步处理 ID 与可访问性引用。浏览器展示生成的 SVG、HTML 和变量主题。

标注块使用 `@mdit/plugin-alert` 的 `deep: true`，支持分栏、列表和引用中的五种 GitHub 标记；高亮、上下标由 `markdown-it-mark / sub / sup` 解析。插件按锁文件版本在构建期运行，代码围栏保留原文。样式跟随 `cf-marp.css`，语法能力由引擎提供。

[`scripts/build_marp.mjs`](../scripts/build_marp.mjs) 将字体声明合入临时主题 CSS，原生 watch 每次重建都保留字体；输出 HTML 沿用源文稿目录和素材路径。网站双比例接口生成 `example.html` 与 `example-4-3.html`，资源打包和状态同步交由使用方。

## 算法渲染

[`pseudocode-render.mjs`](../pseudocode-render.mjs) 共用 pseudocode.js 的 `algorithmic` 语法，`renderPseudocode()` 默认 KaTeX，Marp 则使用文稿选择的引擎。`noEnd`、`scopeLines` 默认均为 `true`，显示选项与原始语法分别处理；算法编号由调用方按文档计数。完整示例见 [README](../README.md#论文式伪代码)。

[`pseudocode.mjs`](../pseudocode.mjs) 沿用原始横线、标题间距与 `1.2` 行高；横线使用 `--cf-text-muted`，关键词使用强调色系的 `darker / light`。算法独立设置字体、字号、字重和对齐，网页默认 `1rem`，Marp 默认 `24px`；通过变量调整：

```css
section.algorithm-page { --cf-pseudocode-font-size: 20px; }
```

KaTeX 模式的普通文字使用 KaTeX Main，MathJax 模式使用具有完整垂直度量的 TeX 普通文字字体；公式使用各引擎原生字形，中文由 `--cf-pseudocode-cjk` 指定后备字体。MathJax 字体来源、度量原因与校验和见[字体说明](../fonts/mathjax-text/README.md)。

pseudocode.js 在同时发现两个引擎时优先 KaTeX。MathJax 模式因此在独立上下文中加载上游浏览器包，通过 `tex2chtml` 适配；输出字体名映射为当前引擎的 CSS 变量。

独立 Marp HTML 内嵌两套公式字体。网站可使用 `pseudocodeMathCss('mathjax', { fontURL: './mathjax-fonts' })` 生成外部字体引用，并部署：

```text
mathjax-full/es5/output/chtml/fonts/woff-v2/ → mathjax-fonts/
cinderfolio/fonts/mathjax-text/             → mathjax-fonts/text/
```

省略 `fontURL` 时内嵌字体。`cf-pseudocode.css` 复用宿主配色变量，公式配套引擎 CSS；Rspress 适配层提供代码块式外框，Tab 中的唯一算法共用标签外框，Marp 使用算法自身排版。

## 字体和资源

正文与图表使用 Inter、Noto Sans SC，代码使用 Sarasa Mono SC。版本、来源和哈希以 [`fonts/marp/SOURCE.json`](../fonts/marp/SOURCE.json) 为准，`font.css` 引用同目录 WOFF2；日常构建使用这些本地文件。

升级字体时准备官方字体、三份 OFL 及包含 `url / sha256 / bytes` 的 `sources.json`，运行：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements-fonts.txt
.venv/bin/python scripts/prepare_marp_fonts.py /path/to/original-fonts
node --test tests/marp.test.mjs
```

核对来源、分片与哈希；中文分片保留字符映射，Inter / Noto 保留可变字重，代码字体覆盖常规、粗体、斜体与粗斜体。发布时由使用方复制字体、图片和各自许可证，授权来源见 [README](../README.md#维护与许可)。

## 灰阶与强调色系规则

[`palette.mjs`](../palette.mjs) 定义灰阶、强调色系与语义职责，`brand` 是输入指定的品牌基准色，分类色单独由它衍生。核心关系为：

```js
// 编码后的 sRGB 通道等差插值，结果为不透明 #rrggbb；感知明度按实际结果评估。
g[i] = mix(paper, ink, i * 100 / 16); // i = 0…16；暗色职责取 16 - i。
accentSteps = { darker: -10, dark: -5, brand: 0, light: 10, lighter: 20 }; // HSL 明度百分点。
selection = mix(accent, background, 25);          // 文字选区保留原字色。
selectedBackground = mix(accent, background, 15); // 当前项目与高亮行淡底。
controlSelectedBackground = accent;              // 实底文字选择对比更高的 ink / paper。
```

亮暗共用品牌基准色。画布、浅层与悬浮底色使用亮色 `g16 / g15 / g14`、暗色 `g0 / g1 / g2`。品牌基准色用于交互、焦点与选中实底，链接使用亮色 `dark`、暗色 `light`；具体职责维护于 `recipes`。

构建对必要中性文字、控件边界和选中文字执行对比度检查，其余记录实际值并保留既定色阶。默认橙色对浅色画布约 `2.68:1`，对选中文字约 `6.68:1`；默认亮色链接对画布约 `3.06:1`，对淡橙选区约 `2.38:1`。可访问性结论以具体前景／背景组合及检查结果为准。

## Shiki 主题

[`shiki.mjs`](../shiki.mjs) 按六个阅读层级映射语法 scope，加上 Diff 删除字形共七组 `tokenColors`。HEX JSON 与变量主题共用同一规则：

```js
// 亮色 / 暗色；灰阶镜像，强调色系复用现有五档。
navigation = 'darker / light · 粗体'; // 分支、循环、声明、预处理与构建指令。
execution  = 'g0 / g16 · 粗体';      // 函数、变量、属性、表达式、规则与标题。
comment    = 'g0 / g16 · 斜体';      // 注释与强调文本。
content    = 'g0 / g16 · 常规';      // 默认代码、字面量、参数值与普通正文。
auxiliary  = 'g3 / g13 · 常规';      // 类型、修饰符、命名空间与参数标签。
structure  = 'g6 / g10 · 常规';      // 分隔符、引号、排版与引用。
// Diff：上下文用 content，新增用 execution，修改用 navigation，删除用 g6 / g10 加删除线。
```

语义以真实语法 scope 为依据；新增语言先复用通用层级，再补必要例外。语法粒度决定可区分范围，如 Python 部分类型括号、YAML 带引号的键、SQL 共用标记及 Mermaid 控制标记。具体例外与原因在代码中维护。

Vue 使用 Shiki 内置语法，HTML 回退中的流程指令采用导航色，未细分的属性整体采用阅读主体，插值正文沿用数据正文。`.tex` 示例使用 `latex` 围栏，测试同时覆盖基础 `tex` 语法。

默认中性文字在代码画布上通过 `4.5:1` 检查，亮色导航字色约 `3.75:1`，作为实测值记录。修改后运行 `node --test tests/shiki.test.mjs`，验证真实语法、亮暗层级、字形与变量主题，再重新构建 JSON。

## Mermaid 配色

[`mermaid.mjs`](../mermaid.mjs) 将 `createPeleTheme()` 的结构、强调、分类色和实底字色映射到 Mermaid 12.2.0 的 `base` 主题。生成器只输出配置，渲染器加载、调色与重绘由使用方负责。

`cScale*`、`git*` 与实底字色显式赋值，读取 12 档的图表循环使用八色。饼图使用 `pieOpacity: 1` 和深色端点文字，其余透明度沿用渲染器。旅程图角色使用前六色；`themeCSS` 补充旅程标签和时间线连线样式。

甘特普通任务使用强调色，关键任务使用关键状态色；`active / done` 共用中性底和正文色，以描边区分状态。升级时复核变量名、SVG 类名与自动派生行为，用真实 Mermaid 检查最终图表；本项目测试负责映射与独立 JSON 导出。

## Pele 配色

[`pele.mjs`](../pele.mjs) 提供 7 个结构色、3 个强调／状态色和 8 个分类色。普通描边取亮色 `g7`、暗色 `g9`；强调与关键状态分别取亮色 `light / brand`、暗色 `light / lighter`。实底文字从深浅端点选择，填充透明度沿用 Pele SVG。

[`css.mjs`](../css.mjs) 在支持悬停的设备上强调当前对象的描边、箭头或纯文字，保留填充与相邻对象。[`withPeleHitAreas()`](../pele-svg.mjs) 为 Pele 连线和 XY 折线添加连续透明命中路径，线宽 `10px`，显示路径与可访问性 ID 保持原样；调用方负责 SVG 的可信性检查。

[`oklch.mjs`](../oklch.mjs) 从品牌基准色的色相环等分衍生八色：

```js
hueOffsets = [40, 80, 120, 160, 200, 240, 280, 320]; // 0° 留给品牌基准色。
lightness = 0.74;
chroma = 0.16;
darkLightnessOffset = -0.04; // 校正后降低明度，保留色相与分类编号。
// 超出 sRGB 时降低彩度；分类实底文字对比目标：亮色 7:1，暗色 4.5:1。
```

转换采用 [Oklab 原作者矩阵](https://bottosson.github.io/posts/oklab/)，中性品牌色使用默认色相起点。更换品牌色时重新生成，更换深色端点时重新适配；字色以各主题实际 HEX 计算。

色觉检查使用 [Machado 等人（2009）](https://doi.org/10.1109/TVCG.2009.113) 严重度 100 的三类矩阵，作用于线性 RGB。普通色觉与各类模拟分别检查 28 对颜色，`ΔE_OK × 100` 工程参考值为 8 与 4.5。

校正最多三轮，色相偏移限 ±12°、距品牌色至少 28°，明度变化限 ±0.06、彩度降低限 0.02；候选需改善距离短缺并保持文字对比度。`colors.json` 记录校正前后距离、调整量和剩余冲突，结论限于所用模拟与不透明实底；自定义端点接近时仍可能达不到对比目标。

Pele 饼图内侧数字使用深色字加浅色描边，以适应缺少系列索引的标签结构。图内显式 `style / classDef` 可覆盖主题；适配器保持透明分组与事件卡片的原始填充。
