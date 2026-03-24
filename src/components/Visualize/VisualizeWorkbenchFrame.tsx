import { Button } from 'antd';
import { HolderOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import VisualizeWorkspaceView from './VisualizeWorkspaceView';
import styles from './VisualizeWorkbenchFrame.module.less';

interface VisualizeWorkbenchFrameProps {
  sessionId: string | null;
  visible: boolean;
}

/**
 * 沉浸式执行状态工作台外壳。
 *
 * 关键约束：
 * - 当 `visible=false` 时只隐藏，不卸载内部 iframe
 * - 这样再次进入同一会话时，可以直接复用真实 Star-Office 页面
 * - 工具控件以悬浮层形式覆盖在 iframe 之上，避免挤占主视口
 */
export default function VisualizeWorkbenchFrame({
  sessionId,
  visible,
}: VisualizeWorkbenchFrameProps) {
  const navigate = useNavigate();
  const hideWorkbench = useVisualizeStore((state) => state.hideWorkbench);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [toolbarPosition, setToolbarPosition] = useState({ left: 18, top: 18 });
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const iframeKey = useMemo(() => {
    if (!sessionId) {
      return 'workbench-empty';
    }

    return `${sessionId}-${refreshVersion}`;
  }, [refreshVersion, sessionId]);

  const handleBack = () => {
    if (!sessionId) {
      return;
    }

    hideWorkbench();
    navigate(`${ROUTES.CHAT}/${sessionId}`);
  };

  const handleRefresh = () => {
    setRefreshVersion((value) => value + 1);
  };

  /**
   * 工具条允许拖动，避免在不同办公室场景中遮挡关键区域。
   * 为了不影响按钮点击，仅允许从容器空白区域开始拖动。
   */
  const handleToolbarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: toolbarPosition.left,
        startTop: toolbarPosition.top,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [toolbarPosition.left, toolbarPosition.top],
  );

  const handleToolbarPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextLeft = Math.max(12, dragState.startLeft + event.clientX - dragState.startX);
    const nextTop = Math.max(12, dragState.startTop + event.clientY - dragState.startY);
    setToolbarPosition({ left: nextLeft, top: nextTop });
  }, []);

  const handleToolbarPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  if (!sessionId) {
    return null;
  }

  return (
    <section
      className={`${styles.shell} ${visible ? styles.visible : styles.hidden}`}
      aria-hidden={!visible}
    >
      <div className={styles.stage}>
        {/* 使用稳定的 sessionId 保持 iframe 常驻；仅当用户主动刷新时才强制重建。 */}
        <VisualizeWorkspaceView key={iframeKey} sessionId={sessionId} />
      </div>

      {/* 工具控件退到边缘窄坞，优先保证真实像素办公室的可视面积。 */}
      <header
        className={styles.toolbar}
        aria-label="执行状态工作台工具栏"
        style={{ left: toolbarPosition.left, top: toolbarPosition.top }}
      >
        <div
          className={styles.dragHandle}
          aria-label="拖动执行状态工具栏"
          onPointerDown={handleToolbarPointerDown}
          onPointerMove={handleToolbarPointerMove}
          onPointerUp={handleToolbarPointerUp}
          onPointerCancel={handleToolbarPointerUp}
        >
          <HolderOutlined />
        </div>
        <Button
          icon={<RollbackOutlined />}
          onClick={handleBack}
          aria-label="返回聊天"
          className={styles.primaryAction}
        >
          返回聊天
        </Button>

        <div className={styles.secondaryActions}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            aria-label="刷新"
            shape="circle"
          />
        </div>
      </header>
    </section>
  );
}
