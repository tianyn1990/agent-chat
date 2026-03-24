import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Divider, Tooltip } from 'antd';
import { MessageOutlined, AppstoreOutlined, PlusOutlined } from '@ant-design/icons';
import { APP_NAME, ROUTES } from '@/constants';
import UserInfo from './UserInfo';
import styles from './Sidebar.module.less';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'chat',
    icon: <MessageOutlined />,
    label: '对话',
    path: ROUTES.CHAT,
  },
  {
    key: 'skills',
    icon: <AppstoreOutlined />,
    label: 'Skills',
    path: ROUTES.SKILLS,
  },
];

interface SidebarProps {
  /** 侧边栏底部（如会话列表）的插槽内容 */
  extra?: React.ReactNode;
  /** 当前激活的菜单 key */
  activeKey?: string;
}

/**
 * 左侧导航侧边栏
 * 包含 Logo、导航菜单、插槽（会话列表等）、底部用户信息
 */
export default function Sidebar({ extra, activeKey }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前路径计算激活菜单
  const currentKey =
    activeKey ?? NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))?.key ?? 'chat';

  const [showExtra, setShowExtra] = useState(true);

  const handleNavClick = (item: NavItem) => {
    navigate(item.path);
    setShowExtra(item.key === 'chat');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo 区域 */}
      <div className={styles.logoArea}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🦾</span>
          <div className={styles.logoTextGroup}>
            <span className={styles.logoText}>{APP_NAME}</span>
            <span className={styles.logoSubtext}>Agent Workspace</span>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Tooltip key={item.key} title="" placement="right">
            <button
              className={`${styles.navItem} ${currentKey === item.key ? styles.navItemActive : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          </Tooltip>
        ))}
      </nav>

      <Divider className={styles.divider} />

      {/* 插槽区域（当前菜单对应的子内容，如会话列表） */}
      {/* 始终渲染以占据剩余空间，将底部用户信息推到底部 */}
      <div className={`${styles.extra} sidebar-scrollbar`}>{showExtra && extra}</div>

      {/* 底部用户信息 */}
      <div className={styles.footer}>
        <Divider className={styles.divider} />
        <UserInfo />
      </div>
    </aside>
  );
}

/**
 * 对话页专用：侧边栏顶部"新建对话"按钮
 */
export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      block
      onClick={onClick}
      style={{ marginBottom: 8 }}
    >
      新建对话
    </Button>
  );
}
