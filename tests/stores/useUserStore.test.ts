import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '@/stores/useUserStore';
import { getToken } from '@/utils/token';
import type { UserInfo } from '@/types/user';

const mockUser: UserInfo = {
  id: 'user_001',
  name: '张三',
  avatar: 'https://example.com/avatar.png',
  department: '研发部',
};

describe('useUserStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useUserStore.setState({
      userInfo: null,
      token: null,
      isLoading: false,
    });
    localStorage.clear();
  });

  it('初始状态正确', () => {
    const state = useUserStore.getState();
    expect(state.userInfo).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('login 正确设置 token 和 userInfo', () => {
    const { login } = useUserStore.getState();
    login('test_token_xyz', mockUser);

    const state = useUserStore.getState();
    expect(state.token).toBe('test_token_xyz');
    expect(state.userInfo).toEqual(mockUser);
    // 同时写入 localStorage
    expect(getToken()).toBe('test_token_xyz');
  });

  it('logout 清除所有状态', () => {
    const { login, logout } = useUserStore.getState();
    login('test_token_xyz', mockUser);
    logout();

    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.userInfo).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('setUserInfo 更新用户信息', () => {
    const { setUserInfo } = useUserStore.getState();
    setUserInfo(mockUser);
    expect(useUserStore.getState().userInfo).toEqual(mockUser);
  });

  it('setLoading 更新 loading 状态', () => {
    const { setLoading } = useUserStore.getState();
    setLoading(true);
    expect(useUserStore.getState().isLoading).toBe(true);
    setLoading(false);
    expect(useUserStore.getState().isLoading).toBe(false);
  });
});
