import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { isTokenValid } from '@/utils/token';
import { CHAT_RUNTIME_REQUIRES_LOGIN, ROUTES } from '@/constants';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * 路由守卫：未登录时重定向到登录页
 * 同时保存当前路径，登录后可跳回
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const token = useUserStore((s) => s.token);

  /**
   * mock、openclaw-direct 与 openclaw-proxy 都属于开发运行时，不再强依赖仓库原有登录态。
   *
   * 设计原因：
   * - 三种开发模式的目标都是降低联调门槛
   * - 若仍强制经过登录页，会让本地直连与本地 company-gateway 调试都无法在无公司鉴权环境下启动
   */
  if (!CHAT_RUNTIME_REQUIRES_LOGIN) {
    return <>{children}</>;
  }

  // 双重验证：Zustand store 中的 token 和 localStorage 中的 token
  if (!token || !isTokenValid(token)) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
