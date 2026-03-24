import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  LocalStarOfficeAdapterStore,
  localStarOfficeAdapterStore,
  type LocalStarOfficePushPayload,
} from './adapterStore';

interface CreateStarOfficeMockPluginOptions {
  mockBase: string;
  store?: LocalStarOfficeAdapterStore;
}

/** 读取 query 中的 sessionId，统一缺参时的处理逻辑 */
function getSessionIdFromRequest(req: IncomingMessage): string | null {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  return requestUrl.searchParams.get('sessionId');
}

/** 统一输出 JSON 响应 */
function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/** 读取 POST JSON body */
async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += String(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

/**
 * 为 Vite dev server 注入本地 Star-Office mock adapter 中间件。
 *
 * 说明：
 * - 该插件只在 `vite serve` 生效
 * - 生产构建不携带本地 adapter HTTP 接口
 */
export function createStarOfficeMockPlugin({
  mockBase,
  store = localStarOfficeAdapterStore,
}: CreateStarOfficeMockPluginOptions): Plugin {
  const normalizedBase = mockBase.replace(/\/+$/, '');

  return {
    name: 'local-star-office-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost');
        if (!requestUrl.pathname.startsWith(normalizedBase)) {
          next();
          return;
        }

        const pathname = requestUrl.pathname.slice(normalizedBase.length) || '/';

        if (req.method === 'GET' && pathname === '/status') {
          const sessionId = getSessionIdFromRequest(req);
          if (!sessionId) {
            sendJson(res, 400, { message: '缺少 sessionId' });
            return;
          }

          const status = store.getStatus(sessionId);
          if (!status) {
            sendJson(res, 404, { message: '当前会话暂无执行状态', sessionId });
            return;
          }

          sendJson(res, 200, status);
          return;
        }

        if (req.method === 'GET' && pathname === '/agents') {
          const sessionId = getSessionIdFromRequest(req);
          if (!sessionId) {
            sendJson(res, 400, { message: '缺少 sessionId' });
            return;
          }

          const agents = store.getAgents(sessionId);
          if (!agents) {
            sendJson(res, 404, { message: '当前会话暂无 Agent 状态', sessionId });
            return;
          }

          sendJson(res, 200, agents);
          return;
        }

        if (req.method === 'POST' && pathname === '/adapter/push') {
          try {
            const payload = await readJsonBody<LocalStarOfficePushPayload>(req);
            if (!payload.sessionId) {
              sendJson(res, 400, { message: '缺少 sessionId' });
              return;
            }

            const nextState = store.push(payload);
            sendJson(res, 200, nextState);
            return;
          } catch (error) {
            sendJson(res, 400, {
              message: '请求体不是有效的 JSON',
              detail: error instanceof Error ? error.message : String(error),
            });
            return;
          }
        }

        if (req.method === 'POST' && pathname === '/reset') {
          store.reset();
          sendJson(res, 200, { ok: true });
          return;
        }

        next();
      });
    },
  };
}
