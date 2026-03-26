import { STORAGE_KEYS } from '@/constants';

const ED25519_ALGORITHM = 'Ed25519';

interface StoredBrowserDeviceIdentity {
  version: 1;
  deviceId: string;
  publicKeyRawBase64Url: string;
  privateKeyPkcs8Base64Url: string;
  createdAtMs: number;
}

interface StoredBrowserDeviceTokenEntry {
  token: string;
  scopes: string[];
  updatedAtMs: number;
}

type StoredBrowserDeviceTokenMap = Record<string, StoredBrowserDeviceTokenEntry>;

export interface BrowserDeviceIdentity {
  deviceId: string;
  publicKeyRawBase64Url: string;
  privateKeyPkcs8Base64Url: string;
}

/**
 * 读取浏览器存储。
 *
 * 设计原因：
 * - 直连模式需要在页面刷新后复用同一 device identity
 * - 但测试环境或隐私模式下可能拿不到 `localStorage`
 * - 这里统一做降级，避免各调用点反复写 try/catch
 */
function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * 读取浏览器 `SubtleCrypto`。
 *
 * 设计原因：
 * - device identity 依赖 Ed25519 密钥对与签名
 * - 若浏览器连 `SubtleCrypto` 都不可用，继续走 direct 模式只会得到误导性的连接错误
 */
function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('当前浏览器不支持 Web Crypto，无法生成 OpenClaw device identity');
  }

  return subtle;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * 将 `Uint8Array` 收敛为稳定的 `ArrayBuffer`。
 *
 * 设计原因：
 * - TypeScript 在 DOM lib 中会把 `Uint8Array` 的底层 buffer 推导为 `ArrayBufferLike`
 * - `SubtleCrypto` 的若干签名声明要求更严格的 `ArrayBuffer`
 * - 这里统一切片为独立 `ArrayBuffer`，避免在 digest / importKey / sign 各处重复断言
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function digestSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await getSubtleCrypto().digest('SHA-256', toArrayBuffer(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readStoredIdentity(storage: Storage): StoredBrowserDeviceIdentity | null {
  const raw = storage.getItem(STORAGE_KEYS.OPENCLAW_DIRECT_DEVICE_IDENTITY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredBrowserDeviceIdentity>;
    if (
      parsed.version === 1 &&
      typeof parsed.deviceId === 'string' &&
      typeof parsed.publicKeyRawBase64Url === 'string' &&
      typeof parsed.privateKeyPkcs8Base64Url === 'string'
    ) {
      return {
        version: 1,
        deviceId: parsed.deviceId,
        publicKeyRawBase64Url: parsed.publicKeyRawBase64Url,
        privateKeyPkcs8Base64Url: parsed.privateKeyPkcs8Base64Url,
        createdAtMs: typeof parsed.createdAtMs === 'number' ? parsed.createdAtMs : Date.now(),
      };
    }
  } catch {
    // 历史脏数据直接忽略，让后续流程重新生成稳定身份。
  }

  return null;
}

/**
 * 加载或创建浏览器侧 device identity。
 *
 * 设计原因：
 * - 真实 OpenClaw 浏览器直连必须携带签名过的 device 信息
 * - identity 必须在刷新后保持稳定，否则每次刷新都会被当成全新设备
 */
export async function loadOrCreateBrowserDeviceIdentity(): Promise<BrowserDeviceIdentity> {
  const storage = getBrowserStorage();
  const existing = storage ? readStoredIdentity(storage) : null;
  if (existing) {
    return existing;
  }

  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey({ name: ED25519_ALGORITHM }, true, ['sign', 'verify']);
  const publicKeyRaw = new Uint8Array(await subtle.exportKey('raw', keyPair.publicKey));
  const privateKeyPkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', keyPair.privateKey));
  const identity: BrowserDeviceIdentity = {
    deviceId: await digestSha256Hex(publicKeyRaw),
    publicKeyRawBase64Url: encodeBase64Url(publicKeyRaw),
    privateKeyPkcs8Base64Url: encodeBase64Url(privateKeyPkcs8),
  };

  storage?.setItem(
    STORAGE_KEYS.OPENCLAW_DIRECT_DEVICE_IDENTITY,
    JSON.stringify({
      version: 1,
      ...identity,
      createdAtMs: Date.now(),
    } satisfies StoredBrowserDeviceIdentity),
  );

  return identity;
}

/**
 * 构建与官方 v3 规则一致的 device auth payload。
 *
 * 设计原因：
 * - Gateway 校验签名时要求字段顺序严格一致
 * - 将拼接逻辑收口后，transport 只负责提供上下文参数，避免遗漏字段
 */
export function buildBrowserDeviceAuthPayloadV3(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce: string;
  platform: string;
  deviceFamily: string;
}): string {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
    params.platform.trim().toLowerCase(),
    params.deviceFamily.trim().toLowerCase(),
  ].join('|');
}

/**
 * 使用浏览器持久化的私钥对 device payload 做签名。
 *
 * 设计原因：
 * - direct 模式的核心就是在浏览器内模拟控制 UI 的设备身份行为
 * - transport 不应自己理解 key import / sign 细节，只消费最终签名结果
 */
export async function signBrowserDevicePayload(
  privateKeyPkcs8Base64Url: string,
  payload: string,
): Promise<string> {
  const subtle = getSubtleCrypto();
  const privateKey = await subtle.importKey(
    'pkcs8',
    toArrayBuffer(decodeBase64Url(privateKeyPkcs8Base64Url)),
    { name: ED25519_ALGORITHM },
    false,
    ['sign'],
  );
  const signature = await subtle.sign(
    ED25519_ALGORITHM,
    privateKey,
    toArrayBuffer(new TextEncoder().encode(payload)),
  );
  return encodeBase64Url(new Uint8Array(signature));
}

function readStoredDeviceTokenMap(storage: Storage): StoredBrowserDeviceTokenMap {
  const raw = storage.getItem(STORAGE_KEYS.OPENCLAW_DIRECT_DEVICE_TOKENS);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StoredBrowserDeviceTokenMap;
  } catch {
    return {};
  }
}

export function loadBrowserDeviceAuthToken(params: {
  deviceId: string;
  role: string;
}): StoredBrowserDeviceTokenEntry | null {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  const tokenMap = readStoredDeviceTokenMap(storage);
  return tokenMap[`${params.deviceId}:${params.role}`] ?? null;
}

/**
 * 删除某个浏览器设备在指定 role 下缓存的 device token。
 *
 * 设计原因：
 * - `device signature invalid / expired` 往往不是 identity 损坏，而是 token 与当前握手上下文漂移
 * - 这时应优先只清理冲突 token，而不是粗暴重建整套 device identity
 */
export function clearBrowserDeviceAuthToken(params: { deviceId: string; role: string }): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const tokenMap = readStoredDeviceTokenMap(storage);
  const tokenKey = `${params.deviceId}:${params.role}`;
  if (!(tokenKey in tokenMap)) {
    return;
  }

  delete tokenMap[tokenKey];
  storage.setItem(STORAGE_KEYS.OPENCLAW_DIRECT_DEVICE_TOKENS, JSON.stringify(tokenMap));
}

/**
 * 持久化 Gateway 返回的 device token。
 *
 * 设计原因：
 * - 首次直连后，Gateway 会下发与设备绑定的 token
 * - 后续重连继续复用它，才能逼近真实控制 UI 的行为，并减少重复配对成本
 */
export function storeBrowserDeviceAuthToken(params: {
  deviceId: string;
  role: string;
  token: string;
  scopes: string[];
}): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const tokenMap = readStoredDeviceTokenMap(storage);
  tokenMap[`${params.deviceId}:${params.role}`] = {
    token: params.token,
    scopes: params.scopes,
    updatedAtMs: Date.now(),
  };
  storage.setItem(STORAGE_KEYS.OPENCLAW_DIRECT_DEVICE_TOKENS, JSON.stringify(tokenMap));
}
