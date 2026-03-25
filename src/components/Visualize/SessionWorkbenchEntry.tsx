import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import type { SessionVisualizeRuntime } from '@/types/visualize';
import styles from './SessionWorkbenchEntry.module.less';

interface SessionWorkbenchEntryProps {
  sessionId: string | null;
  runtime?: SessionVisualizeRuntime | null;
}

type EntryTone = 'default' | 'running' | 'error' | 'disabled';

interface PixelMonitorIconProps {
  busy: boolean;
  tone: EntryTone;
}

function isRuntimeActive(state?: SessionVisualizeRuntime['state']): boolean {
  return (
    state === 'researching' || state === 'writing' || state === 'executing' || state === 'syncing'
  );
}

/**
 * 会话级工作台入口的像素显示器图标。
 *
 * 设计原因：
 * - 使用自定义 SVG，避免再次回退到通用后台 icon
 * - 通过像素屏幕、支架和状态灯保留 Star-Office 的语义记忆点
 * - 动效只发生在图标内部，保证按钮尺寸与文本排版完全稳定
 */
function PixelMonitorIcon({ busy, tone }: PixelMonitorIconProps) {
  return (
    <span className={styles.monitorWrap} data-busy={busy ? 'true' : 'false'} aria-hidden="true">
      <svg viewBox="0 0 18 18" className={styles.monitorSvg} role="presentation" focusable="false">
        <rect x="2" y="3" width="14" height="10" rx="1" className={styles.monitorFrame} />
        <rect x="4" y="5" width="10" height="6" rx="0.4" className={styles.monitorScreen} />
        <rect x="4" y="5" width="10" height="1" className={styles.monitorTopBar} />
        <rect x="5" y="6" width="1" height="1" className={styles.monitorWindowRed} />
        <rect x="7" y="6" width="1" height="1" className={styles.monitorWindowAmber} />
        <rect x="9" y="6" width="1" height="1" className={styles.monitorWindowGreen} />
        <rect x="7" y="13" width="4" height="1" className={styles.monitorStand} />
        <rect x="6" y="14" width="6" height="1" className={styles.monitorBase} />
        <rect x="5" y="8" width="3" height="1" className={styles.monitorPixelPrimary} />
        <rect x="9" y="8" width="3" height="1" className={styles.monitorPixelAccent} />
        <rect x="5" y="10" width="2" height="1" className={styles.monitorPixelWarm} />
        <rect x="8" y="10" width="2" height="1" className={styles.monitorPixelSecondary} />
        <rect x="11" y="10" width="1" height="1" className={styles.monitorPixelAccent} />
      </svg>
      <span className={styles.monitorScanline} />
      <span className={styles.glyphDot} data-tone={tone} />
    </span>
  );
}

/**
 * 会话级执行状态入口。
 *
 * 设计原则：
 * - 入口属于当前会话，而不是某条消息
 * - 只借用像素办公室的记忆点，不把主界面改成游戏化按钮
 * - 入口状态同时感知 runtime 与 iframe lifecycle，保证用户能知道“正在执行”还是“正在进入工作台”
 */
export default function SessionWorkbenchEntry({
  sessionId,
  runtime = null,
}: SessionWorkbenchEntryProps) {
  const navigate = useNavigate();
  const openWorkbench = useVisualizeStore((state) => state.openWorkbench);
  const lifecycle = useVisualizeStore((state) =>
    sessionId ? (state.workbenchLifecycleBySession[sessionId] ?? null) : null,
  );

  const presentation = useMemo(() => {
    if (!sessionId) {
      return {
        tone: 'disabled' as EntryTone,
        label: '工作台暂不可用',
        busy: false,
      };
    }

    if (lifecycle?.status === 'warming') {
      return {
        tone: 'running' as EntryTone,
        label: '正在进入工作台',
        busy: true,
      };
    }

    if (lifecycle?.status === 'error' || runtime?.state === 'error') {
      return {
        tone: 'error' as EntryTone,
        label: lifecycle?.errorMessage ? '工作台异常' : '当前异常',
        busy: false,
      };
    }

    if (isRuntimeActive(runtime?.state)) {
      return {
        tone: 'running' as EntryTone,
        label: '工作台处理中',
        busy: true,
      };
    }

    if (lifecycle?.status === 'ready') {
      return {
        tone: 'default' as EntryTone,
        label: '恢复工作台',
        busy: false,
      };
    }

    return {
      tone: 'default' as EntryTone,
      label: '查看工作台',
      busy: false,
    };
  }, [lifecycle?.errorMessage, lifecycle?.status, runtime?.state, sessionId]);

  const handleOpenWorkbench = () => {
    if (!sessionId) {
      return;
    }

    openWorkbench(sessionId);
    navigate(`${ROUTES.VISUALIZE}/${sessionId}`);
  };

  return (
    <button
      type="button"
      className={styles.entry}
      data-tone={presentation.tone}
      data-busy={presentation.busy ? 'true' : 'false'}
      onClick={handleOpenWorkbench}
      disabled={!sessionId}
      aria-label={!sessionId ? '执行状态暂不可用' : '查看当前会话执行状态'}
    >
      <span className={styles.iconShell}>
        <PixelMonitorIcon busy={presentation.busy} tone={presentation.tone} />
      </span>

      <span className={styles.label}>{presentation.label}</span>
    </button>
  );
}
