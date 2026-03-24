// ===========================
// 交互式卡片类型定义
// 参考飞书机器人卡片协议（简化版）
// ===========================

/** 卡片头部 */
export interface CardHeader {
  title: string;
  subtitle?: string;
  /** 主题色 */
  template?: 'blue' | 'green' | 'yellow' | 'red' | 'grey';
  /** 图标 URL 或内置图标名 */
  icon?: string;
}

/** 文本块 */
export interface DivElement {
  tag: 'div';
  /** 支持 Markdown */
  text: string;
  style?: 'primary' | 'secondary' | 'danger';
}

/** 分割线 */
export interface HrElement {
  tag: 'hr';
}

/** 图片块 */
export interface ImageElement {
  tag: 'image';
  src: string;
  alt?: string;
  width?: number | 'full';
}

/** 按钮操作 */
export interface ButtonAction {
  tag: 'button';
  /** 回传给服务端的标识 */
  key: string;
  text: string;
  type?: 'primary' | 'default' | 'danger';
  disabled?: boolean;
  /** 二次确认弹窗 */
  confirm?: {
    title: string;
    content: string;
  };
}

/** 下拉选择操作 */
export interface SelectAction {
  tag: 'select';
  key: string;
  placeholder?: string;
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
}

/** 操作区 */
export interface ActionElement {
  tag: 'action';
  layout?: 'horizontal' | 'vertical';
  actions: Array<ButtonAction | SelectAction>;
}

/** 表单 - 文本输入 */
export interface InputField {
  tag: 'input';
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'number' | 'email';
}

/** 表单 - 下拉选择 */
export interface SelectField {
  tag: 'select';
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  multiple?: boolean;
  required?: boolean;
}

/** 表单 - 日期选择 */
export interface DateField {
  tag: 'date';
  key: string;
  label: string;
  format?: string;
  required?: boolean;
}

/** 表单 - 单选按钮组 */
export interface RadioField {
  tag: 'radio';
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
}

/** 表单字段联合类型 */
export type FormField = InputField | SelectField | DateField | RadioField;

/** 表单块 */
export interface FormElement {
  tag: 'form';
  /** 提交时的 action key */
  submitKey: string;
  submitText?: string;
  fields: FormField[];
}

/** 备注/提示 */
export interface NoteElement {
  tag: 'note';
  text: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}

/** 卡片元素联合类型 */
export type CardElement =
  | DivElement
  | HrElement
  | ImageElement
  | ActionElement
  | FormElement
  | NoteElement;

/** 交互式卡片 */
export interface InteractiveCard {
  type: 'interactive_card';
  /** 卡片唯一 ID，用于回传操作 */
  cardId: string;
  header?: CardHeader;
  elements: CardElement[];
  /** 卡片是否已过期（用户操作后置为 true） */
  expired?: boolean;
}
