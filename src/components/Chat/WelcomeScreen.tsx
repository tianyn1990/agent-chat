import { useUserStore } from '@/stores/useUserStore';
import styles from './WelcomeScreen.module.less';

/** 快捷提问建议 */
const QUICK_SUGGESTIONS = [
  { label: '数据分析', text: '帮我分析一份销售数据，找出关键趋势' },
  { label: '写作助手', text: '帮我写一份项目汇报的邮件模板' },
  { label: '代码助手', text: '解释下 React useEffect 的执行时机' },
  { label: '常用功能', text: '有哪些常用的快捷功能可以帮助我提高工作效率？' },
];

interface WelcomeScreenProps {
  /** 点击快捷提问 */
  onSuggestionClick: (text: string) => void;
}

/**
 * 新对话欢迎界面
 * 当会话中没有消息时显示，提供快捷提问建议
 */
export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const userInfo = useUserStore((s) => s.userInfo);
  const displayName = userInfo?.name ?? '同学';

  return (
    <div className={styles.container}>
      {/* 欢迎语 */}
      <div className={styles.greeting}>
        <div className={styles.emoji}>👋</div>
        <h2 className={styles.title}>你好，{displayName}</h2>
        <p className={styles.subtitle}>有什么可以帮你的？</p>
      </div>

      {/* 快捷提问建议卡片 */}
      <div className={styles.suggestions}>
        {QUICK_SUGGESTIONS.map((item) => (
          <button
            key={item.label}
            className={styles.suggestionCard}
            onClick={() => onSuggestionClick(item.text)}
          >
            <span className={styles.cardLabel}>{item.label}</span>
            <span className={styles.cardText}>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
