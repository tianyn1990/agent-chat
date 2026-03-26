import styles from './PendingReplyAccessory.module.less';

/**
 * 用户消息下方的轻量处理中挂件。
 *
 * 设计原因：
 * - pending 状态应表现为“系统正在回应这条用户消息”，而不是列表尾部的独立系统块
 * - 纯图标方案比文字更克制，也更贴近当前项目的工作台风格
 * - 图标采用旋转轨迹语义，表达“处理中 / 调度中”，避免回退到通用电脑图标
 */
export default function PendingReplyAccessory() {
  return (
    <div
      className={styles.container}
      role="status"
      aria-live="polite"
      aria-label="OpenClaw 正在准备回复"
    >
      <div className={styles.chip}>
        <span className={styles.spinner} aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            className={styles.spinnerSvg}
            role="presentation"
            focusable="false"
          >
            <circle cx="8" cy="8" r="5.5" className={styles.spinnerTrack} />
            <path d="M8 2.5a5.5 5.5 0 0 1 4.76 2.75" className={styles.spinnerPrimary} />
            <path d="M12.76 10.75A5.5 5.5 0 0 1 8 13.5" className={styles.spinnerAccent} />
            <path d="M3.24 10.75A5.5 5.5 0 0 1 3.24 5.25" className={styles.spinnerMuted} />
          </svg>
        </span>
      </div>
    </div>
  );
}
