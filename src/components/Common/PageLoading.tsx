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
         * 懒加载占位直接消费根节点主题背景。
         * 这样 dark / light 切换时，路由 fallback 不会再暴露上一套主题残留。
         */
        background: 'var(--app-background)',
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
