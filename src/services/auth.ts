import request from '@/utils/request';
import type { UserInfo } from '@/types/user';

/** 飞书 OAuth 回调响应 */
interface FeishuCallbackResponse {
  token: string;
  userInfo: UserInfo;
}

/** 认证相关 API */
export const authApi = {
  /**
   * 飞书 OAuth 回调：用 code 换取 token 和用户信息
   */
  async feishuCallback(code: string, state: string): Promise<FeishuCallbackResponse> {
    const res = await request.post<FeishuCallbackResponse>('/api/auth/feishu/callback', {
      code,
      state,
    });
    return res.data;
  },

  /**
   * 获取当前登录用户信息
   */
  async getMe(): Promise<UserInfo> {
    const res = await request.get<{ userInfo: UserInfo }>('/api/auth/me');
    return res.data.userInfo;
  },

  /**
   * 刷新 Token
   */
  async refreshToken(token: string): Promise<{ token: string }> {
    const res = await request.post<{ token: string }>('/api/auth/refresh', { token });
    return res.data;
  },

  /**
   * 退出登录（通知服务端使 token 失效）
   */
  async logout(): Promise<void> {
    await request.post('/api/auth/logout');
  },
};
