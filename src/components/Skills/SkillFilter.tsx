import { Tag } from 'antd';
import type { SkillCategory } from '@/types/skill';
import { SKILL_CATEGORY_LABELS } from '@/types/skill';
import styles from './SkillFilter.module.less';

interface SkillFilterProps {
  /** 当前选中的分类 */
  selectedCategory: SkillCategory | 'all';
  /** 分类变化回调 */
  onChange: (category: SkillCategory | 'all') => void;
}

// 所有分类选项（包含"全部"）
const CATEGORIES: Array<{ key: SkillCategory | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'data_analysis', label: SKILL_CATEGORY_LABELS.data_analysis },
  { key: 'writing', label: SKILL_CATEGORY_LABELS.writing },
  { key: 'code', label: SKILL_CATEGORY_LABELS.code },
  { key: 'office', label: SKILL_CATEGORY_LABELS.office },
  { key: 'communication', label: SKILL_CATEGORY_LABELS.communication },
  { key: 'other', label: SKILL_CATEGORY_LABELS.other },
];

/**
 * 技能分类筛选组件
 * 支持按分类筛选技能列表
 */
export default function SkillFilter({ selectedCategory, onChange }: SkillFilterProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>分类：</span>
      <div className={styles.tags}>
        {CATEGORIES.map((cat) => (
          <Tag.CheckableTag
            key={cat.key}
            checked={selectedCategory === cat.key}
            onChange={() => onChange(cat.key)}
            className={styles.tag}
          >
            {cat.label}
          </Tag.CheckableTag>
        ))}
      </div>
    </div>
  );
}
