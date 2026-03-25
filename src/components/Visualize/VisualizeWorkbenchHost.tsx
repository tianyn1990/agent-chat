import { matchPath, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ROUTES } from '@/constants';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import VisualizeWorkbenchFrame from './VisualizeWorkbenchFrame';

/**
 * 全局常驻的沉浸式工作台宿主。
 *
 * 说明：
 * - 它位于路由树的持久层级，避免在路由切换时被 React 卸载
 * - 路由只负责声明“当前是否应该展示工作台”
 * - 真正的 iframe 实例由该宿主统一保活
 */
export default function VisualizeWorkbenchHost() {
  const location = useLocation();
  const isWorkbenchVisible = useVisualizeStore((state) => state.isWorkbenchVisible);
  const workbenchSessionId = useVisualizeStore((state) => state.workbenchSessionId);
  const workbenchCacheSessionIds = useVisualizeStore((state) => state.workbenchCacheSessionIds);
  const ensureWorkbenchSession = useVisualizeStore((state) => state.ensureWorkbenchSession);
  const openWorkbench = useVisualizeStore((state) => state.openWorkbench);
  const hideWorkbench = useVisualizeStore((state) => state.hideWorkbench);

  useEffect(() => {
    const workbenchMatch = matchPath(`${ROUTES.VISUALIZE}/:sessionId`, location.pathname);
    const routeSessionId = workbenchMatch?.params.sessionId;
    const chatMatch = matchPath(`${ROUTES.CHAT}/:sessionId`, location.pathname);
    const chatSessionId = chatMatch?.params.sessionId;

    if (routeSessionId) {
      if (!isWorkbenchVisible || workbenchSessionId !== routeSessionId) {
        openWorkbench(routeSessionId);
      }
      return;
    }

    /**
     * 在聊天页中静默预热当前会话的工作台。
     *
     * 设计原因：
     * - 用户首次点击“执行状态”时最容易感知到白屏
     * - 预先挂载隐藏 iframe 可以把初始化成本提前到会话浏览阶段
     */
    if (chatSessionId) {
      ensureWorkbenchSession(chatSessionId);
    }

    if (isWorkbenchVisible) {
      hideWorkbench();
    }
  }, [
    ensureWorkbenchSession,
    hideWorkbench,
    isWorkbenchVisible,
    location.pathname,
    openWorkbench,
    workbenchSessionId,
  ]);

  return (
    <>
      {workbenchCacheSessionIds.map((sessionId) => (
        <VisualizeWorkbenchFrame
          key={sessionId}
          sessionId={sessionId}
          visible={isWorkbenchVisible && workbenchSessionId === sessionId}
        />
      ))}
    </>
  );
}
