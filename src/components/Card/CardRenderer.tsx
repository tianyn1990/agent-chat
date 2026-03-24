import { Divider, Image } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { InteractiveCard, CardElement } from '@/types/card';
import CardHeader from './CardHeader';
import DivElementRenderer from './elements/DivElementRenderer';
import ActionElementRenderer from './elements/ActionElementRenderer';
import FormElementRenderer from './elements/FormElementRenderer';
import NoteElementRenderer from './elements/NoteElementRenderer';
import styles from './CardRenderer.module.less';

interface CardRendererProps {
  /** 交互卡片数据 */
  card: InteractiveCard;
  /**
   * 动作回调（按钮点击 / 选择器变更）
   * @param cardId - 卡片 ID
   * @param key - 操作标识
   * @param value - 操作值
   */
  onAction: (cardId: string, key: string, value: unknown) => void;
  /**
   * 表单提交回调
   * @param cardId - 卡片 ID
   * @param submitKey - 提交 key
   * @param values - 表单字段键值对
   */
  onFormSubmit: (cardId: string, submitKey: string, values: Record<string, unknown>) => void;
}

/**
 * 交互式卡片渲染主组件
 *
 * 根据 card.elements 数组按序渲染各种元素：
 * - div: 文本块（支持 Markdown）
 * - hr: 分割线
 * - image: 图片
 * - action: 按钮 / 选择器组
 * - form: 表单
 * - note: 备注提示
 *
 * 卡片过期后（expired=true）：
 * - 禁用所有交互元素
 * - 头部显示"已过期"角标
 * - 底部显示"已提交"成功提示
 */
export default function CardRenderer({ card, onAction, onFormSubmit }: CardRendererProps) {
  const isExpired = !!card.expired;

  return (
    <div className={`${styles.card} ${isExpired ? styles.cardExpired : ''}`}>
      {/* 卡片头部（可选） */}
      {card.header && <CardHeader header={card.header} expired={isExpired} />}

      {/* 卡片内容区 */}
      <div className={styles.body}>
        {card.elements.map((element, idx) => (
          <ElementRenderer
            key={idx}
            element={element}
            disabled={isExpired}
            onAction={(key, value) => onAction(card.cardId, key, value)}
            onFormSubmit={(submitKey, values) => onFormSubmit(card.cardId, submitKey, values)}
          />
        ))}
      </div>

      {/* 过期后显示已提交成功标记 */}
      {isExpired && (
        <div className={styles.expiredOverlay}>
          <CheckCircleOutlined className={styles.expiredIcon} />
          <span className={styles.expiredText}>已提交</span>
        </div>
      )}
    </div>
  );
}

// =============================
// 单个元素的路由渲染
// =============================

interface ElementRendererProps {
  element: CardElement;
  disabled: boolean;
  onAction: (key: string, value: unknown) => void;
  onFormSubmit: (submitKey: string, values: Record<string, unknown>) => void;
}

/**
 * 根据 element.tag 路由到对应的子渲染组件
 */
function ElementRenderer({ element, disabled, onAction, onFormSubmit }: ElementRendererProps) {
  switch (element.tag) {
    case 'div':
      return <DivElementRenderer element={element} />;

    case 'hr':
      return <Divider style={{ margin: '8px 0' }} />;

    case 'image':
      return (
        <div className={styles.imageWrapper}>
          <Image
            src={element.src}
            alt={element.alt ?? ''}
            style={{
              width: element.width === 'full' ? '100%' : (element.width ?? 'auto'),
              maxWidth: '100%',
            }}
          />
        </div>
      );

    case 'action':
      return <ActionElementRenderer element={element} disabled={disabled} onAction={onAction} />;

    case 'form':
      return <FormElementRenderer element={element} disabled={disabled} onSubmit={onFormSubmit} />;

    case 'note':
      return <NoteElementRenderer element={element} />;

    default:
      return null;
  }
}
