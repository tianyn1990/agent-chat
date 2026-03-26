import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createStarOfficeMockPlugin } from './src/mocks/starOffice/vitePlugin';
import { createStarOfficeRealDevPlugin } from './src/mocks/starOffice/realSidecarPlugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 读取开发期环境变量，用于注入本地 Star-Office mock adapter 路由。
  /**
   * 同时合并 `.env*` 与当前进程环境变量。
   *
   * 设计原因：
   * - `dev-openclaw-direct.mjs` / `dev-openclaw-proxy.mjs` 会通过子进程 env 动态覆盖运行时
   * - 仅使用 `loadEnv()` 时，Vite config 只能读到 `.env*` 文件，拿不到脚本临时注入的变量
   * - 这会导致浏览器侧 runtime 是 proxy，但 dev server 侧并没有真正配置 `/__openclaw_proxy` 代理
   */
  const env = {
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  };
  const starOfficeMockBase = (env.VITE_STAR_OFFICE_MOCK_BASE || '/__mock/star-office').trim();
  const starOfficeRealDevBase = (env.VITE_STAR_OFFICE_REAL_DEV_BASE || '/star-office').trim();
  const starOfficeRealDevEnabled = env.VITE_STAR_OFFICE_REAL_DEV_ENABLED === 'true';
  const starOfficeUpstreamDir = (env.VITE_STAR_OFFICE_UPSTREAM_DIR || '/tmp/Star-Office-UI').trim();
  const openClawProxyBase = (env.VITE_OPENCLAW_PROXY_URL || '/__openclaw_proxy').trim();
  const openClawProxyDevTarget = (env.VITE_OPENCLAW_PROXY_DEV_TARGET || '').trim();
  const escapedOpenClawProxyBase = openClawProxyBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
        /**
         * 本地 company-gateway dev 代理。
         *
         * 设计原因：
         * - 前端默认走同域相对路径，更贴近未来公司网关部署形态
         * - 仅在显式提供本地 target 时开启转发，避免普通 `npm run dev` 误把请求代理到不存在的服务
         */
        ...(openClawProxyDevTarget
          ? {
              [openClawProxyBase]: {
                target: openClawProxyDevTarget,
                changeOrigin: true,
                /**
                 * 本地 dev server 仅暴露根路径 `/health /events /rpc`。
                 *
                 * 设计原因：
                 * - 浏览器端为了贴近正式部署，统一请求 `/__openclaw_proxy/*`
                 * - 若不在 Vite 代理层剥离这个前缀，后端收到的会是 `/__openclaw_proxy/events`
                 * - proxy dev server 并不识别这个前缀，最终会返回 404，表现成 EventSource 一直超时
                 */
                rewrite: (requestPath) =>
                  requestPath.replace(new RegExp(`^${escapedOpenClawProxyBase}`), ''),
              },
            }
          : {}),
      },
    },
  };
});
