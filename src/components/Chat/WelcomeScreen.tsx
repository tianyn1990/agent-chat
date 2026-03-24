import { useUserStore } from '@/stores/useUserStore';
import styles from './WelcomeScreen.module.less';

/** 快捷提问建议 */
const QUICK_SUGGESTIONS = [
  { label: '数据分析', text: '帮我分析一份销售数据，找出关键趋势', tone: '趋势与异常' },
  { label: '写作助手', text: '帮我写一份项目汇报的邮件模板', tone: '结构与措辞' },
  { label: '代码助手', text: '解释下 React useEffect 的执行时机', tone: '原理与示例' },
  { label: '常用功能', text: '有哪些常用的快捷功能可以帮助我提高工作效率？', tone: '能力总览' },
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
      {/* 欢迎态改为中心舞台，让首屏注意力先落在标题和底部 dock，而不是头部说明。 */}
      <div className={styles.hero}>
        <div className={styles.heroBadge}>Agent Console</div>
        <div className={styles.greeting}>
          <h2 className={styles.title}>你好，{displayName}。今天准备推进什么工作？</h2>
          <p className={styles.subtitle}>
            把目标、材料、待分析内容或执行动作交给我，我们从当前工作台继续推进。
          </p>
        </div>

        <div className={styles.quickRow}>
          {QUICK_SUGGESTIONS.map((item) => (
            <button
              key={item.label}
              className={styles.quickChip}
              onClick={() => onSuggestionClick(item.text)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.suggestions}>
          {QUICK_SUGGESTIONS.map((item, index) => (
            <button
              key={item.label}
              className={styles.suggestionCard}
              onClick={() => onSuggestionClick(item.text)}
            >
              <span className={styles.cardIndex}>0{index + 1}</span>
              <span className={styles.cardLabel}>{item.label}</span>
              <span className={styles.cardTone}>{item.tone}</span>
              <span className={styles.cardText}>{item.text}</span>
            </button>
          ))}
        </div>

        <div className={styles.heroNote}>
          <span className={styles.noteLabel}>调试提示</span>
          <span className={styles.noteText}>
            可以直接输入 test line、test card 或 test iframe，验证消息、结果和执行状态链路。
          </span>
        </div>
      </div>
    </div>
  );
}
