import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Divider, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  LeftOutlined,
  MessageOutlined,
  MoonOutlined,
  PlusOutlined,
  RightOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { ROUTES } from '@/constants';
import { useThemeStore } from '@/stores/useThemeStore';
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
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleMode);

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
          <Tooltip
            title={themeMode === 'dark' ? '切换到明亮皮肤' : '切换到深色皮肤'}
            placement="right"
          >
            {/* 主题切换入口放在 rail 底部，便于全局可发现，同时不打断聊天主舞台。 */}
            <button
              type="button"
              className={styles.railAction}
              onClick={toggleTheme}
              aria-label={themeMode === 'dark' ? '切换到明亮皮肤' : '切换到深色皮肤'}
            >
              {/* 图标展示当前主题状态，tooltip 继续表达点击后的切换动作，两者语义分离后更直觉。 */}
              {themeMode === 'dark' ? <MoonOutlined /> : <SunOutlined />}
            </button>
          </Tooltip>

          <UserInfo compact />
        </div>
      </div>

      {canShowExtra ? (
        <Tooltip title={showExtra ? '收起档案面板' : '展开档案面板'} placement="right">
          {/* panel 开关贴在 rail 与二级分区的边界上，让结构语义与交互触点保持一致。 */}
          <button
            type="button"
            className={`${styles.seamToggle} ${showExtra ? styles.seamToggleExpanded : ''}`}
            onClick={() => setShowExtra((value) => !value)}
            aria-label={showExtra ? '收起档案面板' : '展开档案面板'}
          >
            {/* 使用更轻的方向箭头，降低 seam toggle 对整体 chrome 的视觉侵入。 */}
            {showExtra ? <LeftOutlined /> : <RightOutlined />}
          </button>
        </Tooltip>
      ) : null}

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
