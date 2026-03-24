import { App, Button } from 'antd';
import { CopyOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Message } from '@/types/message';
import { ROUTES } from '@/constants';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import styles from './MessageActions.module.less';

interface MessageActionsProps {
  message: Message;
  copyText?: string;
}

export default function MessageActions({ message, copyText }: MessageActionsProps) {
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  const openWorkbench = useVisualizeStore((state) => state.openWorkbench);

  const handleCopy = async () => {
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      messageApi.success('已复制消息内容');
    } catch {
      messageApi.error('复制失败，请检查浏览器权限');
    }
  };

  /**
   * 直接进入沉浸式执行状态工作台。
   *
   * 说明：
   * - 当前交互已从“先开摘要侧栏，再二次进入工作台”收敛为单击直达
   * - 进入前先把当前会话写入全局可视化 store，保证路由切换与工作台保活状态同步
   */
  const handleOpenWorkbench = () => {
    openWorkbench(message.sessionId, message.id);
    navigate(`${ROUTES.VISUALIZE}/${message.sessionId}`);
  };

  return (
    <div className={styles.actions}>
      <Button
        type="text"
        size="small"
        icon={<DeploymentUnitOutlined />}
        className={styles.btn}
        onClick={handleOpenWorkbench}
        aria-label="查看执行状态"
      >
        查看执行状态
      </Button>

      {copyText ? (
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          className={styles.btn}
          onClick={handleCopy}
          aria-label="复制"
        >
          复制
        </Button>
      ) : null}
    </div>
  );
}
