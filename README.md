# Cinderfolio

以深色、浅色和品牌基准色生成统一配色，导出 Rspress、Pele、Mermaid、Shiki 与 Marp 主题。包含十六等分灰阶、五档强调色系、亮暗职责映射和八个分类色。

[源码](https://github.com/sj-shijin/cinderfolio) · [在线调色与预览](https://shijin.space/projects/cinderfolio/) · [维护文档](docs/maintenance.md) · [开发约定](AGENTS.md)

## 生成主题

使用 Node.js 22.12+（推荐 24）。CSS / JSON 生成只使用 Node.js 内置模块：

```sh
git clone https://github.com/sj-shijin/cinderfolio.git
cd cinderfolio
npm run build                        # 更新 dist/ 主题文件，保留其他产物
npm run check                        # 核对产物与默认配色对比度
node build.mjs --out-dir /tmp/cf-theme # 指定输出目录
```

```text
dist/
  colors.css             # 通用 --cf-* 变量，data-cinderfolio 控制亮暗
  colors.json            # 色阶、职责、HEX 与对比度
  cf-rspress.css         # Rspress 样式，跟随 html.rp-dark
  cf-pele.css            # Pele SVG 样式
  cf-mermaid-light.json  # Mermaid 亮色配置
  cf-mermaid-dark.json   # Mermaid 暗色配置
  cf-shiki-light.json    # Shiki 亮色主题
  cf-shiki-dark.json     # Shiki 暗色主题
  cf-marp.css            # Marp 主题，含 Pele、Shiki 与算法样式
  cf-pseudocode.css      # 算法样式，复用宿主 --cf-* 变量
  LICENSE               # 随产物分发的许可
```

默认输入在 `palette.mjs` 的 `seeds` 维护，运行时可传入自定义颜色：

```js
const input = { ink: '#121212', paper: '#fafaf8', accent: '#f97316' };
// accent 指定品牌基准色，生成 darker / dark / brand / light / lighter 五档强调色。
```

## 在其他项目使用

当前通过仓库或本地目录分发。作为固定版本子模块接入：

```sh
# 在使用方项目根目录运行。
git submodule add https://github.com/sj-shijin/cinderfolio.git cinderfolio
npm install ./cinderfolio
npm --prefix cinderfolio run build

# 克隆使用方项目后还原固定版本。
git submodule update --init cinderfolio
npm ci
```

已有本地仓库也可用 `npm install /path/to/cinderfolio` 接入。静态文件从 `cinderfolio/themes/*` 加载；JavaScript 入口支持 Node.js 及带打包器的浏览器项目：

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

### 网页下载的使用范围

网页下载保存当前配色，静态链接提供默认配色。Rspress、Pele、Marp CSS 自带颜色变量；Shiki、Mermaid JSON 使用具体 HEX。使用方提供渲染器、字体与亮暗切换逻辑，CSS 与解析扩展分别接入。

Rspress 在原生样式后加载 `cf-rspress.css`，Shiki 另配主题对象或 JSON；官方 `<Tabs className="cf-tabs">` 可选用统一配色，保留原生交互。实时调色使用 `createShikiTheme(input, mode, { variables: true })`；同时输出两套高亮时按 [Shiki 双主题方式](https://shiki.style/guide/dual-themes)切换。

Pele 内联 SVG 使用 `cinderfolio-pele` 与 `data-cinderfolio`，也可将二者放在 SVG 根元素：

```html
<link rel="stylesheet" href="./cf-pele.css" />
<figure class="cinderfolio-pele" data-cinderfolio="dark">
  <!-- 插入 Pele render(source).svg -->
</figure>
```

外部 SVG 将样式放入自身文档。需要加宽连线的鼠标命中区时，在插入前添加透明命中层，显示线宽保持原样：

```js
import { render } from 'pele';
import { withPeleHitAreas } from 'cinderfolio/pele';

const svg = withPeleHitAreas(render(source).svg);
```

## Mermaid

`cf-mermaid-light.json` / `cf-mermaid-dark.json` 使用官方 `base` 主题与 `classic` 风格，可直接传入初始化入口；也可按当前配色生成：

```js
import mermaid from 'mermaid';
import { createMermaidTheme } from 'cinderfolio/mermaid';

mermaid.initialize({ ...createMermaidTheme(input, 'light'), startOnLoad: false });
const { svg } = await mermaid.render('diagram-id', source);
```

适配以 Mermaid 12.2.0 验证。使用方安装渲染器，切换亮暗后应用对应配置并重新绘图。

## 论文式伪代码

`pseudocode` 围栏使用 pseudocode.js 2.4.1 的 `algorithmic` 语法，每个围栏放一个算法：

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

Marp 自动处理此围栏，公式跟随文稿的 `math` 设置（默认 MathJax）；围栏可指定 `math=katex` / `math=mathjax`。默认显示行号与缩进竖线、隐藏结束行，源文保留完整结束命令。用 `noEnd=false` / `scopeLines=false` 覆盖相应显示选项。

其他构建器在代码高亮前调用：

```js
import { renderPseudocode, pseudocodeMathCss } from 'cinderfolio/pseudocode-render';

const html = renderPseudocode(source, 1, { math: 'mathjax' });
// 第二参数为当前文档的算法编号；省略 math 时使用 katex。
const mathCss = pseudocodeMathCss('mathjax'); // 静态公式 CSS，默认内嵌本地字体与许可
```

网页加载 `cf-pseudocode.css` 并提供 `colors.css` 或宿主的配色变量；KaTeX 配套本地 `katex/dist/katex.min.css`，MathJax 配套上述静态 CSS。算法在构建期生成可选择、复制及打印的 HTML。样式与字体部署详见[算法渲染](docs/maintenance.md#算法渲染)。

## Marp

```sh
npm ci                                  # 安装锁定的渲染依赖
npm run marp                            # 生成 examples/marp.html 后退出
npm run marp -- /path/to/talk.md          # 在已有文稿旁生成 talk.html
npm run marp-preview -- /path/to/talk.md  # 构建、打开窗口并持续监听
npm run marp-preview -- --no-open         # 监听默认示例，自行打开 HTML
npm run marp -- --help
```

[`examples/marp.md`](examples/marp.md) 展示版式、标准与扩展 Markdown、原生 Marp。CLI 集成 Pele、Shiki、算法及 Markdown 扩展，字体使用仓库内的 Inter、Noto Sans SC、Sarasa Mono SC。

预览使用 [Marp CLI 原生监听](https://github.com/marp-team/marp-cli#watch-mode)，自动打开窗口需要 Chrome、Edge 或 Firefox；按 `Ctrl+C` 停止。监听对象为 Markdown 与生成的主题 CSS，替换图片后手动刷新，修改生成器或引擎后重启。后台进程结束后，已有 HTML 保持可读；交付时停止监听并运行一次 `npm run marp`，得到静态 HTML。

源 Markdown 与资源路径保持原样，HTML 默认写在源文稿旁；字体从 Cinderfolio 安装目录读取。分享时保留素材、字体路径及许可证，使用 `-o /path/to/talk.html` 更改输出位置时相应安排相对资源路径；含空格的路径加引号。

```yaml
---
marp: true
theme: cinderfolio
size: 16:9           # 或 4:3
transition: fade 300ms # HTML 转场，PDF 保持静态
---
```

标题使用封面 `#`、正文与过渡页 `##`、页内小标题 `###`，分页使用 `---`。封面副标题写作 `# 标题 <small>副标题</small>`。单页 `_class: compact` 收紧正文，分栏使用 `cf-cols / cf-col`，局部尺寸通过 `<style scoped>` 调整；[版式示例](docs/maintenance.md#marp-排版与渲染)包含完整写法。

行内扩展支持 `==高亮==`、`x^2^`、`H~2~O`。标注块可直接放入分栏：

```markdown
> [!IMPORTANT]
> **核心结论：** 分层处理减少了重复计算。

> [!NOTE]
> 结果基于相同数据与硬件。
```

`IMPORTANT` 使用强调色边框与淡底；`NOTE / TIP / WARNING / CAUTION` 分别显示“说明／提示／注意／警告”。

作为本地包可运行 `npx --no-install cinderfolio-marp /path/to/talk.md --preview`，或调用构建接口：

```js
import { buildMarp } from 'cinderfolio/marp-build';

await buildMarp('./talk.md'); // 返回同目录 HTML 的绝对路径
```

`buildMarpExample(outputDirectory, { fontDirectory })` 提供双比例样张接口，由使用方打包资源；`cinderfolio/marp-engine` 可作为 Marp CLI 引擎。渲染入口需要 Marp CLI、Pele 与 Shiki。

### 适配范围

- 原生 Marp Core / CLI 可加载 `cf-marp.css`；亮暗跟随 `prefers-color-scheme` 或外层 `color-scheme`，其他渲染入口配套加载 `fonts/marp/font.css` 与 WOFF2。
- [Marp for VS Code](https://github.com/marp-team/marp-vscode#use-custom-theme-css) 通过 `markdown.marp.themes` 加载主题 CSS；完整的解析扩展与字体预览使用上述 CLI。
- [分割背景图](https://marpit.marp.app/image-syntax?id=split-backgrounds)与固定页题布局存在兼容限制，图文并排使用 `cf-cols / cf-col`。任务列表、脚注在示例中仅作为语法示意。

## 维护与许可

实现、验证和字体更新见[维护文档](docs/maintenance.md)。原创代码、主题和文档使用 [MIT 许可](LICENSE)，CSS 导出包含许可文本，JSON 及其他产物分发时附带 `LICENSE`。

字体沿用各自 SIL Open Font License，许可证、来源与哈希位于 `fonts/`；示例图片的作者、来源和授权见 `examples/assets/SOURCE.json`；依赖遵循各自许可证。
