import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebarStore } from '@/stores/useSidebarStore';
import styles from './MainLayout.module.less';

/**
 * 主应用布局
 * 左侧固定侧边栏 + 右侧内容区
 * 侧边栏 extra 插槽内容由各页面通过 useSidebarStore 动态注入
 * （例如 ChatPage 挂载时注入会话列表，卸载时清除）
 */
export default function MainLayout() {
  const extraContent = useSidebarStore((s) => s.extraContent);

  return (
    <div className={styles.layout}>
      <Sidebar extra={extraContent} />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
