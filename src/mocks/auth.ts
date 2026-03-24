import type { UserInfo } from '@/types/user';

/** Mock 用户信息 */
const MOCK_USER: UserInfo = {
  id: 'mock_user_001',
  name: '测试用户',
  avatar: '',
  department: '研发部',
  email: 'test@company.com',
};

/** Mock JWT Token（不含真实签名，仅用于开发测试，过期时间 1 年后） */
const MOCK_TOKEN = (() => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: MOCK_USER.id,
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 3600, // 1 年后过期
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  return `${header}.${payload}.mock_signature`;
})();

/**
 * Mock 登录：直接返回模拟的 token 和用户信息
 * 仅在 VITE_MOCK_ENABLED=true 时使用
 */
export function mockLogin(): { token: string; userInfo: UserInfo } {
  return {
    token: MOCK_TOKEN,
    userInfo: MOCK_USER,
  };
}
