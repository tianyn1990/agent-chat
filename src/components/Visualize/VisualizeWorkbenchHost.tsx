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
  const openWorkbench = useVisualizeStore((state) => state.openWorkbench);
  const hideWorkbench = useVisualizeStore((state) => state.hideWorkbench);

  useEffect(() => {
    const match = matchPath(`${ROUTES.VISUALIZE}/:sessionId`, location.pathname);
    const routeSessionId = match?.params.sessionId;

    if (routeSessionId) {
      openWorkbench(routeSessionId);
      return;
    }

    if (isWorkbenchVisible) {
      hideWorkbench();
    }
  }, [hideWorkbench, isWorkbenchVisible, location.pathname, openWorkbench]);

  return <VisualizeWorkbenchFrame sessionId={workbenchSessionId} visible={isWorkbenchVisible} />;
}
