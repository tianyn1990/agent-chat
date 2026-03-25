import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  LocalStarOfficeAdapterStore,
  localStarOfficeAdapterStore,
  type LocalStarOfficePushPayload,
} from './adapterStore';
import {
  buildStarOfficeIdleStatusResponse,
  buildStarOfficeUnavailableHtml,
  matchStarOfficeSessionRoute,
  normalizeStarOfficeIncomingState,
  normalizeStarOfficeRealDevBase,
  rewriteStarOfficeIndexHtml,
} from './realSidecar';

interface CreateStarOfficeRealDevPluginOptions {
  enabled: boolean;
  basePath: string;
  upstreamDir: string;
  store?: LocalStarOfficeAdapterStore;
}

/** 统一输出 HTML 响应，避免 iframe 出现无提示空白页。 */
function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

/** 统一输出 JSON 响应。 */
function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/** 读取 POST JSON body，用于兼容上游控制面板的 `/set_state`。 */
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

/** 最小 MIME 映射，满足本地联调所需静态资源。 */
function getMimeType(filePath: string): string {
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';

  return 'application/octet-stream';
}

/**
 * 将请求路径安全映射到上游前端目录，阻止通过 `..` 越界读取任意文件。
 */
function resolveFrontendAssetPath(frontendDir: string, assetPath: string): string | null {
  const requestedPath = assetPath.startsWith('static/')
    ? assetPath.slice('static/'.length)
    : assetPath;

  const nextPath = path.resolve(frontendDir, requestedPath);
  return nextPath.startsWith(frontendDir) ? nextPath : null;
}

/**
 * 将开发者配置的上游目录解析到真实前端目录。
 *
 * 支持两种输入：
 * 1. 上游仓库根目录
 * 2. 直接指向 `frontend` 目录
 */
function resolveStarOfficeFrontendDir(upstreamDir: string): string {
  const trimmed = upstreamDir.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = path.resolve(trimmed);
  return path.basename(normalized) === 'frontend' ? normalized : path.join(normalized, 'frontend');
}

/**
 * 为 `npm run dev` 提供真实 Star-Office-UI 联调能力。
 *
 * 设计目标：
 * 1. 直接复用上游真实前端资源，看到真实像素办公室效果
 * 2. 通过会话级 facade 保持 `sessionId` 语义
 * 3. 继续复用现有本地 adapter store，避免本地再起一套后端
 */
export function createStarOfficeRealDevPlugin({
  enabled,
  basePath,
  upstreamDir,
  store = localStarOfficeAdapterStore,
}: CreateStarOfficeRealDevPluginOptions): Plugin {
  const normalizedBasePath = normalizeStarOfficeRealDevBase(basePath);
  const frontendDir = resolveStarOfficeFrontendDir(upstreamDir);

  return {
    name: 'real-star-office-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? '/', 'http://localhost');
        const match = matchStarOfficeSessionRoute(requestUrl.pathname, normalizedBasePath);
        const requestedThemeMode = requestUrl.searchParams.get('themeMode') ?? undefined;

        if (!match) {
          next();
          return;
        }

        if (!enabled) {
          next();
          return;
        }

        const sessionBasePath = `${normalizedBasePath}/session/${encodeURIComponent(match.sessionId)}`;

        if (!frontendDir || !fs.existsSync(frontendDir)) {
          sendHtml(
            res,
            503,
            buildStarOfficeUnavailableHtml(
              '真实 Star-Office-UI 本地资源不可用',
              `未找到可读取的上游 frontend 目录：${frontendDir || '未配置路径'}`,
              match.sessionId,
              requestedThemeMode,
            ),
          );
          return;
        }

        if (req.method === 'GET' && (match.assetPath === '' || match.assetPath === 'index.html')) {
          const indexPath = path.join(frontendDir, 'index.html');
          const indexHtml = fs.readFileSync(indexPath, 'utf-8');
          sendHtml(res, 200, rewriteStarOfficeIndexHtml(indexHtml, sessionBasePath));
          return;
        }

        if (req.method === 'GET' && match.assetPath === 'status') {
          const status =
            store.getStatus(match.sessionId) ?? buildStarOfficeIdleStatusResponse(match.sessionId);
          sendJson(res, 200, {
            state: status.state,
            detail: status.detail,
            progress: status.progress,
            updatedAt: status.updatedAt,
          });
          return;
        }

        if (req.method === 'GET' && match.assetPath === 'agents') {
          const agents = store.getAgents(match.sessionId);
          sendJson(res, 200, agents?.agents ?? []);
          return;
        }

        if (req.method === 'GET' && match.assetPath === 'yesterday-memo') {
          sendJson(res, 200, {
            success: false,
            memo: '',
            date: '',
          });
          return;
        }

        // 上游首页初始化时会探测认证状态。这里给出最小占位响应，避免页面首屏报错。
        if (req.method === 'GET' && match.assetPath === 'assets/auth/status') {
          sendJson(res, 200, {
            authenticated: false,
            authorized: false,
            authStatus: 'local-dev',
          });
          return;
        }

        // 其余素材管理接口在本地联调阶段只需要最小占位，避免 UI 控件报错。
        if (req.method === 'GET' && match.assetPath === 'assets/list') {
          sendJson(res, 200, []);
          return;
        }

        if (
          req.method === 'GET' &&
          (match.assetPath === 'assets/positions' || match.assetPath === 'assets/defaults')
        ) {
          sendJson(res, 200, {});
          return;
        }

        if (req.method === 'GET' && match.assetPath === 'config/gemini') {
          sendJson(res, 200, {
            configured: false,
          });
          return;
        }

        if (req.method === 'POST' && match.assetPath === 'set_state') {
          try {
            const payload = await readJsonBody<Record<string, unknown>>(req);
            const nextState = store.push({
              sessionId: match.sessionId,
              state: normalizeStarOfficeIncomingState(
                String(payload.state ?? 'idle'),
              ) as LocalStarOfficePushPayload['state'],
              detail: String(
                payload.detail ?? buildStarOfficeIdleStatusResponse(match.sessionId).detail,
              ),
              source: 'frontend-mock',
            });

            sendJson(res, 200, {
              ok: true,
              state: nextState.state,
              detail: nextState.detail,
            });
            return;
          } catch (error) {
            sendJson(res, 400, {
              ok: false,
              message: '请求体不是有效的 JSON',
              detail: error instanceof Error ? error.message : String(error),
            });
            return;
          }
        }

        const assetFilePath = resolveFrontendAssetPath(frontendDir, match.assetPath);
        if (
          !assetFilePath ||
          !fs.existsSync(assetFilePath) ||
          !fs.statSync(assetFilePath).isFile()
        ) {
          sendHtml(
            res,
            404,
            buildStarOfficeUnavailableHtml(
              '真实 Star-Office-UI 资源不存在',
              `未找到资源：${match.assetPath || 'index.html'}`,
              match.sessionId,
              requestedThemeMode,
            ),
          );
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', getMimeType(assetFilePath));
        fs.createReadStream(assetFilePath).pipe(res);
      });
    },
  };
}
