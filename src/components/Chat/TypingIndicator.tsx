import styles from './TypingIndicator.module.less';

interface TypingIndicatorProps {
  mode?: 'pending' | 'streaming';
}

/**
 * AI 回复阶段提示组件。
 *
 * 设计原因：
 * - 用户发送后到首个 delta 返回前，需要一个明确但克制的 pending 承接
 * - 当前阶段继续沿用“微型像素显示器”语义，而不是引入额外角色化图标
 */
export default function TypingIndicator({ mode = 'streaming' }: TypingIndicatorProps) {
  if (mode === 'pending') {
    return (
      <div
        className={`${styles.container} ${styles.containerPending}`}
        aria-label="OpenClaw 正在准备回复"
      >
        <div className={styles.pendingChip}>
          <span className={styles.pendingIcon} aria-hidden="true">
            <svg
              viewBox="0 0 18 18"
              className={styles.monitorSvg}
              role="presentation"
              focusable="false"
            >
              <rect x="2" y="3" width="14" height="10" rx="1" className={styles.monitorFrame} />
              <rect x="4" y="5" width="10" height="6" rx="0.4" className={styles.monitorScreen} />
              <rect x="4" y="5" width="10" height="1" className={styles.monitorTopBar} />
              <rect x="5" y="6" width="1" height="1" className={styles.monitorWindowRed} />
              <rect x="7" y="6" width="1" height="1" className={styles.monitorWindowAmber} />
              <rect x="9" y="6" width="1" height="1" className={styles.monitorWindowGreen} />
              <rect x="5" y="8" width="3" height="1" className={styles.monitorPixelPrimary} />
              <rect x="9" y="8" width="3" height="1" className={styles.monitorPixelAccent} />
              <rect x="5" y="10" width="2" height="1" className={styles.monitorPixelWarm} />
              <rect x="8" y="10" width="2" height="1" className={styles.monitorPixelSecondary} />
              <rect x="11" y="10" width="1" height="1" className={styles.monitorPixelAccent} />
              <rect x="7" y="13" width="4" height="1" className={styles.monitorStand} />
              <rect x="6" y="14" width="6" height="1" className={styles.monitorBase} />
            </svg>
            <span className={styles.monitorGlow} />
          </span>
          <span className={styles.pendingLabel}>工作中</span>
          <span className={styles.pendingDot} />
          <span className={styles.pendingDot} />
          <span className={styles.pendingDot} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} aria-label="OpenClaw 正在输出内容">
      <div className={`${styles.bubble} ${styles.bubbleStreaming}`}>
        <span className={styles.pixelMonitorStreaming} aria-hidden="true">
          <svg
            viewBox="0 0 18 18"
            className={styles.monitorSvg}
            role="presentation"
            focusable="false"
          >
            <rect x="2" y="3" width="14" height="10" rx="1" className={styles.monitorFrame} />
            <rect x="4" y="5" width="10" height="6" rx="0.4" className={styles.monitorScreen} />
            <rect x="4" y="5" width="10" height="1" className={styles.monitorTopBar} />
            <rect x="5" y="6" width="1" height="1" className={styles.monitorWindowRed} />
            <rect x="7" y="6" width="1" height="1" className={styles.monitorWindowAmber} />
            <rect x="9" y="6" width="1" height="1" className={styles.monitorWindowGreen} />
            <rect x="5" y="8" width="3" height="1" className={styles.monitorPixelPrimary} />
            <rect x="9" y="8" width="3" height="1" className={styles.monitorPixelAccent} />
            <rect x="5" y="10" width="2" height="1" className={styles.monitorPixelWarm} />
            <rect x="8" y="10" width="2" height="1" className={styles.monitorPixelSecondary} />
            <rect x="11" y="10" width="1" height="1" className={styles.monitorPixelAccent} />
            <rect x="7" y="13" width="4" height="1" className={styles.monitorStand} />
            <rect x="6" y="14" width="6" height="1" className={styles.monitorBase} />
          </svg>
          <span className={styles.monitorGlow} />
        </span>
        <span className={styles.label}>正在输出</span>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
