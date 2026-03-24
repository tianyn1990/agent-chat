import { useState } from 'react';
import { Button, Select, Modal, Space } from 'antd';
import type { ActionElement, ButtonAction, SelectAction } from '@/types/card';
import styles from './Elements.module.less';

interface ActionElementRendererProps {
  element: ActionElement;
  /** 卡片是否已过期（禁用所有交互） */
  disabled?: boolean;
  /**
   * 动作回调
   * @param key - 操作标识
   * @param value - 操作值（按钮为 null，选择器为选中项）
   */
  onAction: (key: string, value: unknown) => void;
}

/**
 * 卡片操作区渲染组件
 * 支持水平/垂直布局，包含按钮和下拉选择器
 */
export default function ActionElementRenderer({
  element,
  disabled,
  onAction,
}: ActionElementRendererProps) {
  return (
    <div
      className={`${styles.actionEl} ${element.layout === 'vertical' ? styles.actionVertical : styles.actionHorizontal}`}
    >
      {element.actions.map((action, idx) => {
        if (action.tag === 'button') {
          return (
            <ButtonActionItem
              key={`${action.key}-${idx}`}
              action={action}
              disabled={disabled}
              onAction={onAction}
            />
          );
        }
        if (action.tag === 'select') {
          return (
            <SelectActionItem
              key={`${action.key}-${idx}`}
              action={action}
              disabled={disabled}
              onAction={onAction}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

// =============================
// 按钮子组件
// =============================

interface ButtonActionItemProps {
  action: ButtonAction;
  disabled?: boolean;
  onAction: (key: string, value: unknown) => void;
}

/**
 * 单个按钮渲染
 * 有 confirm 配置时，点击先弹出二次确认弹窗
 */
function ButtonActionItem({ action, disabled, onAction }: ButtonActionItemProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (action.confirm) {
      // 二次确认弹窗
      Modal.confirm({
        title: action.confirm.title,
        content: action.confirm.content,
        okText: '确认',
        cancelText: '取消',
        okButtonProps: {
          danger: action.type === 'danger',
        },
        onOk: async () => {
          setLoading(true);
          onAction(action.key, null);
          setLoading(false);
        },
      });
    } else {
      onAction(action.key, null);
    }
  };

  return (
    <Button
      type={action.type === 'danger' ? 'primary' : (action.type ?? 'default')}
      danger={action.type === 'danger'}
      disabled={disabled || action.disabled}
      loading={loading}
      onClick={handleClick}
      size="small"
    >
      {action.text}
    </Button>
  );
}

// =============================
// 下拉选择子组件
// =============================

interface SelectActionItemProps {
  action: SelectAction;
  disabled?: boolean;
  onAction: (key: string, value: unknown) => void;
}

/**
 * 下拉选择渲染
 * 支持单选和多选模式
 */
function SelectActionItem({ action, disabled, onAction }: SelectActionItemProps) {
  return (
    <Select
      placeholder={action.placeholder ?? '请选择'}
      options={action.options}
      mode={action.multiple ? 'multiple' : undefined}
      disabled={disabled}
      onChange={(value) => onAction(action.key, value)}
      style={{ minWidth: 120 }}
      size="small"
    />
  );
}

// 对外导出 Space 供其他组件使用
export { Space };
