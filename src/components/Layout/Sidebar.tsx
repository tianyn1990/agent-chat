import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Divider, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/constants';
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

  /**
   * 会话档案面板只在聊天页作为二级 shelf 出现。
   * 默认展开，但允许用户手动收起，把宽度还给主舞台。
   */
  const [showExtra, setShowExtra] = useState(true);
  const canShowExtra = Boolean(extra) && currentKey === 'chat';

  const handleNavClick = (item: NavItem) => {
    navigate(item.path);
    setShowExtra(item.key === 'chat');
  };

  return (
    <aside
      className={`${styles.sidebar} ${canShowExtra && showExtra ? styles.sidebarExpanded : ''}`}
    >
      <div className={styles.rail}>
        <div className={styles.railTop}>
          <nav className={styles.nav} aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <Tooltip key={item.key} title={item.label} placement="right">
                <button
                  className={`${styles.navItem} ${
                    currentKey === item.key ? styles.navItemActive : ''
                  }`}
                  onClick={() => handleNavClick(item)}
                  aria-label={item.label}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              </Tooltip>
            ))}
          </nav>
        </div>

        <div className={styles.railBottom}>
          {canShowExtra ? (
            <Tooltip title={showExtra ? '收起档案面板' : '展开档案面板'} placement="right">
              {/* rail 只负责触发二级上下文，避免主舞台长期被宽侧栏锁死。 */}
              <button
                type="button"
                className={styles.railAction}
                onClick={() => setShowExtra((value) => !value)}
                aria-label={showExtra ? '收起档案面板' : '展开档案面板'}
              >
                {showExtra ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              </button>
            </Tooltip>
          ) : null}

          <UserInfo compact />
        </div>
      </div>

      {canShowExtra ? (
        <section className={`${styles.panel} ${showExtra ? '' : styles.panelHidden}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelCopy}>
              <div className={styles.panelTitle}>会话档案</div>
              <div className={styles.panelSubtitle}>保留主舞台宽度，只在需要时展开上下文。</div>
            </div>
          </div>
          <Divider className={styles.divider} />
          <div className={`${styles.extra} sidebar-scrollbar`}>{showExtra ? extra : null}</div>
        </section>
      ) : null}
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
      style={{ marginBottom: 6 }}
    >
      新建对话
    </Button>
  );
}
