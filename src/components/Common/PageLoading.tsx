import { Suspense, type ReactNode } from 'react';
import { Spin } from 'antd';

/** 全屏加载占位符 */
export function PageLoading() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /**
         * 懒加载占位需要延续主应用的 graphite 工作台基调，
         * 避免在路由切换时突然退回旧的高反差大面板背景。
         */
        background:
          'radial-gradient(circle at top left, rgba(123,145,255,0.08), transparent 20%), radial-gradient(circle at bottom right, rgba(199,155,101,0.06), transparent 18%), linear-gradient(180deg, #0a0c10 0%, #0f1319 100%)',
      }}
    >
      <Spin size="large" />
    </div>
  );
}

/** 包裹懒加载页面的 Suspense 容器 */
export function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}
