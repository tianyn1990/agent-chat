import { Button } from 'antd';
import { CloseOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import VisualizeWorkspaceView from './VisualizeWorkspaceView';
import styles from './VisualizeWorkbenchFrame.module.less';

interface VisualizeWorkbenchFrameProps {
  sessionId: string | null;
  visible: boolean;
}

/**
 * 沉浸式执行状态工作台外壳。
 *
 * 关键约束：
 * - 当 `visible=false` 时只隐藏，不卸载内部 iframe
 * - 这样再次进入同一会话时，可以直接复用真实 Star-Office 页面
 * - 工具控件以悬浮层形式覆盖在 iframe 之上，避免挤占主视口
 */
export default function VisualizeWorkbenchFrame({
  sessionId,
  visible,
}: VisualizeWorkbenchFrameProps) {
  const navigate = useNavigate();
  const hideWorkbench = useVisualizeStore((state) => state.hideWorkbench);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const iframeKey = useMemo(() => {
    if (!sessionId) {
      return 'workbench-empty';
    }

    return `${sessionId}-${refreshVersion}`;
  }, [refreshVersion, sessionId]);

  if (!sessionId) {
    return null;
  }

  const handleBack = () => {
    hideWorkbench();
    navigate(`${ROUTES.CHAT}/${sessionId}`);
  };

  const handleRefresh = () => {
    setRefreshVersion((value) => value + 1);
  };

  return (
    <section
      className={`${styles.shell} ${visible ? styles.visible : styles.hidden}`}
      aria-hidden={!visible}
    >
      <div className={styles.stage}>
        {/* 使用稳定的 sessionId 保持 iframe 常驻；仅当用户主动刷新时才强制重建。 */}
        <VisualizeWorkspaceView key={iframeKey} sessionId={sessionId} />
      </div>

      <header className={styles.toolbar} aria-label="执行状态工作台工具栏">
        <div className={styles.actions}>
          <Button
            icon={<RollbackOutlined />}
            onClick={handleBack}
            aria-label="返回聊天"
            shape="circle"
          ></Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            aria-label="刷新"
            shape="circle"
          ></Button>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={handleBack}
            aria-label="收起"
            shape="circle"
          ></Button>
        </div>
      </header>
    </section>
  );
}
