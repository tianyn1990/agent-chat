import { createChatRuntimeConfig } from '@/config/chatRuntime';

/** 应用名称 */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'OpenClaw 助手';

/** 统一 chat runtime 配置。 */
export const CHAT_RUNTIME_CONFIG = createChatRuntimeConfig(import.meta.env);

/** 当前 chat runtime 模式。 */
export const CHAT_RUNTIME = CHAT_RUNTIME_CONFIG.mode;

/** 当前运行时是否要求走仓库原有登录态。 */
export const CHAT_RUNTIME_REQUIRES_LOGIN = CHAT_RUNTIME_CONFIG.requiresUserLogin;

/** 本地直连 OpenClaw Gateway 地址。 */
export const OPENCLAW_GATEWAY_URL = CHAT_RUNTIME_CONFIG.directGatewayUrl;

/** 本地直连 OpenClaw Gateway token。 */
export const OPENCLAW_GATEWAY_TOKEN = CHAT_RUNTIME_CONFIG.directGatewayToken;

/** 本地直连 OpenClaw Gateway password。 */
export const OPENCLAW_GATEWAY_PASSWORD = CHAT_RUNTIME_CONFIG.directGatewayPassword;

/** 本地直连 OpenClaw Gateway device token。 */
export const OPENCLAW_GATEWAY_DEVICE_TOKEN = CHAT_RUNTIME_CONFIG.directGatewayDeviceToken;

/** 本地直连 OpenClaw Gateway role。 */
export const OPENCLAW_GATEWAY_ROLE = CHAT_RUNTIME_CONFIG.directGatewayRole;

/** 本地直连 OpenClaw Gateway scopes。 */
export const OPENCLAW_GATEWAY_SCOPES = CHAT_RUNTIME_CONFIG.directGatewayScopes;

/** 本地直连 OpenClaw 客户端实例标识。 */
export const OPENCLAW_CLIENT_INSTANCE_ID = CHAT_RUNTIME_CONFIG.directClientInstanceId;

/** OpenClaw company gateway / proxy 基础地址。 */
export const OPENCLAW_PROXY_URL = CHAT_RUNTIME_CONFIG.proxyUrl;

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
export const IS_MOCK_ENABLED = CHAT_RUNTIME === 'mock-openclaw';

/** 本地存储 key */
export const STORAGE_KEYS = {
  TOKEN: 'oc_token',
  USER_INFO: 'oc_user_info',
  THEME: 'oc_theme_mode',
  OPENCLAW_DIRECT_DEVICE_IDENTITY: 'oc_openclaw_direct_device_identity',
  OPENCLAW_DIRECT_DEVICE_TOKENS: 'oc_openclaw_direct_device_tokens',
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
