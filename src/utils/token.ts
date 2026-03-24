import { STORAGE_KEYS } from '@/constants';

/** Token 过期提前刷新的时间窗口（5 分钟） */
const REFRESH_THRESHOLD = 5 * 60 * 1000;

/**
 * 解析 JWT payload（不验证签名，仅用于读取过期时间）
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 获取本地存储的 Token */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/** 存储 Token */
export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

/** 清除 Token */
export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

/**
 * 检查 Token 是否有效（未过期）
 * @param token - JWT token 字符串，不传则读取本地存储
 */
export function isTokenValid(token?: string | null): boolean {
  const t = token ?? getToken();
  if (!t) return false;

  const payload = parseJwtPayload(t);
  if (!payload || typeof payload.exp !== 'number') return false;

  // exp 是秒级时间戳
  return payload.exp * 1000 > Date.now();
}

/**
 * 检查 Token 是否即将过期（在刷新阈值内）
 */
export function isTokenExpiringSoon(token?: string | null): boolean {
  const t = token ?? getToken();
  if (!t) return false;

  const payload = parseJwtPayload(t);
  if (!payload || typeof payload.exp !== 'number') return false;

  return payload.exp * 1000 - Date.now() < REFRESH_THRESHOLD;
}
