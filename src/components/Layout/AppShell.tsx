import { Outlet } from 'react-router-dom';
import ChatRuntimeHost from '@/components/Chat/ChatRuntimeHost';
import VisualizeWorkbenchHost from '@/components/Visualize/VisualizeWorkbenchHost';

/**
 * 应用级壳层。
 *
 * 职责：
 * 1. 持久承载路由内容
 * 2. 常驻挂载 chat runtime 宿主，避免工作台路由切换时中断流式事件消费
 * 3. 在路由树之上常驻挂载沉浸式工作台宿主
 * 4. 让 `/chat` 与 `/visualize/:sessionId` 切换时不销毁真实 iframe
 */
export default function AppShell() {
  return (
    <>
      <Outlet />
      <ChatRuntimeHost />
      <VisualizeWorkbenchHost />
    </>
  );
}
