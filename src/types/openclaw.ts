import type { InteractiveCard } from './card';
import type { ChartMessage } from './chart';

/**
 * OpenClaw 协议类型定义。
 *
 * 说明：
 * - 当前文件同时覆盖两类来源：
 *   1. 第一阶段本地 mock 所需的最小协议骨架
 *   2. 第二阶段本地直连真实 Gateway 的最小官方子集
 * - 因此这里会看到部分字段是“官方字段 + mock 兼容字段”并存
 * - adapter 负责继续把这些 wire shape 翻译为统一 UI 领域模型
 */

export type OpenClawGatewayMethod =
  | 'connect'
  | 'sessions.list'
  | 'sessions.create'
  | 'sessions.patch'
  | 'sessions.delete'
  | 'sessions.messages.subscribe'
  | 'sessions.messages.unsubscribe'
  | 'chat.history'
  | 'chat.send'
  | 'chat.abort'
  | 'chat.inject';

export type OpenClawGatewayEventType = 'chat' | 'agent' | 'health';

export interface OpenClawLegacyConnectChallengeFrame {
  type: 'connect.challenge';
  nonce: string;
}

export interface OpenClawEventConnectChallengeFrame {
  type: 'event';
  event: 'connect.challenge';
  payload: {
    nonce: string;
    ts?: number;
    [key: string]: unknown;
  };
}

export type OpenClawConnectChallengeFrame =
  | OpenClawLegacyConnectChallengeFrame
  | OpenClawEventConnectChallengeFrame;

export interface OpenClawConnectClientInfo {
  id: string;
  displayName?: string;
  version: string;
  platform: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  mode: string;
  instanceId?: string;
}

export interface OpenClawConnectDeviceInfo {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
}

export interface OpenClawConnectAuth {
  token?: string;
  bootstrapToken?: string;
  deviceToken?: string;
  password?: string;
}

export interface OpenClawConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: OpenClawConnectClientInfo;
  caps?: string[];
  commands?: string[];
  permissions?: Record<string, boolean>;
  pathEnv?: string;
  role?: string;
  scopes?: string[];
  device?: OpenClawConnectDeviceInfo;
  auth?: OpenClawConnectAuth;
  locale?: string;
  userAgent?: string;
}

export interface OpenClawConnectFrame {
  type: 'connect';
  client?: 'agent-chat';
  nonce?: string;
  params?: OpenClawConnectParams;
}

export interface OpenClawHelloOkFrame {
  type: 'hello-ok';
  protocol?: number;
  sessionId?: string;
  serverTime?: number;
  server?: {
    version: string;
    connId: string;
  };
  features?: {
    methods: string[];
    events: string[];
  };
  snapshot?: unknown;
  auth?: {
    deviceToken: string;
    role: string;
    scopes: string[];
    issuedAtMs?: number;
  };
  policy?: {
    maxPayload: number;
    maxBufferedBytes: number;
    tickIntervalMs: number;
  };
}

export interface OpenClawRequestFrame<
  TMethod extends OpenClawGatewayMethod = OpenClawGatewayMethod,
  TParams = unknown,
> {
  type: 'req';
  id: string;
  method: TMethod;
  params?: TParams;
}

export interface OpenClawGatewayErrorShape {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
}

export interface OpenClawSuccessResponseFrame<TResult = unknown> {
  type: 'res';
  id: string;
  ok: true;
  payload?: TResult;
  /** mock 兼容字段。 */
  result?: TResult;
}

export interface OpenClawErrorResponseFrame {
  type: 'res';
  id: string;
  ok: false;
  error: OpenClawGatewayErrorShape;
}

export type OpenClawResponseFrame<TResult = unknown> =
  | OpenClawSuccessResponseFrame<TResult>
  | OpenClawErrorResponseFrame;

export interface OpenClawEventFrame<
  TEvent extends OpenClawGatewayEventType = OpenClawGatewayEventType,
  TPayload = unknown,
> {
  type: 'event';
  event: TEvent;
  payload: TPayload;
  seq?: number;
  stateVersion?: unknown;
}

/** mock 阶段会话记录。 */
export interface OpenClawSessionRecord {
  sessionKey: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** 真实 Gateway 的会话条目。 */
export interface OpenClawGatewaySessionEntry {
  key?: string;
  sessionKey?: string;
  sessionId?: string;
  label?: string;
  title?: string;
  createdAt?: number;
  createdAtMs?: number;
  updatedAt?: number;
  updatedAtMs?: number;
  messageCount?: number;
  lastMessage?: string;
  lastMessagePreview?: string;
}

/** mock 历史消息记录。 */
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

export interface OpenClawGatewayMessageContentItem {
  type?: string;
  text?: string;
  mimeType?: string;
  content?: string;
  source?: unknown;
  [key: string]: unknown;
}

/** 真实 Gateway 的聊天消息。 */
export interface OpenClawGatewayMessage {
  id?: string;
  role?: string;
  text?: string;
  content?: OpenClawGatewayMessageContentItem[];
  timestamp?: number;
  timestampMs?: number;
  createdAt?: number;
  createdAtMs?: number;
}

export interface OpenClawSessionsListParams {
  limit?: number;
  includeGlobal?: boolean;
  includeUnknown?: boolean;
  activeMinutes?: number;
  includeDerivedTitles?: boolean;
  includeLastMessage?: boolean;
  label?: string;
  spawnedBy?: string;
  agentId?: string;
  search?: string;
}

export interface OpenClawSessionsCreateParams {
  key?: string;
  label?: string;
}

export interface OpenClawSessionsCreateResult {
  ok?: boolean;
  key?: string;
  sessionId?: string;
  entry?: OpenClawGatewaySessionEntry;
  runStarted?: boolean;
}

export interface OpenClawSessionsPatchParams {
  key: string;
  label?: string | null;
}

export interface OpenClawSessionsPatchResult {
  ok?: boolean;
  key?: string;
  entry?: OpenClawGatewaySessionEntry;
}

export interface OpenClawSessionsDeleteParams {
  key: string;
  deleteTranscript?: boolean;
  emitLifecycleHooks?: boolean;
}

export interface OpenClawSessionsDeleteResult {
  ok?: boolean;
  deleted?: boolean;
  key?: string;
}

export interface OpenClawSessionsMessagesSubscribeParams {
  key: string;
}

export interface OpenClawSessionsMessagesSubscribeResult {
  subscribed: boolean;
  key: string;
}

export interface OpenClawSessionsListResult {
  sessions: Array<OpenClawSessionRecord | OpenClawGatewaySessionEntry>;
}

export interface OpenClawChatHistoryParams {
  sessionKey: string;
  limit?: number;
}

export interface OpenClawChatHistoryResult {
  sessionKey: string;
  sessionId?: string;
  /** mock 字段。 */
  items?: OpenClawHistoryItem[];
  /** 官方字段。 */
  messages?: OpenClawGatewayMessage[];
  thinkingLevel?: string | null;
  fastMode?: boolean;
  verboseLevel?: string | null;
}

export interface OpenClawChatSendFile {
  fileId?: string;
  fileName?: string;
  fileType?: string;
  type?: string;
  mimeType?: string;
  content?: string;
}

export interface OpenClawChatSendParams {
  sessionKey: string;
  idempotencyKey: string;
  /** mock 字段。 */
  text?: string;
  files?: OpenClawChatSendFile[];
  /** 官方字段。 */
  message?: string;
  thinking?: string;
  deliver?: boolean;
  attachments?: OpenClawChatSendFile[];
  timeoutMs?: number;
}

export interface OpenClawChatSendResult {
  /** mock 字段。 */
  accepted?: true;
  /** 官方字段。 */
  status?: 'started' | string;
  runId: string;
}

export interface OpenClawChatAbortParams {
  sessionKey: string;
  runId?: string;
}

export interface OpenClawChatAbortResult {
  aborted: boolean;
  ok?: boolean;
  runIds?: string[];
}

export interface OpenClawChatInjectParams {
  sessionKey: string;
  text: string;
}

export interface OpenClawChatInjectResult {
  injected: boolean;
}

export interface OpenClawMethodParamsMap {
  connect: OpenClawConnectParams;
  'sessions.list': OpenClawSessionsListParams;
  'sessions.create': OpenClawSessionsCreateParams;
  'sessions.patch': OpenClawSessionsPatchParams;
  'sessions.delete': OpenClawSessionsDeleteParams;
  'sessions.messages.subscribe': OpenClawSessionsMessagesSubscribeParams;
  'sessions.messages.unsubscribe': OpenClawSessionsMessagesSubscribeParams;
  'chat.history': OpenClawChatHistoryParams;
  'chat.send': OpenClawChatSendParams;
  'chat.abort': OpenClawChatAbortParams;
  'chat.inject': OpenClawChatInjectParams;
}

export interface OpenClawMethodResultMap {
  connect: OpenClawHelloOkFrame;
  'sessions.list': OpenClawSessionsListResult;
  'sessions.create': OpenClawSessionsCreateResult;
  'sessions.patch': OpenClawSessionsPatchResult;
  'sessions.delete': OpenClawSessionsDeleteResult;
  'sessions.messages.subscribe': OpenClawSessionsMessagesSubscribeResult;
  'sessions.messages.unsubscribe': OpenClawSessionsMessagesSubscribeResult;
  'chat.history': OpenClawChatHistoryResult;
  'chat.send': OpenClawChatSendResult;
  'chat.abort': OpenClawChatAbortResult;
  'chat.inject': OpenClawChatInjectResult;
}

/**
 * chat 事件载荷兼容两类形状：
 * - mock：`kind: message.delta / message.card / message.chart ...`
 * - direct：`state: delta / final / aborted / error`
 */
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
    }
  | {
      sessionKey: string;
      runId?: string;
      state: 'delta' | 'final' | 'aborted' | 'error';
      message?: OpenClawGatewayMessage;
      errorMessage?: string;
    };

export interface OpenClawAgentEventPayload {
  sessionKey?: string;
  state?: 'idle' | 'researching' | 'writing' | 'executing' | 'syncing' | 'error';
  detail?: string;
  updatedAt?: number;
  updatedAtMs?: number;
  messageId?: string;
  runId?: string;
  [key: string]: unknown;
}

export interface OpenClawHealthEventPayload {
  status?: 'ok' | string;
  source?: 'mock' | 'gateway' | string;
  updatedAt?: number;
  updatedAtMs?: number;
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
