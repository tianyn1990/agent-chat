export type ChatRuntimeMode =
  | 'mock-openclaw'
  | 'openclaw-direct'
  | 'openclaw-proxy'
  | 'legacy-websocket';

export interface ChatRuntimeEnvInput {
  VITE_CHAT_RUNTIME?: string;
  VITE_MOCK_ENABLED?: string;
  VITE_OPENCLAW_GATEWAY_URL?: string;
  VITE_OPENCLAW_GATEWAY_TOKEN?: string;
  VITE_OPENCLAW_GATEWAY_PASSWORD?: string;
  VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN?: string;
  VITE_OPENCLAW_GATEWAY_ROLE?: string;
  VITE_OPENCLAW_GATEWAY_SCOPES?: string;
  VITE_OPENCLAW_CLIENT_INSTANCE_ID?: string;
  VITE_OPENCLAW_PROXY_URL?: string;
}

export interface ChatRuntimeConfig {
  mode: ChatRuntimeMode;
  requiresUserLogin: boolean;
  directGatewayUrl: string;
  directGatewayToken: string;
  directGatewayPassword: string;
  directGatewayDeviceToken: string;
  directGatewayRole: string;
  directGatewayScopes: string[];
  directClientInstanceId: string;
  proxyUrl: string;
}

const DEFAULT_DIRECT_OPERATOR_SCOPES = ['operator.read', 'operator.write', 'operator.admin'];

/**
 * 解析 CSV 风格 scopes 配置。
 *
 * 设计原因：
 * - `.env` 中更适合用单行字符串表达权限集合
 * - 统一在配置层拆分，可以避免 transport 与 adapter 各自处理脏数据
 */
function parseScopes(rawValue?: string): string[] {
  return (rawValue ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 兼容旧版 `VITE_MOCK_ENABLED`，同时引入显式 runtime。
 *
 * 设计原因：
 * - 仓库里仍有一部分历史配置和文档依赖旧布尔开关
 * - 第二阶段开始需要明确区分 mock / direct / legacy，不能再只靠布尔值
 */
export function resolveChatRuntimeMode(env: ChatRuntimeEnvInput): ChatRuntimeMode {
  const explicitMode = env.VITE_CHAT_RUNTIME?.trim() as ChatRuntimeMode | undefined;
  if (
    explicitMode === 'mock-openclaw' ||
    explicitMode === 'openclaw-direct' ||
    explicitMode === 'openclaw-proxy' ||
    explicitMode === 'legacy-websocket'
  ) {
    return explicitMode;
  }

  return env.VITE_MOCK_ENABLED === 'true' ? 'mock-openclaw' : 'legacy-websocket';
}

/**
 * 构建统一的 chat runtime 配置。
 *
 * 设计原因：
 * - 让页面层只依赖稳定配置对象，而不是反复读取 `import.meta.env`
 * - 方便测试环境直接传入伪环境变量，覆盖 direct / mock / legacy 三种场景
 */
export function createChatRuntimeConfig(env: ChatRuntimeEnvInput): ChatRuntimeConfig {
  const mode = resolveChatRuntimeMode(env);
  const directGatewayRole = (env.VITE_OPENCLAW_GATEWAY_ROLE ?? 'operator').trim() || 'operator';
  const parsedDirectScopes = parseScopes(env.VITE_OPENCLAW_GATEWAY_SCOPES);
  const directGatewayScopes =
    parsedDirectScopes.length > 0
      ? parsedDirectScopes
      : directGatewayRole === 'operator'
        ? DEFAULT_DIRECT_OPERATOR_SCOPES
        : ['operator.read', 'operator.write'];

  return {
    mode,
    requiresUserLogin: mode === 'legacy-websocket',
    directGatewayUrl: (env.VITE_OPENCLAW_GATEWAY_URL ?? '').trim(),
    directGatewayToken: (env.VITE_OPENCLAW_GATEWAY_TOKEN ?? '').trim(),
    directGatewayPassword: (env.VITE_OPENCLAW_GATEWAY_PASSWORD ?? '').trim(),
    directGatewayDeviceToken: (env.VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN ?? '').trim(),
    directGatewayRole,
    directGatewayScopes,
    directClientInstanceId: (env.VITE_OPENCLAW_CLIENT_INSTANCE_ID ?? '').trim(),
    /**
     * proxy 运行时默认走相对路径。
     *
     * 设计原因：
     * - 本地 Vite 代理和未来公司网关都更适合提供同域路径
     * - 统一默认值后，前端无需区分“本地 dev server”还是“正式 BFF”
     */
    proxyUrl: (env.VITE_OPENCLAW_PROXY_URL ?? '/__openclaw_proxy').trim() || '/__openclaw_proxy',
  };
}

/** 判断当前 hostname 是否属于本地直连允许范围。 */
export function isLoopbackHostname(hostname: string | null | undefined): boolean {
  const normalized = (hostname ?? '').trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1';
}
