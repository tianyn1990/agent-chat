import type { InteractiveCard } from './card';
import type { ChartMessage } from './chart';

/** 消息发送方 */
export type MessageRole = 'user' | 'assistant';

/** 消息内容类型 */
export type MessageContentType = 'text' | 'card' | 'chart' | 'file' | 'error';

/** 消息状态 */
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

/** 文本内容 */
export interface TextContent {
  text: string;
}

/** 文件内容 */
export interface FileContent {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl?: string;
  /** 本地或远端可下载地址，用于发送后继续下载附件 */
  downloadUrl?: string;
}

/** 错误内容 */
export interface ErrorContent {
  code: string;
  message: string;
}

/** 消息体 */
export interface Message {
  /** 消息唯一 ID */
  id: string;
  /** 所属会话 ID */
  sessionId: string;
  /** 发送方 */
  role: MessageRole;
  /** 内容类型 */
  contentType: MessageContentType;
  /** 消息内容（根据 contentType 对应不同结构） */
  content: TextContent | InteractiveCard | ChartMessage | FileContent | ErrorContent;
  /** 消息状态 */
  status: MessageStatus;
  /** 时间戳（毫秒） */
  timestamp: number;
}
