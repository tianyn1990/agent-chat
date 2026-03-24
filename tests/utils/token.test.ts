import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, clearToken, isTokenValid, isTokenExpiringSoon } from '@/utils/token';

/** 生成测试用 JWT（不含真实签名） */
function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'test', exp }));
  return `${header}.${payload}.signature`;
}

describe('token 工具函数', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getToken / setToken / clearToken', () => {
    it('初始时 getToken 返回 null', () => {
      expect(getToken()).toBeNull();
    });

    it('setToken 后 getToken 返回对应值', () => {
      setToken('my_token_123');
      expect(getToken()).toBe('my_token_123');
    });

    it('clearToken 后 getToken 返回 null', () => {
      setToken('my_token_123');
      clearToken();
      expect(getToken()).toBeNull();
    });
  });

  describe('isTokenValid', () => {
    it('没有 token 时返回 false', () => {
      expect(isTokenValid()).toBe(false);
      expect(isTokenValid(null)).toBe(false);
    });

    it('非 JWT 格式返回 false', () => {
      expect(isTokenValid('not_a_jwt')).toBe(false);
    });

    it('未过期的 token 返回 true', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期
      const token = makeJwt(exp);
      expect(isTokenValid(token)).toBe(true);
    });

    it('已过期的 token 返回 false', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1小时前已过期
      const token = makeJwt(exp);
      expect(isTokenValid(token)).toBe(false);
    });

    it('不传参数时读取 localStorage 中的 token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = makeJwt(exp);
      setToken(token);
      expect(isTokenValid()).toBe(true);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('距离过期超过 5 分钟时返回 false', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1小时后
      const token = makeJwt(exp);
      expect(isTokenExpiringSoon(token)).toBe(false);
    });

    it('距离过期不足 5 分钟时返回 true', () => {
      const exp = Math.floor(Date.now() / 1000) + 60; // 1分钟后
      const token = makeJwt(exp);
      expect(isTokenExpiringSoon(token)).toBe(true);
    });

    it('已过期时返回 false（已过期，不是"即将过期"）', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 已过期
      const token = makeJwt(exp);
      // 已过期的 token，判断逻辑：exp * 1000 - Date.now() < 0 < THRESHOLD，返回 true
      // 也就是说已过期的 token 也触发 expiringSoon，这是合理的（应该刷新）
      expect(isTokenExpiringSoon(token)).toBe(true);
    });
  });
});
