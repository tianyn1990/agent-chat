import { App, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import styles from './MessageActions.module.less';

interface MessageActionsProps {
  copyText?: string;
}

/**
 * 消息操作区。
 *
 * 当前阶段说明：
 * - “执行状态”已经收敛为会话级主入口，不再从消息级重复暴露
 * - 因此消息级操作区只保留与当前消息直接相关的动作，例如复制
 * - 用户消息与助手消息都允许复制，避免长输入、Prompt 模板和复盘内容只能手动选中
 */
export default function MessageActions({ copyText }: MessageActionsProps) {
  const { message: messageApi } = App.useApp();

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

  return (
    <div className={styles.actions}>
      {copyText ? (
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          className={styles.btn}
          onClick={handleCopy}
          aria-label="复制消息"
        />
      ) : null}
    </div>
  );
}
