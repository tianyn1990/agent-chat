import { Avatar, Dropdown, Tooltip, type MenuProps } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useState } from 'react';
import styles from './UserInfo.module.less';

/**
 * 侧边栏底部用户信息组件
 * 展示用户头像、姓名、部门，点击弹出操作菜单
 */
export default function UserInfo({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const userInfo = useUserStore((s) => s.userInfo);
  const logout = useUserStore((s) => s.logout);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      disabled: true, // 暂未实现
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  if (!userInfo) return null;

  const content = (
    <div
      className={`${styles.container} ${compact ? styles.containerCompact : ''}`}
      aria-label={compact ? `用户菜单：${userInfo.name}` : undefined}
    >
      <Avatar
        src={userInfo.avatar}
        size={compact ? 34 : 36}
        className={styles.avatar}
        icon={<UserOutlined />}
      />
      {!compact ? (
        <div className={styles.info}>
          <div className={styles.name}>{userInfo.name}</div>
          <div className={styles.department}>{userInfo.department}</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="topLeft"
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={(open) => {
        setDropdownOpen(open);
        if (open) {
          // 下拉菜单展开时立即关闭 hover 气泡，避免两层浮层互相遮挡。
          setTooltipOpen(false);
        }
      }}
    >
      {compact ? (
        <Tooltip
          title={`${userInfo.name} · ${userInfo.department}`}
          placement="right"
          open={tooltipOpen && !dropdownOpen}
          onOpenChange={(open) => {
            if (!dropdownOpen) {
              setTooltipOpen(open);
            }
          }}
          destroyOnHidden
        >
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </Dropdown>
  );
}
