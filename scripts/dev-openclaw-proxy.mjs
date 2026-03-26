import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  buildOpenClawGatewayArgs,
  buildViteArgs,
  waitForGatewayReady,
} from './dev-openclaw-direct.mjs';
import {
  DEFAULT_PROXY_GATEWAY_URL,
  DEFAULT_PROXY_HOST,
  DEFAULT_PROXY_PORT,
} from './openclaw-proxy-dev-server.mjs';

export const DEFAULT_PROXY_BASE_PATH = '/__openclaw_proxy';
export const DEFAULT_PROXY_DEV_TARGET = `http://${DEFAULT_PROXY_HOST}:${DEFAULT_PROXY_PORT}`;

/**
 * 构建仅作用于当前 proxy 联调子进程的环境变量。
 *
 * 设计原因：
 * - 本地 company-gateway 模式需要同时协调 Vite、proxy server 与本地 OpenClaw Gateway
 * - 通过子进程环境覆盖即可做到“启动时切到 proxy，退出即恢复”，不会污染用户的 `.env.local`
 */
export function buildOpenClawProxyEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    VITE_CHAT_RUNTIME: 'openclaw-proxy',
    VITE_MOCK_ENABLED: 'false',
    VITE_OPENCLAW_PROXY_URL: baseEnv.VITE_OPENCLAW_PROXY_URL?.trim() || DEFAULT_PROXY_BASE_PATH,
    VITE_OPENCLAW_PROXY_DEV_TARGET:
      baseEnv.VITE_OPENCLAW_PROXY_DEV_TARGET?.trim() || DEFAULT_PROXY_DEV_TARGET,
    OPENCLAW_PROXY_GATEWAY_URL:
      baseEnv.OPENCLAW_PROXY_GATEWAY_URL?.trim() || DEFAULT_PROXY_GATEWAY_URL,
    /**
     * proxy 联调默认也打开本地 Star-Office mock 承接层。
     *
     * 设计原因：
     * - 当前阶段重点是验证“更贴近真实环境的 chat 链路”，工作台仍需保持可见
     * - 若这里不自动打开 mock，开发者会误以为 proxy 模式破坏了执行状态入口
     */
    VITE_STAR_OFFICE_MOCK_ENABLED:
      baseEnv.VITE_STAR_OFFICE_MOCK_ENABLED?.trim() ||
      (baseEnv.VITE_STAR_OFFICE_REAL_DEV_ENABLED?.trim() === 'true' ? '' : 'true'),
  };
}

/**
 * 轮询等待本地 company-gateway dev 就绪。
 *
 * 设计原因：
 * - Vite 先起、proxy 后起时，页面初始会出现误导性的“连接失败”提示
 * - 先等待 `/health` 正常返回，可以减少首屏噪音
 */
export async function waitForProxyReady({
  timeoutMs = 15000,
  pollIntervalMs = 500,
  baseUrl = DEFAULT_PROXY_DEV_TARGET,
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // 忽略瞬时错误，继续等待。
    }

    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }

  throw new Error('等待本地 OpenClaw company gateway dev 就绪超时');
}

async function runOpenClawControlCommand(args, env) {
  await new Promise((resolve) => {
    const childProcess = spawn('openclaw', args, {
      env,
      stdio: 'ignore',
    });

    childProcess.on('exit', () => resolve());
    childProcess.on('error', () => resolve());
  });
}

/**
 * 启动“一键 company-gateway”本地联调环境。
 *
 * 设计原因：
 * - 第三阶段需要同时跑 Gateway、proxy dev server 与 Vite
 * - 统一编排能保证启动顺序、环境切换和退出清理都稳定可重复
 */
export async function runOpenClawProxyDev(extraArgs = []) {
  const proxyEnv = buildOpenClawProxyEnv(process.env);
  await runOpenClawControlCommand(['--dev', 'gateway', 'stop'], proxyEnv);

  const gatewayProcess = spawn('openclaw', buildOpenClawGatewayArgs(), {
    env: proxyEnv,
    stdio: 'inherit',
  });

  let proxyProcess = null;
  let viteProcess = null;
  let shuttingDown = false;

  const killChild = (childProcess, signal = 'SIGTERM') => {
    if (!childProcess || childProcess.killed) {
      return;
    }

    try {
      childProcess.kill(signal);
    } catch {
      // 进程已退出时保持清理幂等。
    }
  };

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    void runOpenClawControlCommand(['--dev', 'gateway', 'stop'], proxyEnv);
    killChild(viteProcess);
    killChild(proxyProcess);
    killChild(gatewayProcess);

    setTimeout(() => {
      killChild(viteProcess, 'SIGKILL');
      killChild(proxyProcess, 'SIGKILL');
      killChild(gatewayProcess, 'SIGKILL');
    }, 3000).unref();

    setTimeout(() => {
      process.exit(exitCode);
    }, 100).unref();
  };

  process.on('SIGINT', () => shutdown(130));
  process.on('SIGTERM', () => shutdown(143));

  gatewayProcess.on('error', (error) => {
    console.error(`[openclaw-proxy] 无法启动 OpenClaw Gateway: ${error.message}`);
    shutdown(1);
  });

  gatewayProcess.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[openclaw-proxy] OpenClaw Gateway 已退出，退出码: ${code ?? 1}`);
    shutdown(code ?? 1);
  });

  console.log('[openclaw-proxy] 正在启动本地 OpenClaw Gateway...');
  await waitForGatewayReady({ healthEnv: proxyEnv });
  console.log('[openclaw-proxy] Gateway 已就绪，启动本地 company gateway dev...');

  proxyProcess = spawn('node', ['./scripts/openclaw-proxy-dev-server.mjs'], {
    env: proxyEnv,
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  proxyProcess.on('error', (error) => {
    console.error(`[openclaw-proxy] 无法启动 company gateway dev: ${error.message}`);
    shutdown(1);
  });

  proxyProcess.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[openclaw-proxy] company gateway dev 已退出，退出码: ${code ?? 1}`);
    shutdown(code ?? 1);
  });

  await waitForProxyReady({
    baseUrl: proxyEnv.VITE_OPENCLAW_PROXY_DEV_TARGET || DEFAULT_PROXY_DEV_TARGET,
  });
  console.log('[openclaw-proxy] company gateway dev 已就绪，启动 Vite 开发服务器...');

  viteProcess = spawn('npm', buildViteArgs(extraArgs), {
    env: proxyEnv,
    stdio: 'inherit',
  });

  viteProcess.on('error', (error) => {
    console.error(`[openclaw-proxy] 无法启动 Vite: ${error.message}`);
    shutdown(1);
  });

  viteProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && currentFilePath === process.argv[1]) {
  runOpenClawProxyDev(process.argv.slice(2)).catch((error) => {
    console.error(`[openclaw-proxy] ${error.message}`);
    process.exit(1);
  });
}
