import { Result } from 'antd';
import { DeploymentUnitOutlined } from '@ant-design/icons';
import {
  STAR_OFFICE_MOCK_ENABLED,
  STAR_OFFICE_REAL_DEV_ENABLED,
  STAR_OFFICE_URL,
} from '@/constants';
import { resolveStarOfficeIframeUrl } from '@/utils/starOffice';
import styles from './VisualizeWorkspaceView.module.less';

interface VisualizeWorkspaceViewProps {
  sessionId: string;
}

/**
 * 真实执行状态工作区视图。
 *
 * 设计约束：
 * - 在沉浸式工作台中，真实 iframe 必须是主视图主体
 * - 非必要说明信息不再占据独立大块布局空间
 * - 空态仍需给出明确的本地联调与部署提示
 */
export default function VisualizeWorkspaceView({ sessionId }: VisualizeWorkspaceViewProps) {
  // iframe 地址统一由工具函数计算，保证真实地址与本地 mock 的选择逻辑一致。
  const iframeUrl = resolveStarOfficeIframeUrl(sessionId);
  const isUsingLocalMock = !STAR_OFFICE_URL && STAR_OFFICE_MOCK_ENABLED;
  const isUsingRealDev = !STAR_OFFICE_URL && STAR_OFFICE_REAL_DEV_ENABLED;

  return (
    <section className={styles.shell}>
      {!iframeUrl ? (
        <div className={styles.emptyWrap}>
          <Result
            className={styles.empty}
            icon={<DeploymentUnitOutlined style={{ color: '#1677ff' }} />}
            title="未配置 Star-Office-UI 地址"
            subTitle="请设置 VITE_STAR_OFFICE_URL、开启真实 Star-Office 本地联调，或启用本地 Star-Office mock。"
            extra={[
              <div key="tip" className={styles.tip}>
                推荐使用 `/star-office/session/:sessionId/`
                这类会话级同域入口；如果采用路径前缀部署，需要同步处理 Star-Office-UI 的 base path
                请求问题。本地开发时可优先启用真实 Star-Office 联调模式，必要时再回退到
                `VITE_STAR_OFFICE_MOCK_ENABLED=true`。
              </div>,
              <div key="mode" className={styles.mode}>
                {isUsingRealDev
                  ? '当前模式：本地真实 Star-Office 联调'
                  : isUsingLocalMock
                    ? '当前模式：本地执行状态 Mock'
                    : '当前模式：等待真实执行状态接入'}
              </div>,
            ]}
          />
        </div>
      ) : (
        <iframe
          className={styles.frame}
          src={iframeUrl}
          title="Star-Office-UI"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      )}
    </section>
  );
}
