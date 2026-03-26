import type { InteractiveCard } from './card';
import type { ChartMessage } from './chart';

/**
 * OpenClaw-compatible 协议骨架。
 *
 * 说明：
 * - 第一阶段只实现本地 mock 需要的最小子集
 * - 这里对齐的是协议层级与职责边界，而不是宣称已完整覆盖官方全部 schema
 * - 后续本地直连 / 公司网关阶段会在这个基础上继续扩展
 */

export type OpenClawGatewayMethod =
  | 'sessions.list'
  | 'chat.history'
  | 'chat.send'
  | 'chat.abort'
  | 'chat.inject';

export type OpenClawGatewayEventType = 'chat' | 'agent' | 'health';

/** 握手挑战帧 */
export interface OpenClawConnectChallengeFrame {
  type: 'connect.challenge';
  nonce: string;
}

/** 客户端握手帧 */
export interface OpenClawConnectFrame {
  type: 'connect';
  client: 'agent-chat';
  nonce: string;
}

/** 握手成功帧 */
export interface OpenClawHelloOkFrame {
  type: 'hello-ok';
  sessionId: string;
  serverTime: number;
}

/** 通用请求帧 */
export interface OpenClawRequestFrame<
  TMethod extends OpenClawGatewayMethod = OpenClawGatewayMethod,
  TParams = unknown,
> {
  type: 'req';
  id: string;
  method: TMethod;
  params: TParams;
}

/** 通用成功响应帧 */
export interface OpenClawSuccessResponseFrame<TResult = unknown> {
  type: 'res';
  id: string;
  ok: true;
  result: TResult;
}

/** 通用失败响应帧 */
export interface OpenClawErrorResponseFrame {
  type: 'res';
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type OpenClawResponseFrame<TResult = unknown> =
  | OpenClawSuccessResponseFrame<TResult>
  | OpenClawErrorResponseFrame;

/** 通用事件帧 */
export interface OpenClawEventFrame<
  TEvent extends OpenClawGatewayEventType = OpenClawGatewayEventType,
  TPayload = unknown,
> {
  type: 'event';
  event: TEvent;
  payload: TPayload;
}

/** mock 阶段会话记录 */
export interface OpenClawSessionRecord {
  sessionKey: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** 历史消息记录。 */
export type OpenClawHistoryItem =
  | {
      id: string;
      role: 'user' | 'assistant';
      kind: 'text';
      text: string;
      timestamp: number;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'card';
      card: InteractiveCard;
      timestamp: number;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'chart';
      chart: ChartMessage;
      timestamp: number;
    };

export interface OpenClawSessionsListParams {
  limit?: number;
}

export interface OpenClawSessionsListResult {
  sessions: OpenClawSessionRecord[];
}

export interface OpenClawChatHistoryParams {
  sessionKey: string;
}

export interface OpenClawChatHistoryResult {
  sessionKey: string;
  items: OpenClawHistoryItem[];
}

export interface OpenClawChatSendFile {
  fileId: string;
  fileName: string;
  fileType: string;
}

export interface OpenClawChatSendParams {
  sessionKey: string;
  idempotencyKey: string;
  text: string;
  files?: OpenClawChatSendFile[];
}

export interface OpenClawChatSendResult {
  accepted: true;
  runId: string;
}

export interface OpenClawChatAbortParams {
  sessionKey: string;
  runId?: string;
}

export interface OpenClawChatAbortResult {
  aborted: boolean;
}

export interface OpenClawChatInjectParams {
  sessionKey: string;
  text: string;
}

export interface OpenClawChatInjectResult {
  injected: boolean;
}

export interface OpenClawMethodParamsMap {
  'sessions.list': OpenClawSessionsListParams;
  'chat.history': OpenClawChatHistoryParams;
  'chat.send': OpenClawChatSendParams;
  'chat.abort': OpenClawChatAbortParams;
  'chat.inject': OpenClawChatInjectParams;
}

export interface OpenClawMethodResultMap {
  'sessions.list': OpenClawSessionsListResult;
  'chat.history': OpenClawChatHistoryResult;
  'chat.send': OpenClawChatSendResult;
  'chat.abort': OpenClawChatAbortResult;
  'chat.inject': OpenClawChatInjectResult;
}

export type OpenClawChatEventPayload =
  | {
      kind: 'message.delta';
      sessionKey: string;
      requestId: string;
      messageId: string;
      delta: string;
    }
  | {
      kind: 'message.completed';
      sessionKey: string;
      requestId: string;
      messageId: string;
    }
  | {
      kind: 'message.card';
      sessionKey: string;
      requestId: string;
      messageId: string;
      card: InteractiveCard;
    }
  | {
      kind: 'message.chart';
      sessionKey: string;
      requestId: string;
      messageId: string;
      chart: ChartMessage;
    }
  | {
      kind: 'message.error';
      sessionKey?: string;
      requestId?: string;
      code: string;
      message: string;
    };

export interface OpenClawAgentEventPayload {
  sessionKey: string;
  state: 'idle' | 'researching' | 'writing' | 'executing' | 'syncing' | 'error';
  detail: string;
  updatedAt: number;
  messageId?: string;
}

export interface OpenClawHealthEventPayload {
  status: 'ok';
  source: 'mock';
  updatedAt: number;
}

export interface OpenClawEventPayloadMap {
  chat: OpenClawChatEventPayload;
  agent: OpenClawAgentEventPayload;
  health: OpenClawHealthEventPayload;
}

export type OpenClawGatewayEvent =
  | OpenClawEventFrame<'chat', OpenClawChatEventPayload>
  | OpenClawEventFrame<'agent', OpenClawAgentEventPayload>
  | OpenClawEventFrame<'health', OpenClawHealthEventPayload>;
