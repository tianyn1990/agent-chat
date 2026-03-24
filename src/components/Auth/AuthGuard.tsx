import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { isTokenValid } from '@/utils/token';
import { ROUTES } from '@/constants';

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

  // 双重验证：Zustand store 中的 token 和 localStorage 中的 token
  if (!token || !isTokenValid(token)) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
