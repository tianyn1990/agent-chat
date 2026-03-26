import { memo, useCallback, useState } from 'react';
import { Avatar, Modal } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  WarningOutlined,
  DownloadOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { Message, TextContent, FileContent, ErrorContent } from '@/types/message';
import type { InteractiveCard } from '@/types/card';
import type { ChartMessage } from '@/types/chart';
import { formatMessageTime, formatFileSize } from '@/utils/format';
import CardRenderer from '@/components/Card/CardRenderer';
import ChartRenderer from '@/components/Chart/ChartRenderer';
import MarkdownText from './MarkdownText';
import MessageActions from './MessageActions';
import PendingReplyAccessory from './PendingReplyAccessory';
import styles from './MessageBubble.module.less';

interface MessageBubbleProps {
  /** 消息数据 */
  message: Message;
  /** 流式传输中的实时文本（来自 streamingBuffer） */
  streamingText?: string;
  /** 是否在当前用户消息下方展示等待回复挂件 */
  pendingAccessory?: boolean;
  /**
   * 卡片动作回调（按钮点击 / 选择器变更 / 表单提交）
   * 由 ChatPage 注入，通过 WS 回传服务端
   */
  onCardAction?: (
    cardId: string,
    key: string,
    value: unknown,
    tag: 'button' | 'select' | 'form',
  ) => void;
  /**
   * 卡片过期状态变更回调
   * 用户操作后将卡片置为 expired，更新 store 中的消息
   */
  onCardExpire?: (messageId: string) => void;
}

/**
 * 消息气泡组件
 * 根据消息类型（text / file / error / card / chart）渲染不同样式
 * - text: 用户纯文本 / AI Markdown + 代码高亮
 * - file: 图片缩略图 / 文件信息卡
 * - error: 错误提示
 * - card: 交互式卡片（CardRenderer）
 * - chart: 图表（ChartRenderer）
 *
 * 使用 memo 避免消息列表中无关消息重渲染
 */
const MessageBubble = memo(function MessageBubble({
  message,
  streamingText,
  pendingAccessory = false,
  onCardAction,
  onCardExpire,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  // 图表/卡片消息需要更宽的展示区域，突破普通气泡的 max-width 限制
  const isWide = message.contentType === 'chart' || message.contentType === 'card';
  const copyText = getMessageCopyText(message, streamingText);
  const showActions =
    Boolean(copyText) &&
    message.status !== 'streaming' &&
    message.contentType !== 'error' &&
    !(isUser && pendingAccessory);

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      {/* 助手头像（左侧） */}
      {!isUser && (
        <Avatar
          size={32}
          icon={<RobotOutlined />}
          className={`${styles.avatar} ${styles.avatarAssistant}`}
        />
      )}

      {/* 消息主体：图表/卡片用宽容器，文本用普通容器 */}
      <div className={`${styles.content} ${isWide ? styles.contentWide : ''}`}>
        <BubbleContent
          message={message}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onCardAction={onCardAction}
          onCardExpire={onCardExpire}
        />

        {isUser && pendingAccessory ? <PendingReplyAccessory /> : null}

        {showActions ? <MessageActions copyText={copyText} /> : null}

        {/* 时间戳 */}
        <div className={`${styles.time} ${isUser ? styles.timeRight : styles.timeLeft}`}>
          {formatMessageTime(message.timestamp)}
        </div>
      </div>

      {/* 用户头像（右侧） */}
      {isUser && (
        <Avatar
          size={32}
          icon={<UserOutlined />}
          className={`${styles.avatar} ${styles.avatarUser}`}
        />
      )}
    </div>
  );
});

export default MessageBubble;

function getMessageCopyText(message: Message, streamingText?: string): string | undefined {
  switch (message.contentType) {
    case 'text':
      return streamingText ?? (message.content as TextContent).text;
    case 'card':
      return '[交互卡片消息]';
    case 'chart':
      return '[图表消息]';
    default:
      return undefined;
  }
}

// =============================
// 内部子组件：根据 contentType 路由渲染
// =============================

interface BubbleContentProps {
  message: Message;
  streamingText?: string;
  isStreaming: boolean;
  onCardAction?: MessageBubbleProps['onCardAction'];
  onCardExpire?: MessageBubbleProps['onCardExpire'];
}

function BubbleContent({
  message,
  streamingText,
  isStreaming,
  onCardAction,
  onCardExpire,
}: BubbleContentProps) {
  const isUser = message.role === 'user';

  /** 卡片按钮/选择器操作：回传 WS，并将卡片置为过期 */
  const handleCardAction = useCallback(
    (cardId: string, key: string, value: unknown) => {
      onCardAction?.(cardId, key, value, 'button');
      onCardExpire?.(message.id);
    },
    [onCardAction, onCardExpire, message.id],
  );

  /** 卡片表单提交：回传 WS，并将卡片置为过期 */
  const handleFormSubmit = useCallback(
    (cardId: string, submitKey: string, values: Record<string, unknown>) => {
      onCardAction?.(cardId, submitKey, values, 'form');
      onCardExpire?.(message.id);
    },
    [onCardAction, onCardExpire, message.id],
  );

  switch (message.contentType) {
    case 'text':
      return (
        <TextBubble
          text={streamingText ?? (message.content as TextContent).text}
          isUser={isUser}
          isStreaming={isStreaming}
        />
      );

    case 'file':
      return <FileBubble file={message.content as FileContent} />;

    case 'error':
      return <ErrorBubble error={message.content as ErrorContent} />;

    case 'card':
      return (
        <CardRenderer
          card={message.content as InteractiveCard}
          onAction={handleCardAction}
          onFormSubmit={handleFormSubmit}
        />
      );

    case 'chart':
      return <ChartRenderer chart={message.content as ChartMessage} />;

    default:
      return null;
  }
}

// =============================
// 文本气泡（支持 Markdown + 代码高亮）
// =============================

interface TextBubbleProps {
  text: string;
  isUser: boolean;
  isStreaming: boolean;
}

/**
 * 检测文本是否包含需要解析的 Markdown 特征
 * 支持：代码块、行内代码、标题、有序/无序列表、加粗、斜体、链接
 */
function hasMarkdown(text: string): boolean {
  return (
    /```/.test(text) || // 围栏代码块
    /`[^`]+`/.test(text) || // 行内代码
    /^#{1,6} /m.test(text) || // 标题 # ~ ######
    /^(\d+\.) /m.test(text) || // 有序列表 1. 2. 3.
    /^[-*] /m.test(text) || // 无序列表 - 或 *
    /\*\*[^*]+\*\*/.test(text) || // 加粗 **text**
    /\*[^*]+\*/.test(text) || // 斜体 *text*
    /\[[^\]]+\]\([^)]+\)/.test(text) // 链接 [text](url)
  );
}

function TextBubble({ text, isUser, isStreaming }: TextBubbleProps) {
  if (isUser) {
    /**
     * 用户消息：
     * - 仅在检测到明确 Markdown 特征时启用解析
     * - 使用同步渲染，避免高负载时长时间停留在 Suspense 回退态
     * - 这样用户重新进入会话或测试全量并发执行时，不会长期看到原始围栏语法
     */
    if (hasMarkdown(text)) {
      return <MarkdownText text={text} isUser />;
    }

    // 无 Markdown 特征：纯文本，保留换行
    return (
      <div className={`${styles.bubble} ${styles.bubbleUser}`}>
        <pre className={styles.userText}>{text}</pre>
      </div>
    );
  }

  // AI 消息：Markdown 渲染 + 代码高亮
  return (
    <div>
      <MarkdownText text={text} isUser={false} />
      {isStreaming && <span className={styles.cursor} aria-hidden="true" />}
    </div>
  );
}

// =============================
// 文件气泡
// =============================

function FileBubble({ file }: { file: FileContent }) {
  const isImage = file.fileType.startsWith('image/');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className={`${styles.bubble} ${styles.bubbleUser}`}>
        {isImage && file.previewUrl ? (
          <button
            type="button"
            className={styles.imagePreviewButton}
            onClick={() => setPreviewOpen(true)}
            aria-label={`查看大图 ${file.fileName}`}
          >
            <img
              src={file.previewUrl}
              alt={file.fileName}
              loading="lazy"
              decoding="async"
              className={styles.imagePreview}
            />
          </button>
        ) : (
          <div className={styles.fileCard}>
            <div className={styles.fileCardMeta}>
              <FileOutlined className={styles.fileCardIcon} />
              <div className={styles.fileCardText}>
                <span className={styles.fileName}>{file.fileName}</span>
                <span className={styles.fileSize}>{formatFileSize(file.fileSize)}</span>
              </div>
            </div>

            {file.downloadUrl ? (
              <a
                href={file.downloadUrl}
                download={file.fileName}
                className={styles.fileDownload}
                aria-label={`下载文件 ${file.fileName}`}
              >
                <DownloadOutlined />
                <span>下载文件</span>
              </a>
            ) : null}
          </div>
        )}

        {isImage && file.downloadUrl ? (
          <div className={styles.fileToolbar}>
            <a
              href={file.downloadUrl}
              download={file.fileName}
              className={styles.fileDownload}
              aria-label={`下载图片 ${file.fileName}`}
            >
              <DownloadOutlined />
              <span>下载图片</span>
            </a>
          </div>
        ) : null}
      </div>

      {isImage && file.previewUrl ? (
        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          footer={
            file.downloadUrl ? (
              <a
                href={file.downloadUrl}
                download={file.fileName}
                className={styles.previewDownload}
              >
                <DownloadOutlined />
                <span>下载图片</span>
              </a>
            ) : null
          }
          title={file.fileName}
          centered
          width="min(92vw, 1080px)"
          destroyOnHidden
        >
          <img src={file.previewUrl} alt={file.fileName} className={styles.previewModalImage} />
        </Modal>
      ) : null}
    </>
  );
}

// =============================
// 错误气泡
// =============================

function ErrorBubble({ error }: { error: ErrorContent }) {
  return (
    <div className={styles.errorBubble}>
      <WarningOutlined className={styles.errorIcon} />
      <div className={styles.errorContent}>
        <div className={styles.errorTitle}>发送失败</div>
        <div className={styles.errorMsg}>{error.message}</div>
      </div>
    </div>
  );
}
