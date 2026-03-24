import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // 使用 jsdom 模拟浏览器环境
    environment: 'jsdom',
    // 全局注入 vitest API（describe, it, expect 等）
    globals: true,
    // 测试前的全局初始化文件
    setupFiles: ['./tests/setup.ts'],
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
