import { Suspense, type ReactNode } from 'react';
import { Spin } from 'antd';

/** 全屏加载占位符 */
export function PageLoading() {
  return (
    <div
      style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Spin size="large" />
    </div>
  );
}

/** 包裹懒加载页面的 Suspense 容器 */
export function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}
