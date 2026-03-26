import { installNodeTestEnvironment } from './setup.node';
import { installUiTestEnvironment } from './setup.ui';

/**
 * Vitest 全局 setup 入口。
 *
 * 设计原因：
 * - `vitest.config.ts` 已按目录将测试分流到 `node` 与 `jsdom`
 * - 这里再根据当前运行环境按需安装对应 stub，避免逻辑测试执行浏览器专用初始化
 */
installNodeTestEnvironment();

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installUiTestEnvironment();
}
