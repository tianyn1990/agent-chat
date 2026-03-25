import { useEffect, useRef, useCallback } from 'react';
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
const PANEL_AUTO_CLOSE_DELAY = 5600;

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
  const timerRef = useRef<number | null>(null);

  const clearAutoCloseTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoCloseTimer = useCallback(() => {
    clearAutoCloseTimer();
    timerRef.current = window.setTimeout(() => {
      closePanel();
    }, PANEL_AUTO_CLOSE_DELAY);
  }, [clearAutoCloseTimer, closePanel]);

  useEffect(() => {
    if (!activeSessionId) {
      clearAutoCloseTimer();
      return undefined;
    }

    /**
     * 轻量提示只作为短暂恢复入口使用。
     * 这里延长驻留时间，并允许 hover 暂停，给用户足够时间理解这是“恢复工作台”入口。
     */
    startAutoCloseTimer();

    return () => {
      clearAutoCloseTimer();
    };
  }, [activeSessionId, clearAutoCloseTimer, startAutoCloseTimer]);

  if (!activeSessionId) return null;

  return (
    <aside
      className={styles.panel}
      onMouseEnter={clearAutoCloseTimer}
      onMouseLeave={startAutoCloseTimer}
    >
      <VisualizeSummaryView sessionId={activeSessionId} closable onClose={closePanel} />
    </aside>
  );
}
