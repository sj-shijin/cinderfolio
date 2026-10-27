# Cinderfolio

以深色、浅色和品牌基准色三个输入生成统一配色，导出 Rspress、Pele、Mermaid、Shiki 与 Marp 主题。包含十六等分灰阶、五档强调色系、亮暗职责映射和从品牌基准色衍生的八个分类色。

[源码](https://github.com/sj-shijin/cinderfolio) · [在线调色与预览](https://shijin.space/projects/cinderfolio/)

```js
const input = { ink: '#121212', paper: '#fafaf8', accent: '#f97316' };
```

中文名称统一为：`gray` 是灰阶，`accent` 是强调色系，`brand` 是其中的品牌基准色。输入字段 `accent` 指定品牌基准色；`createAccentScale()` 以它为起点生成 `darker / dark / brand / light / lighter` 五档，`brand` 的明度偏移为零。图表中区分类别的八色称为“分类色”，不归入强调色系的五档。

## 生成主题

统一使用 Node.js 22.12+（推荐 24）。生成 CSS / JSON 仅使用 Node.js 内置模块，无需安装依赖。

```sh
git clone https://github.com/sj-shijin/cinderfolio.git
cd cinderfolio
```

```sh
npm run build                         # 更新 dist/ 中的主题文件，保留其他内容
npm run check                         # 核对产物及默认配色对比度
node build.mjs --out-dir /tmp/cf-theme # 指定输出目录
```

```text
dist/
  colors.css             # 通用 --cf-* 变量，data-cinderfolio 控制亮暗
  colors.json            # 色阶、职责、HEX 与对比度记录
  cf-rspress.css         # Rspress 主题，跟随 html.rp-dark
  cf-pele.css            # 独立 Pele SVG 主题
  cf-mermaid-light.json  # Mermaid 官方渲染器亮色配置
  cf-mermaid-dark.json   # Mermaid 官方渲染器暗色配置
  cf-shiki-light.json    # Shiki 亮色主题，具体 HEX
  cf-shiki-dark.json     # Shiki 暗色主题，具体 HEX
  cf-marp.css            # Marp 主题，包含 Pele / Shiki / 算法样式
  cf-pseudocode.css      # 算法排版，复用已有 --cf-* 变量
  LICENSE               # 分发主题时一并保留
```

修改默认颜色时编辑 `palette.mjs` 的 `seeds`；运行时生成可直接传入三个颜色。Rspress、Pele 与 Marp CSS 包含配色变量，不要求同时加载 `colors.css`；算法样式复用页面已有的变量。

### 网页下载的使用范围

下载文件保存调色栏的当前配色，未启用 JavaScript 时提供默认配色。文件可脱离本站使用，但渲染器、主题切换逻辑和字体由使用方提供：

- **Rspress**：`cf-rspress.css` 包含亮暗变量及组件样式，加载在 Rspress 原生样式之后，跟随 `html.rp-dark`。代码高亮另配 Shiki JSON；不包含本站字体与页面组件。
- **Pele**：`cf-pele.css` 包含全部颜色与 SVG 规则。内联 SVG 或外层容器添加 `cinderfolio-pele`，并设置 `data-cinderfolio="light"` 或 `"dark"`；外部 SVG 需在自身文档中包含样式。加宽连线命中区另需 `withPeleHitAreas()`，不影响基本配色。
- **Mermaid**：`cf-mermaid-light.json` / `cf-mermaid-dark.json` 可直接传给 `mermaid.initialize()`；切换主题后重新渲染。JSON 内使用具体颜色，不依赖 `--cf-*`。
- **Shiki**：`cf-shiki-light.json` / `cf-shiki-dark.json` 可作为自定义主题加载；语言语法由 Shiki 提供。两份 JSON 使用具体颜色，不依赖本站 CSS；同时输出两套主题时，按 [Shiki 双主题方式](https://shiki.style/guide/dual-themes)切换显示。
- **Marp**：`cf-marp.css` 提供配色和版式，可作为原生 Marp 主题加载。CSS 不包含字体文件、渲染器或 Markdown 解析扩展；完整效果使用下方的 Cinderfolio 构建入口。
- **Pseudocode**：`cf-pseudocode.css` 是共用算法样式，需要 `colors.css` 或宿主提供配色变量，并配套公式引擎的 CSS 与字体，网页暂不提供单独下载。接入方式见[论文式伪代码](#论文式伪代码)。

## 在其他项目使用

可将仓库作为固定版本的子模块，再通过本地包依赖使用；当前未发布到 npm：

```sh
# 在使用方项目根目录执行。
git submodule add https://github.com/sj-shijin/cinderfolio.git cinderfolio
npm install ./cinderfolio
npm --prefix cinderfolio run build

# 其他人克隆使用方项目后，先还原子模块，再安装依赖。
git submodule update --init cinderfolio
npm ci
```

也可以直接 `npm install /path/to/cinderfolio` 引用已有的本地检出目录。

先在 Cinderfolio 中运行 `npm run build`，再引用 `cinderfolio/themes/*` 静态产物。JavaScript 入口可在 Node.js 或支持打包的浏览器项目中使用：

```js
import { createRspressCss } from 'cinderfolio/rspress';
import { createPeleCss } from 'cinderfolio/css';
import { createShikiTheme } from 'cinderfolio/shiki';
import { createMermaidTheme } from 'cinderfolio/mermaid';
import { createMarpCss } from 'cinderfolio/marp';

const input = { ink: '#121212', paper: '#fafaf8', accent: '#f97316' };
const rspressCss = createRspressCss(input);
const peleCss = createPeleCss(input);
const marpCss = createMarpCss(input);
const shikiLight = createShikiTheme(input, 'light');
const shikiDark = createShikiTheme(input, 'dark');
const mermaidLight = createMermaidTheme(input, 'light');
const mermaidDark = createMermaidTheme(input, 'dark');
```

Rspress 主题入口中加载 `cinderfolio/themes/cf-rspress.css`，Shiki 配置使用上述亮暗主题对象。需要实时调色时，`createShikiTheme(input, mode, { variables: true })` 可生成引用通用色阶变量的主题；独立 JSON 默认使用 HEX。

官方 `<Tabs className="cf-tabs">` 可选用统一配色：标签栏使用浅层底色，选中项使用画布底色，内层 Tabs 自动沿用。规则包含在 `cf-rspress.css` 中，文字、阴影、交互和换行继续使用 Rspress 默认实现。

Pele 渲染后的内联 SVG 可以直接加载导出的 CSS：

```html
<link rel="stylesheet" href="./cf-pele.css" />
<figure class="cinderfolio-pele" data-cinderfolio="dark">
  <!-- 插入 Pele render(source).svg -->
</figure>
```

类名与主题属性也可放在 SVG 根元素上。通过 `<img>` 引用的外部 SVG，需要在 SVG 自身文档中包含样式。

需要扩大连线的鼠标命中范围时，在插入 SVG 前调用同包的辅助函数。它添加连续的透明命中层，配合 `cf-pele.css` 覆盖线条两侧和虚线空隙，保留默认显示线宽：

```js
import { render } from 'pele';
import { withPeleHitAreas } from 'cinderfolio/pele';

const svg = withPeleHitAreas(render(source).svg);
```

## 论文式伪代码

`pseudocode` 围栏使用 pseudocode.js 2.4.1 的 `algorithmic` 语法。每个围栏放一个算法，支持标题、行号、输入输出、嵌套缩进和行内公式；普通 `python` 等围栏仍交给 Shiki。

````markdown
```pseudocode
\begin{algorithm}
\caption{Conflict check}
\begin{algorithmic}
\INPUT Conflict clause $C$
\IF{$C \ne \mathrm{None}$}
  \RETURN $C$
\ENDIF
\end{algorithmic}
\end{algorithm}
```
````

Marp 引擎自动处理此围栏，公式和算法文字跟随文稿的 `math: katex` 或 `math: mathjax`。也可使用 `pseudocode math=katex` / `pseudocode math=mathjax` 显式指定某个算法的引擎。默认遵循 Marp 的 MathJax 设置。

横线粗细、标题间距与行距遵循 pseudocode.js 原始样式；三条横线统一使用 `--cf-text-muted`，比正文淡三级。关键词通过 `light-dark()` 读取 `--cf-accent-darker` 与 `--cf-accent-light`，分别用于浅色与深色主题，与 Shiki 的流程导航色一致。Cinderfolio 将 `noEnd` 与 `scopeLines` 统一默认为 `true`：隐藏 `end if` 等结束行，显示缩进竖线。可在围栏中显式设为 `false`，也可传给 `renderPseudocode()`；算法源文仍须保留结束命令。行号沿用官方演示的开启设置，编号按文档重新计数。

算法容器单独设置字体、字重、字号、行高和文本对齐；网页默认字号为 `1rem`，Marp 默认 `24px`，行高固定为官方的 `1.2`。Marp 的正文或 `compact` 字号不会改变算法。按需设置 `--cf-pseudocode-font-size` 即可独立缩放算法文字与缩进：

```css
/* Marp 文稿内可按页面类名限定作用范围。 */
section.algorithm-page { --cf-pseudocode-font-size: 20px; }
```

这是普通 HTML 的排版隔离，仍可选择和复制文字，也沿用 Marp 的 PDF 导出；不阻止自定义 CSS 直接覆盖算法元素。

KaTeX 模式的算法文字使用 KaTeX Main；MathJax 3.2.2 模式使用 MathJax TeX 的 Main 字体，公式由对应引擎排版。数学变量与符号保留引擎原生字形；中文使用 `--cf-pseudocode-cjk` 指定的后备字体（Marp 为 Noto Sans SC）。关键词、行号和缩进线继续读取 Cinderfolio 颜色变量。独立 HTML 内嵌两套本地公式字体，切换文稿引擎后重新构建即可，也支持原生 watch。

其他 Markdown 构建器可在高亮之前调用共享接口：

```js
import { renderPseudocode } from 'cinderfolio/pseudocode-render';
const html = renderPseudocode(source, 1, { math: 'mathjax' });
// 第二参数为当前文档内的算法编号；math 默认 katex。
```

网页加载 `cinderfolio/themes/cf-pseudocode.css` 并提供 Cinderfolio 配色变量。KaTeX 公式配套加载项目本地的 `katex/dist/katex.min.css`；MathJax 公式配套使用 `pseudocodeMathCss('mathjax')` 生成的静态 CSS（包含本地字体与许可）。两种引擎的算法都在构建期生成 HTML，浏览器无需加载 pseudocode.js 或 MathJax；源 Markdown 保留原始围栏。

配合 `cf-rspress.css`，网页算法具有与代码块一致的细边框、圆角和留白；算法作为 Tab 的唯一内容时共用标签外框，多块内容则各自保留边框。网页外框由 Rspress 适配层提供，Marp 保留算法自身的论文式排版。

网站可传入 `pseudocodeMathCss('mathjax', { fontURL: './mathjax-fonts' })`，将 `mathjax-full/es5/output/chtml/fonts/woff-v2/` 部署到对应目录，并将 `cinderfolio/fonts/mathjax-text/` 部署到其 `text/` 子目录，让字体按需加载、独立缓存；省略 `fontURL` 则内嵌字体。

MathJax 3 的公式字体采用接近零的垂直度量，不能直接用作普通文字。算法文字使用同系列、具有正常度量的原始 TeX 字体；公式保留 MathJax 3.2.2 自带字体与定位。来源、许可与校验和见 [`fonts/mathjax-text/`](fonts/mathjax-text/README.md)。

pseudocode.js 同时发现两个引擎时会优先 KaTeX，因此 MathJax 模式在隔离上下文中加载上游原始浏览器包，只提供 MathJax 的 `tex2chtml` 适配。没有修改依赖源码，也不切换进程全局变量。上游字体命令写入的 KaTeX 字体名在输出中映射为引擎对应的 CSS 变量。

## Mermaid

两份 `cf-mermaid-*.json` 是 Mermaid 官方的完整主题配置，使用 `base` 与 `classic`，颜色均为具体 HEX。使用方安装 Mermaid 后直接传给初始化入口：

```js
import mermaid from 'mermaid';
import { createMermaidTheme } from 'cinderfolio/mermaid';

mermaid.initialize({ ...createMermaidTheme(input, 'light'), startOnLoad: false });
const { svg } = await mermaid.render('diagram-id', source);
```

也可读取导出的 JSON 代替生成函数。切换亮暗后由使用方应用对应配置并重新渲染；生成主题本身不依赖 Mermaid、DOM 或网站代码。适配以 Mermaid 12.2.0 验证，运行环境同样使用 Node.js 22.12+。通用主题不附带字体文件。

## Marp

```sh
npm ci        # 安装锁定依赖
npm run marp  # 一次性构建 examples/marp.html，完成后退出
```

`examples/marp.md` 是 Cinderfolio-Marp 使用演示，分为快速开始、特性展示、标准 Markdown、扩展 Markdown、原生 Marp 五章。特性章介绍封面、过渡页与内容布局；标准章展示核心语法，并在代码块示例中介绍 Shiki 高亮；扩展章展示表格、行内标记、公式、Mermaid 图表、论文式伪代码与标注块，随示例介绍 Pele、pseudocode.js 的渲染职责。文档与单页配置、图片尺寸、分步列表放在原生 Marp 章。任务列表与脚注仅列写法，尚未启用。

默认源文件是仓库已有的 `examples/marp.md`，HTML 生成在它旁边，可在浏览器中打开。修改文稿后重新运行 `npm run marp`；比例跟随文稿里的 `size`。字体固定为 Inter、Noto Sans SC、Sarasa Mono SC，直接引用仓库内的 WOFF2。

编辑时可选用 [Marp CLI 原生 watch / preview](https://github.com/marp-team/marp-cli#watch-mode)，保存 Markdown 后自动重建并刷新页面。自动打开窗口需要本机已安装 Chrome、Edge 或 Firefox：

```sh
npm run marp-preview              # 持续监听，并打开预览窗口
npm run marp-preview -- --no-open  # 持续监听，自行在浏览器中打开 HTML
```

预览命令会持续运行，在终端按 `Ctrl+C` 停止。通过 AI 助手启动时，应报告进程是否仍在运行及停止方式；环境回收后台任务后，HTML 仍可打开，但不再自动刷新。

需要交付 HTML 时，先停止监听，再运行 `npm run marp`，生成不带自动刷新连接的版本。

构建验收检查 HTML 已生成、翻页正常、字体与图片加载成功，以及影响渲染的控制台错误。验证自动刷新时，应实际打开 HTML，临时修改并保存文稿，确认页面无需手动刷新就更新，随后恢复修改。无法访问浏览器时，如实说明已验证和未验证的部分。`npm test` 用固定小文稿验证分页、章节跳转与布局作用域；正式演示只检查编译、渲染接入、章节链接与资源完整性，不固定其页数和章节位置。

监听范围是 Markdown 和本次生成的主题 CSS；单独替换图片后手动刷新，修改主题生成器或渲染引擎后重启预览。`npm run build` 只更新主题文件，不删除 `dist/marp/` 等其他内容。

```yaml
---
marp: true
theme: cinderfolio
size: 16:9 # 或 4:3
transition: fade 300ms # HTML 翻页淡入淡出
---
```

示例全篇使用 300 毫秒淡入淡出，由 Marp CLI 的官方播放器处理；PDF 保持静态。其他效果与局部设置见[官方转场文档](https://github.com/marp-team/marp-cli/blob/main/docs/bespoke-transitions/README.md)。

`cf-marp.css` 可由 Marp Core / CLI 加载，亮暗随 `prefers-color-scheme`，嵌入时可继承外层的 `color-scheme`。单独 CSS 不内嵌字体；其他渲染入口还需加载 `fonts/marp/font.css` 及同目录 WOFF2。

标题约定：封面 `#`、正文与过渡页页题 `##`、页内小标题 `###`；分页仍使用 `---`。封面可写成 `# 报告标题 <small>副标题</small>`，省略 `small` 即只有主标题；主标题自身居中，副标题不参与定位，纯主题 CSS 即可使用。

正文默认使用常规布局；单页添加 `compact` 收紧正文，标题、强调线和正文起点不动，分栏继续使用 `cf-cols / cf-col`：

```markdown
<!-- _class: compact -->

## 页标题

正文内容。
```

代码块、Pele 图表与通用 SVG 默认不设固定限高，保留横向防溢出和 Marp 原生缩放。需要调整单页字号或图表尺寸时，使用 Markdown 中的 `<style scoped>`；示例见[维护文档](docs/maintenance.md)。

使用标注块突出结论或补充说明，可直接放入 `cf-col`：

```markdown
> [!IMPORTANT]
> **核心结论：** 分层处理减少了重复计算。

> [!NOTE]
> 结果基于相同数据与硬件。
```

`IMPORTANT` 使用强调色边框与淡强调底色，默认不加标题；`NOTE / TIP / WARNING / CAUTION` 分别显示“说明／提示／注意／警告”。小号提示标题使用端点文字色与字重，强调色用于边框和底色；正文继承文字颜色，普通引用保留原有样式。

行内支持 `==高亮==`、`x^2^`、`H~2~O`。高亮复用淡强调色并保留原字色；上下标使用原生 `sup / sub` 排版，复杂表达式使用数学公式。

构建任意已有的 Markdown 文稿，自动加载同一配色、字体、Pele、Shiki 和 Markdown 扩展，无需先运行 `npm run build`：

```sh
npm run marp -- /path/to/talk.md          # 在源文件旁生成 talk.html
npm run marp-preview -- /path/to/talk.md  # 构建、打开窗口并监听
npm run marp -- --help
```

源文件不改写，图片等资源保持原有路径，不复制或搬动；无需名为 `assets/` 的目录。`./figures/a.png`、`../images/b.svg` 等相对引用都以 HTML 所在目录解析。路径包含空格时加引号。

字体声明写入 HTML，字体文件仍从 Cinderfolio 安装目录读取；分享 HTML 时，需要自行保留它引用的素材和字体路径。`-o /path/to/talk.html` 可另行指定 HTML 位置，此时相对素材路径也由使用方安排。

作为本地依赖安装后，可运行 `npx --no-install cinderfolio-marp /path/to/talk.md --preview`，或通过 JavaScript 调用：

```js
import { buildMarp } from 'cinderfolio/marp-build';

await buildMarp('./talk.md'); // 返回同目录 HTML 的绝对路径
```

`buildMarpExample(outputDirectory, { fontDirectory })` 保留网站使用的双比例渲染入口，资源打包由网站负责。`cinderfolio/marp-engine` 仍可作为原生 Marp CLI 配置使用。这些渲染入口需要安装 Marp CLI、Pele 和 Shiki；它们不参与纯主题导出。

### 适配范围

- Marp 的[分割背景图](https://marpit.marp.app/image-syntax?id=split-backgrounds)（`![bg left]`、`![bg right]` 及占比设置）会改变正文区域，与本主题固定的标题、贯穿强调线和页眉页脚布局尚未完整适配；图文并排优先使用 `cf-cols / cf-col`。
- 任务列表、脚注尚未启用；示例只展示写法。

[Marp for VS Code](https://github.com/marp-team/marp-vscode#use-custom-theme-css) 可通过 `markdown.marp.themes` 加载 `dist/cf-marp.css`，封面与其他版式均只需主题 CSS。当前官方扩展未提供自定义引擎配置入口，加载 CSS 不会接入 Pele、Shiki、标注块、行内标记扩展或本地字体。完整预览与导出仍在集成终端运行上述 CLI 路线；编辑器内的进一步适配尚未接入。

## 维护与许可

模块职责、算法、语法规则和字体更新见 [维护文档](docs/maintenance.md)。

原创代码、主题和文档使用 [MIT 许可](LICENSE)。CSS 导出包含许可文本；分享 Shiki、Mermaid JSON 或其他产物时同时附带 `LICENSE`。

- 字体保留各自的 SIL Open Font License，许可证、来源与哈希位于 `fonts/marp/`，不改授 MIT。
- 示例图片的作者、来源与授权链接见 `examples/assets/SOURCE.json`，图片不在 MIT 授权范围内。
- Marp、Pele、Shiki 等依赖遵循各自许可证。
