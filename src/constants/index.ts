/** 应用名称 */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'OpenClaw 助手';

/** 飞书 OAuth 相关 */
export const FEISHU_APP_ID = import.meta.env.VITE_FEISHU_APP_ID || '';
export const FEISHU_REDIRECT_URI = import.meta.env.VITE_FEISHU_REDIRECT_URI || '';
export const FEISHU_OAUTH_URL = 'https://open.feishu.cn/open-apis/authen/v1/authorize';

/** API 地址 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Star-Office-UI 地址（建议配置为同域反向代理路径） */
export const STAR_OFFICE_URL = (import.meta.env.VITE_STAR_OFFICE_URL || '').trim();

/** 是否开启真实 Star-Office 本地联调模式 */
export const STAR_OFFICE_REAL_DEV_ENABLED =
  import.meta.env.VITE_STAR_OFFICE_REAL_DEV_ENABLED === 'true';

const rawStarOfficeRealDevBase = (import.meta.env.VITE_STAR_OFFICE_REAL_DEV_BASE || '/star-office')
  .trim()
  .replace(/\/+$/, '');

/** 真实 Star-Office 本地联调基础路径 */
export const STAR_OFFICE_REAL_DEV_BASE = rawStarOfficeRealDevBase.startsWith('/')
  ? rawStarOfficeRealDevBase
  : `/${rawStarOfficeRealDevBase}`;

/** 本地真实 Star-Office 上游目录（仅开发期使用） */
export const STAR_OFFICE_UPSTREAM_DIR = (
  import.meta.env.VITE_STAR_OFFICE_UPSTREAM_DIR || ''
).trim();

/** 是否启用本地 Star-Office mock */
export const STAR_OFFICE_MOCK_ENABLED = import.meta.env.VITE_STAR_OFFICE_MOCK_ENABLED === 'true';

const rawStarOfficeMockBase = (import.meta.env.VITE_STAR_OFFICE_MOCK_BASE || '/__mock/star-office')
  .trim()
  .replace(/\/+$/, '');

/** 本地 Star-Office mock 基础路径 */
export const STAR_OFFICE_MOCK_BASE = rawStarOfficeMockBase.startsWith('/')
  ? rawStarOfficeMockBase
  : `/${rawStarOfficeMockBase}`;

/** 是否开启 Mock */
export const IS_MOCK_ENABLED = import.meta.env.VITE_MOCK_ENABLED === 'true';

/** 本地存储 key */
export const STORAGE_KEYS = {
  TOKEN: 'oc_token',
  USER_INFO: 'oc_user_info',
} as const;

/** WebSocket 配置 */
export const WS_CONFIG = {
  HEARTBEAT_INTERVAL: 30000, // 30 秒心跳
  RECONNECT_MAX: 5, // 最多重连 5 次
  RECONNECT_BASE_DELAY: 1000, // 重连基础延迟 1 秒（指数退避）
} as const;

/** 路由路径 */
export const ROUTES = {
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  CHAT: '/chat',
  SKILLS: '/skills',
  VISUALIZE: '/visualize',
  STAR_OFFICE_REAL_DEV: STAR_OFFICE_REAL_DEV_BASE,
  STAR_OFFICE_MOCK_APP: `${STAR_OFFICE_MOCK_BASE}/app`,
} as const;
