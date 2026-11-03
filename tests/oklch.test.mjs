import assert from 'node:assert/strict';
import test from 'node:test';
import { seeds } from '../palette.mjs';
import { toOklch, fromOklch, simulateColorVision, checkColorVision, createCategoricalPalette, seriesRecipe } from '../oklch.mjs';

test('OKLCH 转换核对标准红色，并保持 sRGB 往返与色域内输出', () => {
  const red = toOklch('#ff0000');
  assert.ok(Math.abs(red.l - 0.628) < 0.001);
  assert.ok(Math.abs(red.c - 0.258) < 0.001);
  assert.ok(Math.abs(red.h - 29.23) < 0.05);
  for (const hex of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#f97316', '#15f9ad']) {
    assert.equal(fromOklch(toOklch(hex)), hex);
  }
  const fitted = toOklch(fromOklch({ l: 0.7, c: 0.4, h: 240 }));
  assert.ok(Math.abs(fitted.l - 0.7) < 0.003);
  assert.ok(Math.abs(fitted.h - 240) < 1);
  assert.ok(fitted.c < 0.4);
});

test('Machado 严重度 100 矩阵在线性 RGB 中模拟，保持黑白中性', () => {
  const red = { protanopia: '#6d5f00', deuteranopia: '#a39000', tritanopia: '#ff000f' };
  for (const [model, expected] of Object.entries(red)) {
    assert.equal(simulateColorVision('#ff0000', model), expected);
    assert.equal(simulateColorVision('#000000', model), '#000000');
    assert.equal(simulateColorVision('#ffffff', model), '#ffffff');
  }
  // 八色必须检查所有 28 对，不能只比较相邻色。
  for (const report of Object.values(checkColorVision(Array(8).fill('#f97316')).models)) {
    assert.equal(report.conflicts.length, 28);
    assert.equal(report.minimum, 0);
  }
});

test('多种品牌色保留主题明度和彩度上限，色觉检查只报告最终颜色', () => {
  for (const accent of ['#f97316', '#0095ff', '#15f9ad', '#8b5cf6']) {
    const input = { ...seeds, accent };
    const result = createCategoricalPalette(input);
    assert.deepEqual(createCategoricalPalette(input), result);
    assert.equal(new Set(Object.values(result.colors)).size, 8);
    assert.deepEqual(result.vision.models, checkColorVision(Object.values(result.colors)).models);
    const brand = toOklch(accent);
    for (const [key, value] of Object.entries(result.series)) {
      const fill = toOklch(result.colors[key]);
      assert.ok(Math.abs(fill.l - brand.l) < 0.003, `${accent}.${key}.l`);
      assert.ok(fill.c <= brand.c + 0.002, `${accent}.${key}.c`);
      // 色域适配与 HEX 量化后仍保留指定色相；允许不足 1° 的量化误差。
      const expectedHue = brand.h + value.hueOffset;
      assert.ok(Math.abs((fill.h - expectedHue + 540) % 360 - 180) < 1, `${accent}.${key}.h`);
    }
  }
});

test('九等分排除品牌色相，交错输出八个固定槽位，中性品牌色采用默认色相', () => {
  assert.deepEqual(seriesRecipe.hueOffsets, [40, 80, 120, 160, 200, 240, 280, 320]);
  assert.deepEqual(seriesRecipe.order, [2, 4, 6, 8, 1, 3, 5, 7]);
  const original = createCategoricalPalette(seeds);
  assert.deepEqual(Object.values(original.series).map(s => s.hueOffset), [80, 160, 240, 320, 40, 120, 200, 280]);
  const neutral = createCategoricalPalette({ ...seeds, accent: '#808080' });
  assert.equal(neutral.vision.neutralBrand, true);
  assert.equal(neutral.vision.anchor, original.vision.anchor);
  assert.deepEqual(Object.values(neutral.colors), Array(8).fill('#808080'));
});
