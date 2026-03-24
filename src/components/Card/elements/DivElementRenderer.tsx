import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DivElement } from '@/types/card';
import styles from './Elements.module.less';

interface DivElementRendererProps {
  element: DivElement;
}

/** 文本样式类名映射 */
const STYLE_CLASS: Record<NonNullable<DivElement['style']>, string> = {
  primary: styles.textPrimary,
  secondary: styles.textSecondary,
  danger: styles.textDanger,
};

/**
 * 卡片文本块渲染组件
 * 支持 Markdown 格式（加粗、斜体、代码、链接等）
 * style 属性控制文字颜色主题
 */
export default function DivElementRenderer({ element }: DivElementRendererProps) {
  const styleClass = element.style ? STYLE_CLASS[element.style] : '';

  return (
    <div className={`${styles.divEl} ${styleClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 段落去掉默认 margin，由外层控制间距
          p: ({ children }) => <span className={styles.divParagraph}>{children}</span>,
          // 超链接在新标签页打开
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {element.text}
      </ReactMarkdown>
    </div>
  );
}
