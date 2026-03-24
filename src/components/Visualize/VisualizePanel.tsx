import { useEffect } from 'react';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import VisualizeSummaryView from './VisualizeSummaryView';
import styles from './VisualizePanel.module.less';

/**
 * 工作台收起后，轻量提示最多驻留的时间。
 *
 * 设计考虑：
 * - 需要给用户一个“当前工作台仍可恢复”的短暂反馈
 * - 但不应长期遮挡聊天界面
 */
const PANEL_AUTO_CLOSE_DELAY = 2200;

/**
 * 聊天页中的轻量执行状态提示容器。
 *
 * 说明：
 * - 这里不再是大面积右侧侧栏
 * - 它只作为工作台收起后的恢复入口和状态提示浮层
 */
export default function VisualizePanel() {
  const activeSessionId = useVisualizeStore((state) => state.panelSessionId);
  const closePanel = useVisualizeStore((state) => state.closePanel);

  useEffect(() => {
    if (!activeSessionId) {
      return undefined;
    }

    /**
     * 轻量提示只作为短暂恢复入口使用。
     * 定时自动关闭，避免用户从沉浸式工作台返回后一直看到悬浮弹窗。
     */
    const timerId = window.setTimeout(() => {
      closePanel();
    }, PANEL_AUTO_CLOSE_DELAY);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeSessionId, closePanel]);

  if (!activeSessionId) return null;

  return (
    <aside className={styles.panel}>
      <VisualizeSummaryView sessionId={activeSessionId} closable onClose={closePanel} />
    </aside>
  );
}
