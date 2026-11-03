/** Typst 原生颜色模块与绘图提示词；生成过程不依赖 Typst 编译器。 */
import { seeds, recipes, createPalette } from './palette.mjs';
import { createCategoricalPalette } from './oklch.mjs';
import { licenseComment } from './license.mjs';

export const typstVersion = '0.14.2';
export const cetzVersion = '0.5.2';

const typstName = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

export function createTypstTheme(input = seeds) {
  const themes = createPalette(input);
  const series = Object.values(createCategoricalPalette(input).colors);
  const colors = mode => [
    ...Object.entries(themes[mode]).map(([key, color]) =>
      `    ${typstName(key)}: rgb("${color}"), // ${recipes[key].label}`),
    `    series: (${series.map(color => `rgb("${color}")`).join(', ')}),`,
  ].join('\n');
  return `${licenseComment}
// Cinderfolio / Typst ${typstVersion} / CeTZ ${cetzVersion}
// 下载时的种子：ink=${input.ink}, paper=${input.paper}, accent=${input.accent}
// 导入：#import "相对路径/cinderfolio.typ": cf-palette
// 用法：#let cf = cf-palette(mode: "light")；暗色改为 "dark"。
// 文字：#set text(fill: cf.foreground)；次要说明用 cf.text-muted。
// 节点用 cf.surface 填充、cf.diagram-stroke 描边；重点用 cf.interaction。
// 分类色使用 cf.series.at(0) 至 cf.series.at(7)，同类对象固定使用同一索引。
// mode 在编译时选择；修改配色文件或模式后重新编译。
#let cf-palette(mode: "light") = {
  assert(mode in ("light", "dark"), message: "mode must be light or dark")
  if mode == "dark" {(
${colors('dark')}
  )} else {(
${colors('light')}
  )}
}
`;
}

export function createTypstPrompt(input = seeds) {
  const pageUrl = 'https://shijin.space/projects/cinderfolio/typst-cetz/';
  const isDefault = Object.keys(seeds).every(key => input[key] === seeds[key]);
  const download = isDefault
    ? `下载配色模块并保存为 cinderfolio.typ：\n${new URL('/cinderfolio/cinderfolio.typ', pageUrl).href}`
    : `在该页面将深色设为 ${input.ink}、浅色设为 ${input.paper}、品牌基准色设为 ${input.accent}，点击“下载 cinderfolio.typ”，保存到绘图项目中，并核对文件注释中的种子值。`;
  return `请先阅读 Cinderfolio 的 Typst/CeTZ 使用说明：
${pageUrl}

${download}

按照页面用法和模块注释，使用 Typst + CeTZ 完成我接下来描述的图示。输出可编辑的 Markdown typst 代码围栏，并编译检查。
`;
}
