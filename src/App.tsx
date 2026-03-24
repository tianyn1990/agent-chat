import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { antdTheme } from './theme/antdTheme';
import './styles/global.less';

/**
 * 应用根组件
 * - 配置 Ant Design 主题和中文语言包
 * - 提供 RouterProvider
 */
export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
