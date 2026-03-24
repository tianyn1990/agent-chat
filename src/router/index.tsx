import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/Auth/AuthGuard';
import AppShell from '@/components/Layout/AppShell';
import MainLayout from '@/components/Layout/MainLayout';
import { LazyPage } from '@/components/Common/PageLoading';
import RouteErrorBoundary from '@/components/Common/RouteErrorBoundary';
import { ROUTES } from '@/constants';

// 路由级懒加载，减小首屏包体积
const LoginPage = lazy(() => import('@/pages/Login'));
const AuthCallbackPage = lazy(() => import('@/pages/Login/Callback'));
const ChatPage = lazy(() => import('@/pages/Chat'));
const SkillsPage = lazy(() => import('@/pages/Skills'));
const VisualizePage = lazy(() => import('@/pages/Visualize'));
const StarOfficeMockPage = lazy(() => import('@/pages/StarOfficeMock'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        // 本地 Star-Office mock 页面（用于 iframe 承接，不依赖主布局）
        path: ROUTES.STAR_OFFICE_MOCK_APP,
        element: (
          <LazyPage>
            <StarOfficeMockPage />
          </LazyPage>
        ),
      },
      {
        // 登录页（不需要鉴权）
        path: ROUTES.LOGIN,
        element: (
          <LazyPage>
            <LoginPage />
          </LazyPage>
        ),
      },
      {
        // 飞书 OAuth 回调页
        path: ROUTES.AUTH_CALLBACK,
        element: (
          <LazyPage>
            <AuthCallbackPage />
          </LazyPage>
        ),
      },
      {
        // 沉浸式执行状态工作台（独立于主布局）
        path: 'visualize/:sessionId',
        element: (
          <AuthGuard>
            <LazyPage>
              <VisualizePage />
            </LazyPage>
          </AuthGuard>
        ),
      },
      {
        // 主应用布局（需要登录）
        path: '/',
        element: (
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        ),
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            // 对话页（支持可选的 sessionId 参数）
            path: 'chat/:sessionId?',
            element: (
              <LazyPage>
                <ChatPage />
              </LazyPage>
            ),
          },
          {
            // 技能市场
            path: 'skills',
            element: (
              <LazyPage>
                <SkillsPage />
              </LazyPage>
            ),
          },
          {
            // 默认重定向到对话页
            index: true,
            element: <Navigate to={ROUTES.CHAT} replace />,
          },
        ],
      },
    ],
  },
]);
