import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const DEFAULT_DIRECT_GATEWAY_URL = 'ws://127.0.0.1:19001';
export const DEFAULT_DIRECT_GATEWAY_ROLE = 'operator';
export const DEFAULT_DIRECT_GATEWAY_SCOPES = 'operator.read,operator.write,operator.admin';

function parseScopeCsv(rawValue = '') {
  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 为本地直连联调生成最终 scopes。
 *
 * 设计原因：
 * - 删除/重命名真实会话需要 `operator.admin`
 * - 用户本地 `.env.local` 里可能保留了旧的 read/write 配置
 * - 对 operator 角色自动补齐 admin，可避免联调阶段出现“前端看似删除，实际 Gateway 没删”的假象
 */
function resolveDirectGatewayScopes(baseEnv) {
  const role = (baseEnv.VITE_OPENCLAW_GATEWAY_ROLE?.trim() || DEFAULT_DIRECT_GATEWAY_ROLE).trim();
  const requestedScopes = new Set(
    parseScopeCsv(baseEnv.VITE_OPENCLAW_GATEWAY_SCOPES || DEFAULT_DIRECT_GATEWAY_SCOPES),
  );

  if (role === 'operator') {
    requestedScopes.add('operator.read');
    requestedScopes.add('operator.write');
    requestedScopes.add('operator.admin');
  }

  return [...requestedScopes].join(',');
}

/**
 * 构建只作用于当前直连调试子进程的环境变量。
 *
 * 设计原因：
 * - 日常开发默认仍可能依赖 `mock-openclaw`
 * - 一键直连脚本不应改写 `.env.local`，否则容易把用户留在错误 runtime
 * - 用子进程环境覆盖，可以做到“启动时切换，退出即恢复”
 */
export function buildOpenClawDirectEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    VITE_CHAT_RUNTIME: 'openclaw-direct',
    VITE_MOCK_ENABLED: 'false',
    VITE_OPENCLAW_GATEWAY_URL:
      baseEnv.VITE_OPENCLAW_GATEWAY_URL?.trim() || DEFAULT_DIRECT_GATEWAY_URL,
    VITE_OPENCLAW_GATEWAY_ROLE:
      baseEnv.VITE_OPENCLAW_GATEWAY_ROLE?.trim() || DEFAULT_DIRECT_GATEWAY_ROLE,
    VITE_OPENCLAW_GATEWAY_SCOPES: resolveDirectGatewayScopes(baseEnv),
    /**
     * 直连联调默认同时打开本地 Star-Office mock 承接层。
     *
     * 设计原因：
     * - 用户执行 `npm run dev:openclaw-direct` 的主要目标之一，就是同时验证聊天协议和执行状态入口
     * - 若这里不自动打开本地 mock，页面会表现成“协议能用但工作台不可用”，体验割裂
     * - 显式传入的环境变量仍保持优先，方便用户切换到 real dev 承接层
     */
    VITE_STAR_OFFICE_MOCK_ENABLED:
      baseEnv.VITE_STAR_OFFICE_MOCK_ENABLED?.trim() ||
      (baseEnv.VITE_STAR_OFFICE_REAL_DEV_ENABLED?.trim() === 'true' ? '' : 'true'),
  };
}

/**
 * 生成 OpenClaw dev Gateway 的前台运行参数。
 *
 * 设计原因：
 * - 这里刻意不用 service 模式，而是把 Gateway 绑定到当前脚本生命周期
 * - 这样 `Ctrl+C` 退出时能自动停止本地 Gateway，不留后台残留进程
 */
export function buildOpenClawGatewayArgs() {
  return ['--dev', 'gateway', 'run', '--auth', 'none', '--allow-unconfigured', '--force'];
}

/**
 * 生成 Vite 直连调试参数。
 *
 * 设计原因：
 * - direct runtime 明确要求 loopback origin
 * - 默认将 dev server 绑定到 `localhost`，避免误用局域网地址触发握手限制
 */
export function buildViteArgs(extraArgs = []) {
  return ['run', 'dev', '--', '--host', 'localhost', ...extraArgs];
}

/**
 * 轮询等待 Gateway 就绪。
 *
 * 设计原因：
 * - 若 Vite 先起、Gateway 后起，页面初始会出现“握手超时”的假失败
 * - 先确认 Gateway ready，再启动前端，能减少无意义噪音
 */
export async function waitForGatewayReady({
  timeoutMs = 15000,
  pollIntervalMs = 500,
  healthEnv = process.env,
} = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const isReady = await new Promise((resolve) => {
      const probe = spawn('openclaw', ['--dev', 'gateway', 'health'], {
        env: healthEnv,
        stdio: 'ignore',
      });

      probe.on('exit', (code) => resolve(code === 0));
      probe.on('error', () => resolve(false));
    });

    if (isReady) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }

  throw new Error('等待本地 OpenClaw Gateway 就绪超时');
}

/**
 * 以 best-effort 方式执行一次 OpenClaw 控制命令。
 *
 * 设计原因：
 * - 用户机器上可能已安装 LaunchAgent / service
 * - 一键脚本启动前需要先把现有 service 停掉，退出时也要再补一次 stop，避免被服务自动拉起
 */
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
 * 启动“一键直连 OpenClaw”开发环境。
 *
 * 设计原因：
 * - 本地直连需要同时管理 Gateway 与 Vite 两个进程
 * - 统一由一个脚本编排，才能保证启动顺序、环境变量和退出清理都一致
 */
export async function runOpenClawDirectDev(extraArgs = []) {
  const directEnv = buildOpenClawDirectEnv(process.env);
  await runOpenClawControlCommand(['--dev', 'gateway', 'stop'], directEnv);
  const gatewayProcess = spawn('openclaw', buildOpenClawGatewayArgs(), {
    env: directEnv,
    stdio: 'inherit',
  });

  let viteProcess = null;
  let shuttingDown = false;

  const killChild = (childProcess, signal = 'SIGTERM') => {
    if (!childProcess || childProcess.killed) {
      return;
    }

    try {
      childProcess.kill(signal);
    } catch {
      // 进程已退出时保持清理流程幂等，避免在关闭阶段制造新异常。
    }
  };

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    void runOpenClawControlCommand(['--dev', 'gateway', 'stop'], directEnv);
    killChild(viteProcess);
    killChild(gatewayProcess);

    setTimeout(() => {
      killChild(viteProcess, 'SIGKILL');
      killChild(gatewayProcess, 'SIGKILL');
    }, 3000).unref();

    setTimeout(() => {
      process.exit(exitCode);
    }, 100).unref();
  };

  process.on('SIGINT', () => shutdown(130));
  process.on('SIGTERM', () => shutdown(143));

  gatewayProcess.on('error', (error) => {
    console.error(`[openclaw-direct] 无法启动 OpenClaw Gateway: ${error.message}`);
    shutdown(1);
  });

  gatewayProcess.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[openclaw-direct] OpenClaw Gateway 已退出，退出码: ${code ?? 1}`);
    shutdown(code ?? 1);
  });

  console.log('[openclaw-direct] 正在启动本地 OpenClaw Gateway...');
  await waitForGatewayReady({ healthEnv: directEnv });
  console.log('[openclaw-direct] Gateway 已就绪，启动 Vite 开发服务器...');

  viteProcess = spawn('npm', buildViteArgs(extraArgs), {
    env: directEnv,
    stdio: 'inherit',
  });

  viteProcess.on('error', (error) => {
    console.error(`[openclaw-direct] 无法启动 Vite: ${error.message}`);
    shutdown(1);
  });

  viteProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] && currentFilePath === process.argv[1]) {
  runOpenClawDirectDev(process.argv.slice(2)).catch((error) => {
    console.error(`[openclaw-direct] ${error.message}`);
    process.exit(1);
  });
}
