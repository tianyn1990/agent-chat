import { Outlet } from 'react-router-dom';
import VisualizeWorkbenchHost from '@/components/Visualize/VisualizeWorkbenchHost';

/**
 * 应用级壳层。
 *
 * 职责：
 * 1. 持久承载路由内容
 * 2. 在路由树之上常驻挂载沉浸式工作台宿主
 * 3. 让 `/chat` 与 `/visualize/:sessionId` 切换时不销毁真实 iframe
 */
export default function AppShell() {
  return (
    <>
      <Outlet />
      <VisualizeWorkbenchHost />
    </>
  );
}
