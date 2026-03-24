import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import './styles/global.less';

/**
 * 应用根组件
 * - 配置 Ant Design 主题和中文语言包
 * - 提供 RouterProvider
 */
export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 统一 Ant Design 基础 token，保证框架控件与自定义界面属于同一视觉系统。
          colorPrimary: '#355c7d',
          colorInfo: '#355c7d',
          colorSuccess: '#5f7f64',
          colorWarning: '#b47c2d',
          colorError: '#b0584f',
          colorTextBase: '#1f2730',
          colorBgBase: '#fbf6ee',
          borderRadius: 14,
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif",
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
