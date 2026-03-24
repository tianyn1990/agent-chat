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

  /**
   * 使用兼容性更强的复制流程。
   *
   * 设计原因：
   * - `navigator.clipboard` 在部分浏览器、非安全上下文或权限受限环境下会失败
   * - 聊天结果中的“复制”属于高频操作，需要提供兜底方案，避免本地开发和企业内网环境频繁报错
   */
  const copyWithFallback = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // 权限受限时继续走旧式兜底复制，不在这里直接报错。
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopy = async () => {
    if (!copyText) return;

    try {
      const copied = await copyWithFallback(copyText);
      if (copied) {
        messageApi.success('已复制消息内容');
      } else {
        messageApi.error('复制失败，请稍后重试');
      }
    } catch {
      messageApi.error('复制失败，请稍后重试');
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
