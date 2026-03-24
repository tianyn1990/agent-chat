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

// ===========================
// WebSocket 消息协议类型
// ===========================

/** 客户端发送：用户消息 */
export interface WsUserMessage {
  type: 'user_message';
  sessionId: string;
  requestId: string;
  content: {
    text: string;
    files?: Array<{ fileId: string; fileName: string; fileType: string }>;
  };
}

/** 客户端发送：卡片操作 */
export interface WsCardAction {
  type: 'card_action';
  sessionId: string;
  requestId: string;
  cardId: string;
  action: {
    tag: string;
    key: string;
    value: unknown;
  };
}

/** 客户端发送：创建会话 */
export interface WsCreateSession {
  type: 'create_session';
  requestId: string;
  title?: string;
}

/** 客户端发送：删除会话 */
export interface WsDeleteSession {
  type: 'delete_session';
  sessionId: string;
}

/** 客户端发送：心跳 */
export interface WsPing {
  type: 'ping';
  timestamp: number;
}

/** 服务端推送：流式消息块 */
export interface WsMessageChunk {
  type: 'message_chunk';
  sessionId: string;
  messageId: string;
  requestId: string;
  delta: string;
  done: boolean;
}

/** 服务端推送：卡片消息 */
export interface WsCardMessage {
  type: 'card';
  sessionId: string;
  messageId: string;
  card: InteractiveCard;
}

/** 服务端推送：图表消息 */
export interface WsChartMessage {
  type: 'chart';
  sessionId: string;
  messageId: string;
  chart: ChartMessage;
}

/** 服务端推送：会话创建成功 */
export interface WsSessionCreated {
  type: 'session_created';
  requestId: string;
  session: {
    id: string;
    title: string;
    createdAt: number;
  };
}

/** 服务端推送：错误 */
export interface WsError {
  type: 'error';
  sessionId?: string;
  requestId?: string;
  code: string;
  message: string;
}

/** 服务端推送：心跳回复 */
export interface WsPong {
  type: 'pong';
  timestamp: number;
}

/** 所有客户端消息联合类型 */
export type WsClientMessage =
  | WsUserMessage
  | WsCardAction
  | WsCreateSession
  | WsDeleteSession
  | WsPing;

/** 所有服务端消息联合类型 */
export type WsServerMessage =
  | WsMessageChunk
  | WsCardMessage
  | WsChartMessage
  | WsSessionCreated
  | WsError
  | WsPong;
