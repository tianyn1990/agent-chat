import type { CardHeader as CardHeaderType } from '@/types/card';
import styles from './CardHeader.module.less';

/** 各主题色对应的样式类名映射 */
const TEMPLATE_CLASS: Record<NonNullable<CardHeaderType['template']>, string> = {
  blue: styles.templateBlue,
  green: styles.templateGreen,
  yellow: styles.templateYellow,
  red: styles.templateRed,
  grey: styles.templateGrey,
};

interface CardHeaderProps {
  header: CardHeaderType;
  /** 卡片是否已过期（显示灰色过期标记） */
  expired?: boolean;
}

/**
 * 卡片头部组件
 * 支持 5 种主题色：blue / green / yellow / red / grey
 * 过期时整体降色并显示"已过期"角标
 */
export default function CardHeader({ header, expired }: CardHeaderProps) {
  const templateClass = TEMPLATE_CLASS[header.template ?? 'blue'];

  return (
    <div className={`${styles.header} ${templateClass} ${expired ? styles.expired : ''}`}>
      {/* 图标（可选） */}
      {header.icon && <span className={styles.icon}>{header.icon}</span>}

      <div className={styles.textArea}>
        {/* 主标题 */}
        <span className={styles.title}>{header.title}</span>

        {/* 副标题（可选） */}
        {header.subtitle && <span className={styles.subtitle}>{header.subtitle}</span>}
      </div>

      {/* 已过期角标 */}
      {expired && <span className={styles.expiredBadge}>已过期</span>}
    </div>
  );
}
