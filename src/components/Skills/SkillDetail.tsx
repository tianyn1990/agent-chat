import { Drawer, Button, Space, Tag, Divider, Typography, List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Skill } from '@/types/skill';
import { SKILL_CATEGORY_LABELS } from '@/types/skill';
import { ROUTES } from '@/constants';
import styles from './SkillDetail.module.less';

const { Title, Paragraph, Text } = Typography;

interface SkillDetailProps {
  /** 技能数据 */
  skill: Skill | null;
  /** 是否显示抽屉 */
  open: boolean;
  /** 关闭抽屉回调 */
  onClose: () => void;
  /** 安装/卸载按钮点击回调 */
  onInstallClick?: (skill: Skill) => void;
  /** 是否正在加载 */
  loading?: boolean;
}

/**
 * 技能详情抽屉组件
 * 展示技能的完整信息、功能特性、操作按钮
 */
export default function SkillDetail({
  skill,
  open,
  onClose,
  onInstallClick,
  loading = false,
}: SkillDetailProps) {
  const navigate = useNavigate();

  if (!skill) return null;

  // 在对话中使用：跳转到对话页并预填技能名称
  const handleUseInChat = () => {
    navigate(`${ROUTES.CHAT}?skill=${encodeURIComponent(skill.name)}`);
    onClose();
  };

  const handleInstall = () => {
    onInstallClick?.(skill);
  };

  return (
    <Drawer
      title={
        <Space>
          <span style={{ fontSize: 32 }}>{skill.icon}</span>
          <span>{skill.name}</span>
        </Space>
      }
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      closeIcon={<CloseOutlined />}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {skill.installed ? (
            <>
              <Button onClick={handleInstall} loading={loading} danger>
                卸载
              </Button>
              <Button type="primary" onClick={handleUseInChat}>
                在对话中使用
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={handleInstall} loading={loading}>
              安装
            </Button>
          )}
        </Space>
      }
    >
      <div className={styles.container}>
        {/* 基本信息 */}
        <div className={styles.meta}>
          <Space size="middle">
            <Text type="secondary">版本: {skill.version}</Text>
            <Text type="secondary">作者: {skill.author}</Text>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Tag color="blue">{SKILL_CATEGORY_LABELS[skill.category]}</Tag>
            {skill.installed && (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                已安装
              </Tag>
            )}
          </div>
        </div>

        <Divider />

        {/* 描述 */}
        <div className={styles.section}>
          <Title level={5}>📝 描述</Title>
          <Paragraph>{skill.description}</Paragraph>
        </div>

        {/* 主要功能 */}
        <div className={styles.section}>
          <Title level={5}>✨ 主要功能</Title>
          <List
            size="small"
            dataSource={skill.features}
            renderItem={(feature) => (
              <List.Item>
                <Text>• {feature}</Text>
              </List.Item>
            )}
          />
        </div>

        {/* 标签 */}
        {skill.tags && skill.tags.length > 0 && (
          <div className={styles.section}>
            <Title level={5}>🏷️ 标签</Title>
            <Space size="small" wrap>
              {skill.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}

        {/* 主页链接 */}
        {skill.homepage && (
          <div className={styles.section}>
            <Title level={5}>🔗 主页</Title>
            <a href={skill.homepage} target="_blank" rel="noopener noreferrer">
              {skill.homepage}
            </a>
          </div>
        )}
      </div>
    </Drawer>
  );
}
