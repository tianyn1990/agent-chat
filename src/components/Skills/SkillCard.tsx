import { Card, Button, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { Skill } from '@/types/skill';
import { SKILL_CATEGORY_LABELS } from '@/types/skill';
import styles from './SkillCard.module.less';

interface SkillCardProps {
  /** 技能数据 */
  skill: Skill;
  /** 点击卡片回调 */
  onClick?: (skill: Skill) => void;
  /** 点击安装/卸载按钮回调 */
  onInstallClick?: (skill: Skill) => void;
  /** 是否正在加载（安装/卸载中） */
  loading?: boolean;
}

/**
 * 技能卡片组件
 * 展示技能的基本信息、安装状态、操作按钮
 */
export default function SkillCard({
  skill,
  onClick,
  onInstallClick,
  loading = false,
}: SkillCardProps) {
  const handleCardClick = () => {
    onClick?.(skill);
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡到卡片点击事件
    onInstallClick?.(skill);
  };

  return (
    <div
      className={`${styles.card} ${skill.installed ? styles.cardInstalled : ''}`}
      onClick={handleCardClick}
    >
      {/* 卡片头部：图标 + 名称 + 状态 */}
      <div className={styles.cardHeader}>
        <span className={styles.icon}>{skill.icon}</span>
        <div className={styles.headerRight}>
          <div className={styles.name}>{skill.name}</div>
          <div className={styles.tags}>
            <Tag className={styles.categoryTag}>{SKILL_CATEGORY_LABELS[skill.category]}</Tag>
            {skill.installed && (
              <span className={styles.installedBadge}>
                <CheckCircleOutlined />
                已安装
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 技能描述 */}
      <div className={styles.description}>{skill.description}</div>

      {/* 底部：版本 + 操作按钮 */}
      <div className={styles.footer}>
        <span className={styles.version}>v{skill.version}</span>
        <Button
          type={skill.installed ? 'default' : 'primary'}
          size="small"
          loading={loading}
          onClick={handleInstallClick}
        >
          {skill.installed ? '卸载' : '安装'}
        </Button>
      </div>
    </div>
  );
}
