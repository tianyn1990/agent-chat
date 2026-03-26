import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PROXY_HOST = '127.0.0.1';
export const DEFAULT_PROXY_PORT = 19002;
export const DEFAULT_PROXY_GATEWAY_URL = 'ws://127.0.0.1:19001';
export const DASHBOARD_SESSION_PREFIX = 'agent:main:dashboard:';

const REQUEST_READY_TIMEOUT_MS = 12000;
const SSE_RETRY_MS = 1000;
const OPENCLAW_BACKEND_CLIENT_ID = 'gateway-client';
const OPENCLAW_BACKEND_CLIENT_MODE = 'backend';

/**
 * 判断会话是否属于当前 dashboard 命名空间。
 *
 * 设计原因：
 * - company-gateway dev 只服务当前前端工作台，不应把 CLI / 控制台遗留会话重新带回页面
 * - 服务端先做一次过滤，能减少前端收到无关会话与运行时事件
 */
export function isDashboardSessionKey(sessionKey) {
  return typeof sessionKey === 'string' && sessionKey.startsWith(DASHBOARD_SESSION_PREFIX);
}

/**
 * 解析本机全局安装的 OpenClaw SDK 入口。
 *
 * 设计原因：
 * - 当前仓库没有把 `openclaw` 作为本地依赖引入，而是依赖开发机全局安装
 * - 将定位逻辑集中在这里，后续另一个 agent 接手时不必再重新踩“全局包无法 import”的坑
 */
export function resolveOpenClawGatewayRuntimeEntry(env = process.env) {
  const manualEntry = env.OPENCLAW_GATEWAY_RUNTIME_ENTRY?.trim();
  if (manualEntry) {
    if (fs.existsSync(manualEntry)) {
      return manualEntry;
    }

    throw new Error(`指定的 OPENCLAW_GATEWAY_RUNTIME_ENTRY 不存在：${manualEntry}`);
  }

  const candidateRoots = new Set();
  const envGlobalRoot = env.OPENCLAW_GLOBAL_NODE_MODULES?.trim();
  if (envGlobalRoot) {
    candidateRoots.add(envGlobalRoot);
  }

  const npmPrefix = env.npm_config_prefix?.trim();
  if (npmPrefix) {
    candidateRoots.add(path.join(npmPrefix, 'lib', 'node_modules'));
  }

  try {
    candidateRoots.add(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim());
  } catch {
    // 忽略，继续尝试其他候选路径。
  }

  for (const root of candidateRoots) {
    if (!root) {
      continue;
    }

    const candidate = path.join(root, 'openclaw', 'dist', 'plugin-sdk', 'gateway-runtime.js');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      '未找到可导入的全局 OpenClaw SDK 入口。',
      '请确认本机已安装 openclaw，或通过 OPENCLAW_GATEWAY_RUNTIME_ENTRY 指定 gateway-runtime.js。',
    ].join(' '),
  );
}

/**
 * 动态导入官方 GatewayClient。
 *
 * 设计原因：
 * - 入口文件位于全局 node_modules，不能使用静态 bare import
 * - 使用动态导入可以避免把 OpenClaw 变成本仓库的强依赖
 */
export async function importOpenClawGatewayRuntime(env = process.env) {
  const entry = resolveOpenClawGatewayRuntimeEntry(env);
  return import(pathToFileURL(entry).href);
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

function createJsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function buildHealthEventFrame(connected) {
  return {
    type: 'event',
    event: 'health',
    payload: {
      status: connected ? 'ok' : 'degraded',
      source: 'company-gateway-dev',
      updatedAtMs: Date.now(),
    },
  };
}

function buildRuntimeFrame(sessionKey, runtime) {
  return {
    type: 'event',
    event: 'agent',
    payload: {
      sessionKey,
      ...runtime,
    },
  };
}

function deriveRuntimeFromChatEvent(payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.sessionKey !== 'string') {
    return null;
  }

  if (payload.state === 'delta') {
    return {
      state: 'writing',
      detail: 'OpenClaw 正在生成回复',
      updatedAtMs: Date.now(),
      runId: payload.runId,
    };
  }

  if (payload.state === 'final' || payload.state === 'aborted') {
    return {
      state: 'idle',
      detail: payload.state === 'aborted' ? '本轮回复已中断' : '本轮回复已完成',
      updatedAtMs: Date.now(),
      runId: payload.runId,
    };
  }

  if (payload.state === 'error') {
    return {
      state: 'error',
      detail: payload.errorMessage || 'OpenClaw 对话执行失败',
      updatedAtMs: Date.now(),
      runId: payload.runId,
    };
  }

  return null;
}

async function waitForGatewayReady(state, timeoutMs = REQUEST_READY_TIMEOUT_MS) {
  if (state.gatewayConnected) {
    return;
  }

  const readyPromise = state.ready.promise;
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('等待本地 OpenClaw Gateway 就绪超时'));
    }, timeoutMs);
    timer.unref?.();
  });

  await Promise.race([readyPromise, timeoutPromise]);
}

async function ensureSessionSubscribed(state, sessionKey) {
  const normalizedSessionKey = sessionKey?.trim();
  if (!normalizedSessionKey || state.subscribedSessionKeys.has(normalizedSessionKey)) {
    return normalizedSessionKey;
  }

  const result = await state.gatewayClient.request('sessions.messages.subscribe', {
    key: normalizedSessionKey,
  });
  const canonicalKey = result?.key?.trim() || normalizedSessionKey;
  state.subscribedSessionKeys.add(canonicalKey);
  state.subscribedSessionKeys.add(normalizedSessionKey);
  return canonicalKey;
}

function writeSseFrame(res, frame) {
  res.write(`data: ${JSON.stringify(frame)}\n\n`);
}

/**
 * 启动本地 company-gateway dev server。
 *
 * 设计原因：
 * - 本地需要一个最小 BFF 来承接真实会话管理，而不是继续让浏览器直连 OpenClaw
 * - 这里刻意保持协议很小：HTTP RPC + SSE 事件流，优先验证契约与职责边界
 */
export async function startOpenClawProxyDevServer(options = {}) {
  const host = options.host ?? DEFAULT_PROXY_HOST;
  const port = options.port ?? DEFAULT_PROXY_PORT;
  const gatewayUrl =
    options.gatewayUrl ??
    (process.env.OPENCLAW_PROXY_GATEWAY_URL?.trim() || DEFAULT_PROXY_GATEWAY_URL);
  const gatewayToken =
    options.gatewayToken ?? (process.env.OPENCLAW_PROXY_GATEWAY_TOKEN?.trim() || undefined);
  const gatewayPassword =
    options.gatewayPassword ??
    (process.env.OPENCLAW_PROXY_GATEWAY_PASSWORD?.trim() || undefined);
  const gatewayRuntime =
    options.gatewayRuntimeModule ?? (await importOpenClawGatewayRuntime(options.env ?? process.env));
  const { GatewayClient } = gatewayRuntime;

  const sseClients = new Set();
  const runtimeBySession = new Map();
  const lastRunIdBySession = new Map();
  const state = {
    gatewayConnected: false,
    ready: createDeferred(),
    gatewayClient: null,
    subscribedSessionKeys: new Set(),
  };

  const broadcast = (frame) => {
    for (const res of sseClients) {
      writeSseFrame(res, frame);
    }
  };

  const broadcastHealth = () => {
    broadcast(buildHealthEventFrame(state.gatewayConnected));
  };

  const gatewayClient = new GatewayClient({
    url: gatewayUrl,
    token: gatewayToken,
    password: gatewayPassword,
    /**
     * 这里必须使用 OpenClaw 认可的内置 backend client id。
     *
     * 设计原因：
     * - Gateway 对 `connect.client.id` 做了白名单校验
     * - 若这里使用仓库自定义字符串，会在握手阶段直接被判定为 invalid connect params
     * - displayName 仍可保留为当前仓库的调试标识，便于日志观察
     */
    clientName: OPENCLAW_BACKEND_CLIENT_ID,
    clientDisplayName: 'agent-chat company gateway dev',
    mode: OPENCLAW_BACKEND_CLIENT_MODE,
    role: 'operator',
    scopes: ['operator.read', 'operator.write', 'operator.admin'],
    onHelloOk: () => {
      state.gatewayConnected = true;
      state.ready.resolve();
      broadcastHealth();
    },
    onConnectError: (error) => {
      state.gatewayConnected = false;
      broadcastHealth();
      console.error(`[openclaw-proxy] Gateway 连接失败：${error.message}`);
    },
    onClose: (code, reason) => {
      state.gatewayConnected = false;
      state.ready = createDeferred();
      broadcastHealth();
      console.error(`[openclaw-proxy] Gateway 已断开 (${code}): ${reason}`);
    },
    onEvent: (eventFrame) => {
      if (eventFrame.event === 'health') {
        broadcast(eventFrame);
        return;
      }

      const payload = eventFrame.payload ?? {};
      const sessionKey = typeof payload.sessionKey === 'string' ? payload.sessionKey : '';
      if (sessionKey && !isDashboardSessionKey(sessionKey)) {
        return;
      }

      if (eventFrame.event === 'chat' && typeof payload.runId === 'string' && sessionKey) {
        lastRunIdBySession.set(sessionKey, payload.runId);
      }

      if (sessionKey) {
        if (eventFrame.event === 'agent') {
          runtimeBySession.set(sessionKey, {
            state: payload.state ?? 'idle',
            detail: payload.detail ?? 'OpenClaw 正在处理当前会话',
            updatedAtMs: payload.updatedAtMs ?? payload.updatedAt ?? Date.now(),
            messageId: payload.messageId,
            runId: payload.runId,
          });
        }

        if (eventFrame.event === 'chat') {
          const derivedRuntime = deriveRuntimeFromChatEvent(payload);
          if (derivedRuntime) {
            runtimeBySession.set(sessionKey, derivedRuntime);
          }
        }
      }

      broadcast(eventFrame);
    },
  });

  state.gatewayClient = gatewayClient;
  gatewayClient.start();

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);

    if (req.method === 'OPTIONS') {
      createJsonResponse(res, 204, {});
      return;
    }

    if (requestUrl.pathname === '/health' && req.method === 'GET') {
      createJsonResponse(res, 200, {
        ok: true,
        payload: {
          gatewayConnected: state.gatewayConnected,
          proxy: 'company-gateway-dev',
        },
      });
      return;
    }

    if (requestUrl.pathname === '/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`retry: ${SSE_RETRY_MS}\n\n`);
      sseClients.add(res);

      writeSseFrame(res, buildHealthEventFrame(state.gatewayConnected));
      for (const [sessionKey, runtime] of runtimeBySession.entries()) {
        writeSseFrame(res, buildRuntimeFrame(sessionKey, runtime));
      }

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    if (requestUrl.pathname !== '/rpc' || req.method !== 'POST') {
      createJsonResponse(res, 404, {
        ok: false,
        error: {
          message: '未找到 OpenClaw proxy 路由',
        },
      });
      return;
    }

    try {
      const bodyText = await readRequestBody(req);
      const body = JSON.parse(bodyText || '{}');
      const method = typeof body.method === 'string' ? body.method : '';
      const params = body.params ?? {};

      await waitForGatewayReady(state);

      let payload;
      switch (method) {
        case 'sessions.list': {
          const result = await gatewayClient.request('sessions.list', {
            ...(params || {}),
          });
          payload = {
            ...result,
            sessions: Array.isArray(result?.sessions)
              ? result.sessions.filter((entry) => {
                  const key = entry?.key ?? entry?.sessionKey ?? entry?.sessionId ?? '';
                  return isDashboardSessionKey(key);
                })
              : [],
          };
          break;
        }

        case 'sessions.create': {
          payload = await gatewayClient.request('sessions.create', params);
          break;
        }

        case 'sessions.patch': {
          payload = await gatewayClient.request('sessions.patch', params);
          break;
        }

        case 'sessions.delete': {
          payload = await gatewayClient.request('sessions.delete', params);
          const deletedKey = params?.key?.trim();
          if (deletedKey) {
            state.subscribedSessionKeys.delete(deletedKey);
            runtimeBySession.delete(deletedKey);
            lastRunIdBySession.delete(deletedKey);
          }
          break;
        }

        case 'sessions.messages.subscribe': {
          const canonicalKey = await ensureSessionSubscribed(state, params?.key);
          payload = {
            subscribed: true,
            key: canonicalKey,
          };
          break;
        }

        case 'sessions.messages.unsubscribe': {
          payload = await gatewayClient.request('sessions.messages.unsubscribe', params);
          const unsubscribedKey = params?.key?.trim();
          if (unsubscribedKey) {
            state.subscribedSessionKeys.delete(unsubscribedKey);
          }
          break;
        }

        case 'chat.history': {
          await ensureSessionSubscribed(state, params?.sessionKey);
          payload = await gatewayClient.request('chat.history', params);
          break;
        }

        case 'chat.send': {
          await ensureSessionSubscribed(state, params?.sessionKey);
          payload = await gatewayClient.request('chat.send', params);
          if (params?.sessionKey && payload?.runId) {
            lastRunIdBySession.set(params.sessionKey, payload.runId);
          }
          break;
        }

        case 'chat.abort': {
          const abortSessionKey = params?.sessionKey?.trim();
          const runId =
            params?.runId?.trim() || (abortSessionKey ? lastRunIdBySession.get(abortSessionKey) : undefined);
          payload = await gatewayClient.request('chat.abort', {
            ...params,
            ...(runId ? { runId } : {}),
          });
          break;
        }

        case 'chat.inject': {
          payload = await gatewayClient.request('chat.inject', params);
          break;
        }

        default:
          throw new Error(`当前 proxy dev server 不支持方法：${method}`);
      }

      createJsonResponse(res, 200, {
        ok: true,
        payload,
      });
    } catch (error) {
      createJsonResponse(res, 500, {
        ok: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'OpenClaw proxy dev server 处理请求失败',
        },
      });
    }
  });

  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  const serverAddress = server.address();
  const resolvedPort =
    typeof serverAddress === 'object' && serverAddress ? serverAddress.port : port;

  return {
    host,
    port: resolvedPort,
    server,
    gatewayClient,
    close: async () => {
      for (const res of sseClients) {
        res.end();
      }
      sseClients.clear();
      gatewayClient.stop();
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  startOpenClawProxyDevServer()
    .then(({ host, port }) => {
      console.log(`[openclaw-proxy] company gateway dev 已启动：http://${host}:${port}`);
    })
    .catch((error) => {
      console.error(`[openclaw-proxy] ${error.message}`);
      process.exit(1);
    });
}
