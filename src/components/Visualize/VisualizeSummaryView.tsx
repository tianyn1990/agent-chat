import { Button, Tag } from 'antd';
import { ArrowRightOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { VISUALIZE_STATE_LABELS } from '@/types/visualize';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import styles from './VisualizeSummaryView.module.less';

interface VisualizeSummaryViewProps {
  sessionId: string;
  closable?: boolean;
  onClose?: () => void;
}

/**
 * 轻量执行状态提示。
 *
 * 设计原则：
 * 1. 不再占用聊天页大面积侧栏空间
 * 2. 只承担状态提示与“恢复工作台”入口职责
 * 3. 在工作台被收起后，给用户一个低成本恢复入口
 */
export default function VisualizeSummaryView({
  sessionId,
  closable = false,
  onClose,
}: VisualizeSummaryViewProps) {
  const navigate = useNavigate();
  const runtime = useVisualizeStore((state) => state.runtimeBySession[sessionId]);
  const openWorkbench = useVisualizeStore((state) => state.openWorkbench);

  /**
   * 重新展开当前会话的沉浸式工作台。
   *
   * 这里继续复用已存在的工作台状态：
   * - 同会话已保活 iframe 会直接恢复
   * - 不需要重新经过摘要页或二级跳转
   */
  const handleRestoreWorkbench = () => {
    openWorkbench(sessionId);
    navigate(`${ROUTES.VISUALIZE}/${sessionId}`);
  };

  return (
    <section className={styles.shell} aria-label="执行状态轻量提示">
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>Workspace</p>
          <h2 className={styles.title}>执行状态</h2>
        </div>

        {closable ? (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            aria-label="关闭执行状态提示"
          />
        ) : null}
      </div>

      <div className={styles.meta}>
        <span className={styles.session}>会话：{sessionId}</span>
        {runtime ? (
          <Tag color={runtime.state === 'error' ? 'error' : 'processing'}>
            {VISUALIZE_STATE_LABELS[runtime.state]}
          </Tag>
        ) : (
          <span className={styles.muted}>等待本会话状态</span>
        )}
      </div>

      <p className={styles.detail}>
        {runtime?.detail || '沉浸式工作台已收起，可随时恢复查看真实像素办公室。'}
      </p>

      <div className={styles.footer}>
        <Button
          type="primary"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={handleRestoreWorkbench}
          aria-label="恢复执行状态工作台"
        >
          恢复工作台
        </Button>
      </div>
    </section>
  );
}
