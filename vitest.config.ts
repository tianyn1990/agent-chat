import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    /**
     * 默认使用 node 环境。
     *
     * 设计原因：
     * - 纯逻辑测试占比更高，默认走 `node` 可以直接避开 `jsdom` 初始化成本
     * - 仅对真正依赖 DOM 的目录再按 glob 提升到 `jsdom`
     */
    environment: 'node',
    // 全局注入 vitest API（describe, it, expect 等）
    globals: true,
    // 测试前的全局初始化文件
    setupFiles: ['./tests/setup.ts'],
    /**
     * 按目录切分测试环境。
     *
     * 设计原因：
     * - 组件与页面测试仍需要 DOM
     * - stores / utils / mocks / services 不需要浏览器环境，不应再统一跑在 jsdom 中
     */
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
      ['tests/pages/**', 'jsdom'],
      ['tests/stores/useThemeStore.test.ts', 'jsdom'],
      ['src/components/**/__tests__/**', 'jsdom'],
    ],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
