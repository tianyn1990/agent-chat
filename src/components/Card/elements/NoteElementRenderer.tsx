import {
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { NoteElement } from '@/types/card';
import styles from './Elements.module.less';

/** 各提示类型对应的图标和样式 */
const NOTE_CONFIG: Record<
  NonNullable<NoteElement['type']>,
  { icon: React.ReactNode; className: string }
> = {
  info: { icon: <InfoCircleOutlined />, className: styles.noteInfo },
  warning: { icon: <WarningOutlined />, className: styles.noteWarning },
  success: { icon: <CheckCircleOutlined />, className: styles.noteSuccess },
  error: { icon: <CloseCircleOutlined />, className: styles.noteError },
};

interface NoteElementRendererProps {
  element: NoteElement;
}

/**
 * 卡片备注/提示块渲染组件
 * 支持 info / warning / success / error 四种样式
 * 默认为 info 类型
 */
export default function NoteElementRenderer({ element }: NoteElementRendererProps) {
  const config = NOTE_CONFIG[element.type ?? 'info'];

  return (
    <div className={`${styles.noteEl} ${config.className}`}>
      <span className={styles.noteIcon}>{config.icon}</span>
      <span className={styles.noteText}>{element.text}</span>
    </div>
  );
}
