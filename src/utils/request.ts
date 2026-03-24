import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/constants';
import { getToken, clearToken, isTokenExpiringSoon } from './token';

/**
 * 创建 Axios 实例
 */
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器：自动添加 Authorization header
 */
request.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 检测 Token 即将过期，触发静默刷新（异步，不阻塞当前请求）
    if (token && isTokenExpiringSoon(token)) {
      // 静默刷新（不等待结果）
      refreshTokenSilently().catch(console.warn);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * 响应拦截器：统一处理 401（Token 过期）
 */
request.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 无效，同步清除 localStorage 和 store，再跳转登录
      clearToken();
      const { useUserStore } = await import('@/stores/useUserStore');
      useUserStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** 静默刷新 Token（不影响用户操作） */
async function refreshTokenSilently(): Promise<void> {
  const token = getToken();
  if (!token) return;

  try {
    const res = await axios.post<{ token: string }>(`${API_BASE_URL}/api/auth/refresh`, { token });
    const newToken = res.data.token;

    // 同时更新 localStorage 和 Zustand store，保持单一真实状态源
    const { setToken } = await import('./token');
    setToken(newToken);
    // 动态导入避免循环依赖（store → request → store）
    const { useUserStore } = await import('@/stores/useUserStore');
    useUserStore.getState().setToken(newToken);
  } catch {
    // 刷新失败不做处理，等待自然过期后由 401 拦截器处理
  }
}

export default request;
