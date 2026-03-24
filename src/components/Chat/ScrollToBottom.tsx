import { DownOutlined } from '@ant-design/icons';
import styles from './ScrollToBottom.module.less';

interface ScrollToBottomProps {
  /** 是否显示（当用户上滚时显示） */
  visible: boolean;
  /** 是否有新消息未查看 */
  hasNewMessage?: boolean;
  /** 点击回到底部 */
  onClick: () => void;
}

/**
 * 回到最新消息浮动按钮
 * 当用户向上滚动时显示，点击滚动到最底部
 */
export default function ScrollToBottom({ visible, hasNewMessage, onClick }: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <button className={styles.btn} onClick={onClick} aria-label="回到最新消息">
      {hasNewMessage && <span className={styles.badge} />}
      <DownOutlined className={styles.icon} />
      {hasNewMessage && <span className={styles.text}>新消息</span>}
    </button>
  );
}
