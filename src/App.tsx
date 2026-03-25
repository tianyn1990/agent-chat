import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useMemo } from 'react';
import { router } from './router';
import { createAntdTheme } from './theme/antdTheme';
import { useThemeStore } from './stores/useThemeStore';
import './styles/global.less';

/**
 * 应用根组件
 * - 配置 Ant Design 主题和中文语言包
 * - 提供 RouterProvider
 */
export default function App() {
  const mode = useThemeStore((state) => state.mode);

  /**
   * Ant Design 主题对象在运行时按模式切换。
   * 使用 useMemo 可以避免路由更新时重复创建大对象，减少 portal 组件无意义刷新。
   */
  const antdTheme = useMemo(() => createAntdTheme(mode), [mode]);

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
