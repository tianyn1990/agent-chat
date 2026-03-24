import { Avatar, Dropdown, type MenuProps } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import styles from './UserInfo.module.less';

/**
 * 侧边栏底部用户信息组件
 * 展示用户头像、姓名、部门，点击弹出操作菜单
 */
export default function UserInfo() {
  const navigate = useNavigate();
  const userInfo = useUserStore((s) => s.userInfo);
  const logout = useUserStore((s) => s.logout);

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

  return (
    <Dropdown menu={{ items: menuItems }} placement="topLeft" trigger={['click']}>
      <div className={styles.container}>
        <Avatar src={userInfo.avatar} size={36} className={styles.avatar} icon={<UserOutlined />} />
        <div className={styles.info}>
          <div className={styles.name}>{userInfo.name}</div>
          <div className={styles.department}>{userInfo.department}</div>
        </div>
      </div>
    </Dropdown>
  );
}
