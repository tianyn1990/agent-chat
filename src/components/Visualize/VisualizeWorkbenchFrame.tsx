import { Button } from 'antd';
import { HolderOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useChatStore } from '@/stores/useChatStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import { VISUALIZE_STATE_LABELS } from '@/types/visualize';
import VisualizeWorkspaceView from './VisualizeWorkspaceView';
import styles from './VisualizeWorkbenchFrame.module.less';

interface VisualizeWorkbenchFrameProps {
  sessionId: string | null;
  visible: boolean;
}

type FrameLoadState = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

/**
 * iframe 首开超时时间。
 *
 * 设计原因：
 * - iframe 网络错误缺少稳定的原生 `error` 事件
 * - 因此需要在宿主层给出“加载过慢/疑似失败”的明确反馈，避免长时间白屏
 */
const FRAME_LOAD_TIMEOUT = 9000;

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
  const MIN_TOOLBAR_LEFT = 12;
  const MIN_TOOLBAR_TOP = 88;
  const TOOLBAR_KEYBOARD_STEP = 16;
  const TOOLBAR_KEYBOARD_STEP_FAST = 48;
  const navigate = useNavigate();
  const sessionTitle = useChatStore((state) =>
    sessionId
      ? (state.sessions.find((session) => session.id === sessionId)?.title ?? sessionId)
      : '',
  );
  const runtime = useVisualizeStore((state) =>
    sessionId ? (state.runtimeBySession[sessionId] ?? null) : null,
  );
  const hideWorkbench = useVisualizeStore((state) => state.hideWorkbench);
  const markWorkbenchLoading = useVisualizeStore((state) => state.markWorkbenchLoading);
  const markWorkbenchReady = useVisualizeStore((state) => state.markWorkbenchReady);
  const markWorkbenchError = useVisualizeStore((state) => state.markWorkbenchError);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [toolbarPosition, setToolbarPosition] = useState({ left: 18, top: 94 });
  const [frameLoadState, setFrameLoadState] = useState<FrameLoadState>('idle');
  const [frameLoadError, setFrameLoadError] = useState('');
  const toolbarRef = useRef<HTMLElement | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);
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

  const clearFrameLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  /**
   * 统一处理工作台 iframe 的加载生命周期。
   *
   * 设计原因：
   * - 预热、首开遮罩和缓存命中都依赖这组状态
   * - 将状态机收敛到宿主层后，外层按钮、恢复提示和工作台封面可以共享同一事实来源
   */
  const handleWorkspaceLoadStateChange = useCallback(
    (nextState: 'loading' | 'ready' | 'unavailable') => {
      if (!sessionId) {
        return;
      }

      if (nextState === 'loading') {
        clearFrameLoadTimeout();
        setFrameLoadError('');
        setFrameLoadState('loading');
        markWorkbenchLoading(sessionId);

        loadTimeoutRef.current = window.setTimeout(() => {
          setFrameLoadState('error');
          setFrameLoadError('工作台加载时间较长，请稍后重试或点击右上角刷新。');
          markWorkbenchError(sessionId, '工作台加载超时');
        }, FRAME_LOAD_TIMEOUT);
        return;
      }

      clearFrameLoadTimeout();

      if (nextState === 'ready') {
        setFrameLoadError('');
        setFrameLoadState('ready');
        markWorkbenchReady(sessionId);
        return;
      }

      setFrameLoadState('unavailable');
      setFrameLoadError('');
    },
    [
      clearFrameLoadTimeout,
      markWorkbenchError,
      markWorkbenchLoading,
      markWorkbenchReady,
      sessionId,
    ],
  );

  const handleBack = () => {
    if (!sessionId) {
      return;
    }

    hideWorkbench();
    navigate(`${ROUTES.CHAT}/${sessionId}`);
  };

  const handleRefresh = () => {
    /**
     * 主动刷新代表用户希望重新拉起同一会话的办公室 iframe。
     * 这里先清空当前 ready/error 视觉状态，再通过 key 变化强制重建 iframe。
     */
    clearFrameLoadTimeout();
    setFrameLoadState('idle');
    setFrameLoadError('');
    setRefreshVersion((value) => value + 1);
  };

  /**
   * 将工具条位置限制在当前视口内，避免用户拖拽后把入口完全移出屏幕。
   */
  const clampToolbarPosition = useCallback((left: number, top: number) => {
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 168;
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 40;
    const maxLeft = Math.max(MIN_TOOLBAR_LEFT, window.innerWidth - toolbarWidth - MIN_TOOLBAR_LEFT);
    const maxTop = Math.max(MIN_TOOLBAR_TOP, window.innerHeight - toolbarHeight - MIN_TOOLBAR_LEFT);

    return {
      left: Math.min(Math.max(MIN_TOOLBAR_LEFT, left), maxLeft),
      top: Math.min(Math.max(MIN_TOOLBAR_TOP, top), maxTop),
    };
  }, []);

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

  const handleToolbarPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const nextLeft = dragState.startLeft + event.clientX - dragState.startX;
      const nextTop = dragState.startTop + event.clientY - dragState.startY;
      setToolbarPosition(clampToolbarPosition(nextLeft, nextTop));
    },
    [clampToolbarPosition],
  );

  const handleToolbarPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  /**
   * 为拖拽手柄提供键盘可达路径。
   * 方向键微调位置，Shift+方向键加速，保证无法使用指针时也能重新安置工具条。
   */
  const handleDragHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? TOOLBAR_KEYBOARD_STEP_FAST : TOOLBAR_KEYBOARD_STEP;

      const nextPosition = (() => {
        switch (event.key) {
          case 'ArrowLeft':
            return clampToolbarPosition(toolbarPosition.left - step, toolbarPosition.top);
          case 'ArrowRight':
            return clampToolbarPosition(toolbarPosition.left + step, toolbarPosition.top);
          case 'ArrowUp':
            return clampToolbarPosition(toolbarPosition.left, toolbarPosition.top - step);
          case 'ArrowDown':
            return clampToolbarPosition(toolbarPosition.left, toolbarPosition.top + step);
          default:
            return null;
        }
      })();

      if (!nextPosition) {
        return;
      }

      event.preventDefault();
      setToolbarPosition(nextPosition);
    },
    [clampToolbarPosition, toolbarPosition.left, toolbarPosition.top],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleResize = () => {
      setToolbarPosition((current) => clampToolbarPosition(current.left, current.top));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [clampToolbarPosition, visible]);

  useEffect(() => {
    return () => {
      clearFrameLoadTimeout();
    };
  }, [clearFrameLoadTimeout]);

  if (!sessionId) {
    return null;
  }

  const coverStatusLabel =
    frameLoadState === 'error'
      ? '连接异常'
      : frameLoadState === 'loading' || frameLoadState === 'idle'
        ? '进入中'
        : runtime
          ? VISUALIZE_STATE_LABELS[runtime.state]
          : '待命中';
  const coverDetail =
    frameLoadState === 'error'
      ? frameLoadError
      : runtime?.detail || '正在进入当前会话的沉浸式工作台…';
  const showLoadingCover =
    visible && frameLoadState !== 'ready' && frameLoadState !== 'unavailable';

  return (
    <section
      className={`${styles.shell} ${visible ? styles.visible : styles.hidden}`}
      aria-hidden={!visible}
    >
      <div className={styles.stage}>
        {/* 使用稳定的 sessionId 保持 iframe 常驻；仅当用户主动刷新时才强制重建。 */}
        <VisualizeWorkspaceView
          key={iframeKey}
          sessionId={sessionId}
          onLoadStateChange={handleWorkspaceLoadStateChange}
        />

        {showLoadingCover ? (
          <div className={styles.loadingCover} role="status" aria-live="polite">
            <div className={styles.loadingPanel}>
              <p className={styles.loadingEyebrow}>Workspace</p>
              <h2 className={styles.loadingTitle}>{sessionTitle}</h2>
              <div className={styles.loadingMeta}>
                <span
                  className={`${styles.loadingBadge} ${
                    frameLoadState === 'error' ? styles.loadingBadgeError : ''
                  }`}
                >
                  {coverStatusLabel}
                </span>
                <span className={styles.loadingSession}>会话：{sessionId}</span>
              </div>
              <p className={styles.loadingDetail}>{coverDetail}</p>
              <div className={styles.loadingRail} aria-hidden="true">
                <span className={styles.loadingRailActive} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 工具控件退到边缘窄坞，优先保证真实像素办公室的可视面积。 */}
      <header
        ref={toolbarRef}
        className={styles.toolbar}
        aria-label="执行状态工作台工具栏"
        style={{ left: toolbarPosition.left, top: toolbarPosition.top }}
      >
        <button
          type="button"
          className={styles.dragHandle}
          aria-label="拖动执行状态工具栏"
          onPointerDown={handleToolbarPointerDown}
          onPointerMove={handleToolbarPointerMove}
          onPointerUp={handleToolbarPointerUp}
          onPointerCancel={handleToolbarPointerUp}
          onKeyDown={handleDragHandleKeyDown}
        >
          <HolderOutlined />
        </button>
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
