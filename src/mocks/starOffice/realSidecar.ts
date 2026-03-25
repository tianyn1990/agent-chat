/** 真实 Star-Office 本地联调的默认基础路径。 */
export const DEFAULT_STAR_OFFICE_REAL_DEV_BASE = '/star-office';

/** 真实 Star-Office 会话级 facade 固定使用的路径片段。 */
export const STAR_OFFICE_SESSION_SEGMENT = 'session';

/** 真实 Star-Office 缺省的等待文案。 */
export const STAR_OFFICE_IDLE_DETAIL = '等待该会话的执行状态';

type StarOfficeThemeMode = 'dark' | 'light';

export interface StarOfficeSessionRouteMatch {
  sessionId: string;
  assetPath: string;
}

interface StarOfficeUnavailableThemePalette {
  colorScheme: StarOfficeThemeMode;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  eyebrow: string;
  textPrimary: string;
  textSecondary: string;
  codeBg: string;
  codeBorder: string;
  tipBg: string;
  tipBorder: string;
}

const STAR_OFFICE_UNAVAILABLE_THEME_PALETTES: Record<
  StarOfficeThemeMode,
  StarOfficeUnavailableThemePalette
> = {
  dark: {
    colorScheme: 'dark',
    pageBg: '#131622',
    cardBg: 'linear-gradient(180deg, #1b2032 0%, #111523 100%)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    eyebrow: '#7fb4ff',
    textPrimary: '#f3f6ff',
    textSecondary: '#d6def4',
    codeBg: 'rgba(255, 255, 255, 0.08)',
    codeBorder: 'rgba(255, 255, 255, 0.08)',
    tipBg: 'rgba(127, 180, 255, 0.08)',
    tipBorder: 'rgba(127, 180, 255, 0.12)',
  },
  light: {
    colorScheme: 'light',
    // 本地联调降级页也要跟随主应用的 Porcelain Console，避免工作台壳层仍残留旧暖黄。
    pageBg: '#f3f6fa',
    cardBg: 'linear-gradient(180deg, #fcfdff 0%, #f6f9fd 100%)',
    cardBorder: 'rgba(88, 99, 118, 0.14)',
    eyebrow: '#5a6fcf',
    textPrimary: '#232b36',
    textSecondary: '#5c6779',
    codeBg: 'rgba(88, 99, 118, 0.08)',
    codeBorder: 'rgba(88, 99, 118, 0.12)',
    tipBg: 'rgba(90, 111, 207, 0.08)',
    tipBorder: 'rgba(90, 111, 207, 0.12)',
  },
};

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

    /**
     * 将上游完整主舞台按比例缩放进 iframe 视口。
     *
     * 设计原因：
     * - 当前沉浸式路由已经拥有完整视口，因此可以展示 Star-Office 原生的“办公室 + 底部面板”布局
     * - 之前只裁出办公室区域，会让用户误以为下方内容丢失
     * - 这里保留原始主舞台，只隐藏装修抽屉等旁支区域，并把完整主舞台居中缩放到可视区
     */
    function applyEmbeddedStageMode() {
      var root = document.documentElement;
      var body = document.body;
      if (!root || !body) {
        return;
      }

      root.classList.add('oc-embedded-office');
      body.classList.add('oc-embedded-office-body');

      var mainStage = document.getElementById('main-stage');
      if (mainStage) {
        mainStage.classList.add('oc-embedded-main-stage');
      }

      var gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.classList.add('oc-embedded-game-container');
      }

      var hiddenRegionIds = [
        'asset-drawer-backdrop',
        'asset-drawer',
        'asset-highlight',
        'room-loading-overlay',
      ];
      for (var index = 0; index < hiddenRegionIds.length; index += 1) {
        var hiddenRegion = document.getElementById(hiddenRegionIds[index]);
        if (hiddenRegion) {
          hiddenRegion.classList.add('oc-embedded-hidden');
        }
      }

      fitEmbeddedStage();
    }

    /**
     * 动态计算完整主舞台的缩放比，避免 1280x 办公室加底部面板在较矮视口中被裁切。
     */
    function fitEmbeddedStage() {
      var root = document.documentElement;
      var mainStage = document.getElementById('main-stage');
      if (!root || !mainStage) {
        return;
      }

      var stageWidth = Math.max(mainStage.scrollWidth, 1280);
      var stageHeight = Math.max(mainStage.scrollHeight, 1040);
      var scale = Math.min(window.innerWidth / stageWidth, window.innerHeight / stageHeight);

      if (!isFinite(scale) || scale <= 0) {
        scale = 1;
      }

      scale = Math.min(scale, 1);
      root.style.setProperty('--oc-embedded-stage-scale', String(scale));
      root.style.setProperty('--oc-embedded-stage-width', stageWidth + 'px');
      root.style.setProperty('--oc-embedded-stage-height', stageHeight + 'px');
    }

    var embeddedStyle = document.createElement('style');
    embeddedStyle.setAttribute('data-star-office-embedded-style', 'true');
    embeddedStyle.textContent = [
      'html.oc-embedded-office { width: 100%; height: 100%; overflow: hidden; background: #0f1118; }',
      'body.oc-embedded-office-body { position: relative; margin: 0 !important; padding: 0 !important; min-height: 100vh; width: 100vw; height: 100vh; overflow: hidden; background: #0f1118 !important; }',
      '#main-stage.oc-embedded-main-stage { position: absolute; top: 50%; left: 50%; width: var(--oc-embedded-stage-width, 1280px) !important; max-width: none !important; transform: translate(-50%, -50%) scale(var(--oc-embedded-stage-scale, 1)) !important; transform-origin: center center !important; transition: none !important; will-change: transform; }',
      'body.drawer-open #main-stage.oc-embedded-main-stage { transform: translate(-50%, -50%) scale(var(--oc-embedded-stage-scale, 1)) !important; }',
      '#game-container.oc-embedded-game-container { margin: 0 auto !important; }',
      '#game-container.oc-embedded-game-container #status-text { bottom: 16px; left: 16px; max-width: calc(100% - 32px); }',
      '.oc-embedded-hidden { display: none !important; }',
    ].join('\\n');
    document.head.appendChild(embeddedStyle);

    window.addEventListener('resize', fitEmbeddedStage);
    window.addEventListener('load', function () {
      applyEmbeddedStageMode();
      window.requestAnimationFrame(applyEmbeddedStageMode);
      window.setTimeout(applyEmbeddedStageMode, 180);
      window.setTimeout(applyEmbeddedStageMode, 900);
    });

    new MutationObserver(function () {
      applyEmbeddedStageMode();
    }).observe(document.documentElement, { childList: true, subtree: true });
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
  themeMode?: string,
): string {
  const normalizedThemeMode = normalizeStarOfficeThemeMode(themeMode);
  const darkThemeVars = serializeThemePalette(STAR_OFFICE_UNAVAILABLE_THEME_PALETTES.dark);
  const lightThemeVars = serializeThemePalette(STAR_OFFICE_UNAVAILABLE_THEME_PALETTES.light);

  return `<!DOCTYPE html>
<html lang="zh-CN" class="theme-${normalizedThemeMode}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <script>
      (function () {
        try {
          var params = new URLSearchParams(window.location.search);
          var queryMode = params.get('themeMode');
          var storedMode = window.localStorage.getItem('oc_theme_mode');
          var nextMode =
            queryMode === 'light' || queryMode === 'dark'
              ? queryMode
              : storedMode === 'light' || storedMode === 'dark'
                ? storedMode
                : '${normalizedThemeMode}';

          var root = document.documentElement;
          root.classList.remove('theme-dark', 'theme-light');
          root.classList.add('theme-' + nextMode);
          root.style.colorScheme = nextMode;
        } catch (error) {
          document.documentElement.style.colorScheme = '${normalizedThemeMode}';
        }
      })();
    </script>
    <style>
      .theme-dark {
        color-scheme: dark;
        ${darkThemeVars}
      }

      .theme-light {
        color-scheme: light;
        ${lightThemeVars}
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--page-bg);
        color: var(--text-primary);
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .card {
        width: min(720px, calc(100vw - 48px));
        padding: 32px;
        border-radius: 20px;
        border: 1px solid var(--card-border);
        background: var(--card-bg);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: var(--eyebrow-color);
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
        color: var(--text-secondary);
      }
      code {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid var(--code-border);
        background: var(--code-bg);
        color: var(--text-primary);
      }
      .tip {
        margin-top: 20px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid var(--tip-border);
        background: var(--tip-bg);
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

function normalizeStarOfficeThemeMode(themeMode: string | undefined): StarOfficeThemeMode {
  return themeMode === 'light' ? 'light' : 'dark';
}

function serializeThemePalette(palette: StarOfficeUnavailableThemePalette): string {
  return [
    `--page-bg: ${palette.pageBg};`,
    `--card-bg: ${palette.cardBg};`,
    `--card-border: ${palette.cardBorder};`,
    `--eyebrow-color: ${palette.eyebrow};`,
    `--text-primary: ${palette.textPrimary};`,
    `--text-secondary: ${palette.textSecondary};`,
    `--code-bg: ${palette.codeBg};`,
    `--code-border: ${palette.codeBorder};`,
    `--tip-bg: ${palette.tipBg};`,
    `--tip-border: ${palette.tipBorder};`,
  ].join('\n');
}
