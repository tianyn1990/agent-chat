import styles from './TypingIndicator.module.less';

/**
 * AI 思考中动画组件
 * 显示三个跳动的圆点，表示 AI 正在生成回复
 */
export default function TypingIndicator() {
  return (
    <div className={styles.container} aria-label="AI 正在思考">
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
