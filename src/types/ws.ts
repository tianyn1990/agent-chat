import type { InteractiveCard } from './card';
import type { ChartMessage } from './chart';

/**
 * 旧版业务型 WebSocket 协议类型。
 *
 * 说明：
 * - 当前仓库正在向 OpenClaw-compatible 协议抽象迁移
 * - 这组类型仅保留给 legacy websocket service 使用，避免第一阶段改造同时破坏非 mock 分支
 * - 新的 chat 接入应优先使用 `src/types/openclaw.ts` 与 chat adapter，而不是继续扩展本文件
 */

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
