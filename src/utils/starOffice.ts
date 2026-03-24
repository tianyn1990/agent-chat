import {
  STAR_OFFICE_REAL_DEV_BASE,
  STAR_OFFICE_REAL_DEV_ENABLED,
  STAR_OFFICE_MOCK_BASE,
  STAR_OFFICE_MOCK_ENABLED,
  STAR_OFFICE_URL,
} from '@/constants';
import {
  buildStarOfficeSessionFacadeUrl,
  normalizeStarOfficeRealDevBase,
} from '@/mocks/starOffice/realSidecar';

interface ResolveStarOfficeIframeUrlOptions {
  starOfficeUrl?: string;
  realDevEnabled?: boolean;
  realDevBase?: string;
  mockEnabled?: boolean;
  mockBase?: string;
}

/**
 * 规范化本地 mock 基础路径，保证：
 * 1. 一定以 `/` 开头
 * 2. 不以 `/` 结尾
 */
export function normalizeStarOfficeMockBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) {
    return '/__mock/star-office';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

/**
 * 给 Star-Office 地址追加 `sessionId` 查询参数。
 *
 * 说明：
 * - 对真实 Star-Office 服务来说，当前查询参数可能暂时不会被使用
 * - 但前端始终带上它，可以保证本地 mock 与未来服务端适配层口径一致
 */
export function appendSessionIdToUrl(url: string, sessionId: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  if (/^https?:\/\//.test(trimmedUrl)) {
    const parsed = new URL(trimmedUrl);
    parsed.searchParams.set('sessionId', sessionId);
    return parsed.toString();
  }

  const [pathWithoutHash, hash = ''] = trimmedUrl.split('#');
  const separator = pathWithoutHash.includes('?') ? '&' : '?';
  const urlWithQuery = `${pathWithoutHash}${separator}sessionId=${encodeURIComponent(sessionId)}`;

  return hash ? `${urlWithQuery}#${hash}` : urlWithQuery;
}

/**
 * 生成本地 mock 页面地址。
 */
export function buildLocalStarOfficeMockAppUrl(
  sessionId: string,
  mockBase = STAR_OFFICE_MOCK_BASE,
): string {
  return appendSessionIdToUrl(`${normalizeStarOfficeMockBase(mockBase)}/app`, sessionId);
}

/**
 * 生成真实 Star-Office 会话级 facade 地址。
 *
 * 说明：
 * - 真实接入路线默认采用 `/star-office/session/:sessionId/`
 * - 如果外部地址显式使用 `{sessionId}` 占位符，则按占位符替换
 */
export function buildRealStarOfficeFacadeUrl(
  sessionId: string,
  baseUrl = STAR_OFFICE_URL || STAR_OFFICE_REAL_DEV_BASE,
): string {
  return buildStarOfficeSessionFacadeUrl(baseUrl, sessionId);
}

/**
 * 计算执行状态面板最终应加载的 iframe 地址。
 *
 * 优先级：
 * 1. 显式配置的真实地址
 * 2. 开发期真实 Star-Office 联调地址
 * 3. 开发期本地 mock 页面
 * 4. 空字符串（由上层展示未配置提示）
 */
export function resolveStarOfficeIframeUrl(
  sessionId: string,
  options: ResolveStarOfficeIframeUrlOptions = {},
): string {
  const starOfficeUrl = options.starOfficeUrl ?? STAR_OFFICE_URL;
  const realDevEnabled = options.realDevEnabled ?? STAR_OFFICE_REAL_DEV_ENABLED;
  const realDevBase = options.realDevBase ?? STAR_OFFICE_REAL_DEV_BASE;
  const mockEnabled = options.mockEnabled ?? STAR_OFFICE_MOCK_ENABLED;
  const mockBase = options.mockBase ?? STAR_OFFICE_MOCK_BASE;

  if (starOfficeUrl.trim()) {
    return buildRealStarOfficeFacadeUrl(sessionId, starOfficeUrl);
  }

  if (realDevEnabled) {
    return buildRealStarOfficeFacadeUrl(sessionId, normalizeStarOfficeRealDevBase(realDevBase));
  }

  if (mockEnabled) {
    return buildLocalStarOfficeMockAppUrl(sessionId, mockBase);
  }

  return '';
}
