import { describe, expect, it } from 'vitest';

/**
 * 运行时分流回归测试。
 *
 * 设计原因：
 * - 这条用例用于确保纯逻辑测试确实运行在 `node` 环境
 * - 一旦未来配置回退成全局 `jsdom`，这里会第一时间失败
 */
describe('Vitest logic 环境', () => {
  it('纯逻辑测试默认不注入浏览器全局对象', () => {
    expect('window' in globalThis).toBe(false);
    expect('document' in globalThis).toBe(false);
  });
});
