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
        background:
          'radial-gradient(circle at top left, rgba(123,145,255,0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(199,155,101,0.08), transparent 22%), linear-gradient(180deg, #0a0c10 0%, #10141b 100%)',
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
