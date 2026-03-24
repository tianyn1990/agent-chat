import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createStarOfficeMockPlugin } from './src/mocks/starOffice/vitePlugin';
import { createStarOfficeRealDevPlugin } from './src/mocks/starOffice/realSidecarPlugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 读取开发期环境变量，用于注入本地 Star-Office mock adapter 路由。
  const env = loadEnv(mode, process.cwd(), '');
  const starOfficeMockBase = (env.VITE_STAR_OFFICE_MOCK_BASE || '/__mock/star-office').trim();
  const starOfficeRealDevBase = (env.VITE_STAR_OFFICE_REAL_DEV_BASE || '/star-office').trim();
  const starOfficeRealDevEnabled = env.VITE_STAR_OFFICE_REAL_DEV_ENABLED === 'true';
  const starOfficeUpstreamDir = (env.VITE_STAR_OFFICE_UPSTREAM_DIR || '/tmp/Star-Office-UI').trim();

  return {
    plugins: [
      react(),
      createStarOfficeRealDevPlugin({
        enabled: starOfficeRealDevEnabled,
        basePath: starOfficeRealDevBase,
        upstreamDir: starOfficeUpstreamDir,
      }),
      createStarOfficeMockPlugin({
        mockBase: starOfficeMockBase,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          // 开启 Less 中的 JavaScript 支持（Ant Design 需要）
          javascriptEnabled: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('@antv/g2')) return 'vendor-g2';
            if (id.includes('@antv/s2') || id.includes('@antv/s2-react')) return 'vendor-table';
            if (
              id.includes('react-markdown') ||
              id.includes('remark-gfm') ||
              id.includes('react-syntax-highlighter')
            ) {
              return 'vendor-markdown';
            }
            if (id.includes('antd') || id.includes('@ant-design/icons') || id.includes('rc-')) {
              return 'vendor-antd';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        // 代理 HTTP API 请求到后端
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        // 代理 WebSocket 连接到后端
        '/ws': {
          target: 'ws://localhost:8080',
          ws: true,
        },
      },
    },
  };
});
