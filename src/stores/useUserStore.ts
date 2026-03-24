import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/types/user';
import { clearToken, setToken as writeToken, getToken, isTokenValid } from '@/utils/token';
import { STORAGE_KEYS } from '@/constants';

interface UserState {
  /** 当前登录用户信息，未登录时为 null */
  userInfo: UserInfo | null;
  /** JWT Token（内存状态，由 localStorage 恢复） */
  token: string | null;
  /** 是否正在加载用户信息 */
  isLoading: boolean;

  // Actions
  /** 设置用户信息 */
  setUserInfo: (info: UserInfo) => void;
  /** 设置 Token（同时写入 localStorage） */
  setToken: (token: string) => void;
  /** 登录成功：同时设置 Token 和用户信息 */
  login: (token: string, userInfo: UserInfo) => void;
  /** 退出登录：清除所有状态 */
  logout: () => void;
  /** 设置 Loading 状态 */
  setLoading: (loading: boolean) => void;
}

/**
 * 从 localStorage 恢复有效 Token
 * 页面刷新后 Zustand 内存状态丢失，通过此函数还原单一真实状态源
 */
function restoreToken(): string | null {
  const token = getToken();
  return token && isTokenValid(token) ? token : null;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 初始化时立即从 localStorage 恢复 token，保证刷新后登录状态不丢失
      userInfo: null,
      token: restoreToken(),
      isLoading: false,

      setUserInfo: (info) => set({ userInfo: info }),

      setToken: (token) => {
        writeToken(token);
        set({ token });
      },

      login: (token, userInfo) => {
        writeToken(token);
        set({ token, userInfo });
      },

      logout: () => {
        clearToken();
        set({ token: null, userInfo: null });
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: STORAGE_KEYS.USER_INFO,
      // 持久化用户信息；token 由 restoreToken() 在初始化时从 localStorage 恢复，
      // 避免 Zustand persist 和 utils/token.ts 双写导致状态不一致
      partialize: (state) => ({ userInfo: state.userInfo }),
      // persist 恢复后，重新校验并恢复 token（防止 userInfo 存在但 token 过期的情况）
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.token = restoreToken();
        }
      },
    },
  ),
);
