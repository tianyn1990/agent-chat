import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styles from './SkillSearch.module.less';

interface SkillSearchProps {
  /** 搜索关键词 */
  value: string;
  /** 搜索关键词变化回调 */
  onChange: (value: string) => void;
  /** 占位文本 */
  placeholder?: string;
}

/**
 * 技能搜索框组件
 * 支持实时搜索技能名称、描述、标签
 */
export default function SkillSearch({
  value,
  onChange,
  placeholder = '搜索技能...',
}: SkillSearchProps) {
  return (
    <div className={styles.container}>
      <Input
        size="large"
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        allowClear
        aria-label="搜索技能"
      />
    </div>
  );
}
