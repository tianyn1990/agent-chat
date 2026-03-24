/** 真实 Star-Office 本地联调的默认基础路径。 */
export const DEFAULT_STAR_OFFICE_REAL_DEV_BASE = '/star-office';

/** 真实 Star-Office 会话级 facade 固定使用的路径片段。 */
export const STAR_OFFICE_SESSION_SEGMENT = 'session';

/** 真实 Star-Office 缺省的等待文案。 */
export const STAR_OFFICE_IDLE_DETAIL = '等待该会话的执行状态';

export interface StarOfficeSessionRouteMatch {
  sessionId: string;
  assetPath: string;
}

/**
 * 规范化真实 Star-Office dev 基础路径。
 *
 * 约束：
 * 1. 保证一定以 `/` 开头
 * 2. 去掉尾部 `/`
 * 3. 空值时回退到约定默认路径
 */
export function normalizeStarOfficeRealDevBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) {
    return DEFAULT_STAR_OFFICE_REAL_DEV_BASE;
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

/**
 * 为真实 Star-Office 生成会话级 facade 地址。
 *
 * 规则：
 * 1. 若地址中显式包含 `{sessionId}` 占位符，则直接替换
 * 2. 若地址以 `/session` 结尾，则追加 `/<sessionId>/`
 * 3. 否则统一追加 `/session/<sessionId>/`
 */
export function buildStarOfficeSessionFacadeUrl(baseUrl: string, sessionId: string): string {
  const trimmedUrl = baseUrl.trim();
  if (!trimmedUrl) {
    return '';
  }

  const encodedSessionId = encodeURIComponent(sessionId);
  if (trimmedUrl.includes('{sessionId}')) {
    return trimmedUrl.split('{sessionId}').join(encodedSessionId);
  }

  if (/^https?:\/\//.test(trimmedUrl)) {
    const parsed = new URL(trimmedUrl);
    parsed.pathname = appendSessionSegment(parsed.pathname, encodedSessionId);
    return parsed.toString();
  }

  const [pathWithoutHash, hash = ''] = trimmedUrl.split('#');
  const [pathname, query = ''] = pathWithoutHash.split('?');
  const nextPath = appendSessionSegment(pathname, encodedSessionId);
  const rebuilt = query ? `${nextPath}?${query}` : nextPath;

  return hash ? `${rebuilt}#${hash}` : rebuilt;
}

/**
 * 解析真实 Star-Office 会话级请求路径。
 *
 * 例如：
 * - `/star-office/session/foo/`
 * - `/star-office/session/foo/static/vendor/phaser.js`
 * - `/star-office/session/foo/status`
 */
export function matchStarOfficeSessionRoute(
  pathname: string,
  basePath: string,
): StarOfficeSessionRouteMatch | null {
  const normalizedBase = normalizeStarOfficeRealDevBase(basePath);
  const prefix = `${normalizedBase}/${STAR_OFFICE_SESSION_SEGMENT}/`;

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const remainder = pathname.slice(prefix.length);
  if (!remainder) {
    return null;
  }

  const slashIndex = remainder.indexOf('/');
  const encodedSessionId = slashIndex === -1 ? remainder : remainder.slice(0, slashIndex);
  if (!encodedSessionId) {
    return null;
  }

  const assetPath = slashIndex === -1 ? '' : remainder.slice(slashIndex + 1);
  return {
    sessionId: decodeURIComponent(encodedSessionId),
    assetPath,
  };
}

/**
 * 将上游 `index.html` 改写为可在会话级 facade 路径下运行的版本。
 *
 * 改写内容：
 * 1. 注入 `window.fetch` 包装器，把根路径接口重定向到当前会话入口
 * 2. 将所有 `/static/` 资源请求改写为会话级静态资源路径
 */
export function rewriteStarOfficeIndexHtml(html: string, sessionBasePath: string): string {
  const normalizedSessionBase = sessionBasePath.replace(/\/+$/, '');
  const bridgeScript = `
<script>
  window.__STAR_OFFICE_SESSION_BASE__ = ${JSON.stringify(normalizedSessionBase)};
  (function () {
    const sessionBase = window.__STAR_OFFICE_SESSION_BASE__;
    const originalFetch = window.fetch.bind(window);
    window.fetch = function (resource, init) {
      if (typeof resource === 'string' && resource.startsWith('/')) {
        return originalFetch(sessionBase + resource, init);
      }

      if (resource instanceof Request) {
        const requestUrl = resource.url;
        if (requestUrl.startsWith(window.location.origin + '/')) {
          const relativeUrl = requestUrl.slice(window.location.origin.length);
          if (relativeUrl.startsWith('/')) {
            return originalFetch(sessionBase + relativeUrl, init);
          }
        }
      }

      return originalFetch(resource, init);
    };
  })();
</script>`;

  const htmlWithBridge = html.includes('</head>')
    ? html.replace('</head>', `${bridgeScript}\n</head>`)
    : `${bridgeScript}\n${html}`;

  return htmlWithBridge.split('/static/').join(`${normalizedSessionBase}/static/`);
}

/**
 * 在真实 sidecar 不可用时输出一张明确的诊断页，避免 iframe 只显示空白。
 */
export function buildStarOfficeUnavailableHtml(
  title: string,
  detail: string,
  sessionId?: string,
): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #131622;
        color: #f3f6ff;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .card {
        width: min(720px, calc(100vw - 48px));
        padding: 32px;
        border-radius: 20px;
        background: linear-gradient(180deg, #1b2032 0%, #111523 100%);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: #7fb4ff;
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 24px;
      }
      p {
        margin: 0 0 12px;
        line-height: 1.7;
        color: #d6def4;
      }
      code {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.08);
      }
      .tip {
        margin-top: 20px;
        padding: 14px 16px;
        border-radius: 12px;
        background: rgba(127, 180, 255, 0.08);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Star-Office Real Dev</p>
      <h1>${escapeHtml(title)}</h1>
      ${sessionId ? `<p>当前会话：<code>${escapeHtml(sessionId)}</code></p>` : ''}
      <p>${escapeHtml(detail)}</p>
      <div class="tip">
        <p>请检查：</p>
        <p>1. 是否已正确配置 <code>VITE_STAR_OFFICE_REAL_DEV_ENABLED</code></p>
        <p>2. 是否已提供可访问的上游目录 <code>VITE_STAR_OFFICE_UPSTREAM_DIR</code></p>
        <p>3. 是否需要改为本地 mock 或真实外部地址联调</p>
      </div>
    </main>
  </body>
</html>`;
}

/**
 * 规范化会话级 status 返回值。
 *
 * 真实上游的 `game.js` 假定 `/status` 总是可读，因此在本地联调模式下，
 * 即便当前会话尚无运行态，也要返回一个可渲染的 `idle` 结构，而不是 404。
 */
export function buildStarOfficeIdleStatusResponse(sessionId: string) {
  return {
    sessionId,
    state: 'idle',
    detail: STAR_OFFICE_IDLE_DETAIL,
    progress: 100,
    updatedAt: Date.now(),
  };
}

/** 对 `/set_state` 的状态字段做最小归一化，兼容上游控制面板手动切换状态。 */
export function normalizeStarOfficeIncomingState(state: string): string {
  if (!state) return 'idle';

  if (state === 'working') return 'writing';
  if (state === 'run' || state === 'running') return 'executing';
  if (state === 'sync') return 'syncing';
  if (state === 'research') return 'researching';

  return state;
}

function appendSessionSegment(pathname: string, encodedSessionId: string): string {
  const normalizedPath = pathname.replace(/\/+$/, '') || '';

  if (normalizedPath.endsWith(`/${STAR_OFFICE_SESSION_SEGMENT}`)) {
    return `${normalizedPath}/${encodedSessionId}/`;
  }

  return `${normalizedPath}/${STAR_OFFICE_SESSION_SEGMENT}/${encodedSessionId}/`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
