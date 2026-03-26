import { describe, expect, it } from 'vitest';

/**
 * UI 环境回归测试。
 *
 * 设计原因：
 * - 组件测试仍然必须保留 `jsdom`
 * - 同时要确认浏览器 stub 仍被正确注入，避免拆分环境后 UI 测试隐性失效
 */
describe('Vitest UI 环境', () => {
  it('组件测试仍运行在 jsdom，并保留浏览器 stub', () => {
    expect('window' in globalThis).toBe(true);
    expect(window.localStorage).toBeDefined();
    expect(window.matchMedia('(min-width: 1024px)').matches).toBe(false);
  });
});
