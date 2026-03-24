import { Form, Input, Select, DatePicker, Radio, Button } from 'antd';
import type { FormElement, FormField } from '@/types/card';
import styles from './Elements.module.less';

interface FormElementRendererProps {
  element: FormElement;
  /** 卡片是否已过期 */
  disabled?: boolean;
  /**
   * 表单提交回调
   * @param key - submitKey
   * @param value - 所有字段值的键值对
   */
  onSubmit: (key: string, value: Record<string, unknown>) => void;
}

/**
 * 卡片表单块渲染组件
 * 支持：文本输入、下拉选择、日期选择、单选按钮组
 * 提交时收集所有字段值，回传给服务端
 */
export default function FormElementRenderer({
  element,
  disabled,
  onSubmit,
}: FormElementRendererProps) {
  const [form] = Form.useForm<Record<string, unknown>>();

  const handleFinish = (values: Record<string, unknown>) => {
    // dayjs 日期对象转为 ISO 字符串
    const serialized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v && typeof v === 'object' && 'toISOString' in v) {
        serialized[k] = (v as { toISOString(): string }).toISOString().slice(0, 10);
      } else {
        serialized[k] = v;
      }
    }
    onSubmit(element.submitKey, serialized);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      disabled={disabled}
      className={styles.formEl}
      size="small"
    >
      {element.fields.map((field) => (
        <FormFieldItem key={field.key} field={field} />
      ))}

      {/* 提交按钮 */}
      <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
        <Button type="primary" htmlType="submit" size="small" disabled={disabled}>
          {element.submitText ?? '提交'}
        </Button>
      </Form.Item>
    </Form>
  );
}

// =============================
// 单个表单字段渲染
// =============================

interface FormFieldItemProps {
  field: FormField;
}

/**
 * 根据字段 tag 渲染对应的表单控件
 */
function FormFieldItem({ field }: FormFieldItemProps) {
  const rules = field.required ? [{ required: true, message: `${field.label}不能为空` }] : [];

  switch (field.tag) {
    case 'input':
      return (
        <Form.Item name={field.key} label={field.label} rules={rules}>
          <Input
            type={field.type ?? 'text'}
            placeholder={field.placeholder ?? `请输入${field.label}`}
          />
        </Form.Item>
      );

    case 'select':
      return (
        <Form.Item name={field.key} label={field.label} rules={rules}>
          <Select
            placeholder={`请选择${field.label}`}
            options={field.options}
            mode={field.multiple ? 'multiple' : undefined}
          />
        </Form.Item>
      );

    case 'date':
      return (
        <Form.Item name={field.key} label={field.label} rules={rules}>
          <DatePicker
            style={{ width: '100%' }}
            placeholder={`请选择${field.label}`}
            format={field.format ?? 'YYYY-MM-DD'}
          />
        </Form.Item>
      );

    case 'radio':
      return (
        <Form.Item name={field.key} label={field.label} rules={rules}>
          <Radio.Group>
            {field.options.map((opt) => (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      );

    default:
      return null;
  }
}
