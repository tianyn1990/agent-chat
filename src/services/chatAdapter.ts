import { CHAT_RUNTIME } from '@/constants';
import { directOpenClawTransport } from '@/services/directOpenClawTransport';
import { proxyOpenClawTransport } from '@/services/proxyOpenClawTransport';
import { mockOpenClawTransport, MockOpenClawTransport } from '@/mocks/websocket';
import type { OpenClawGatewayTransport } from '@/services/openclawTransport';
import { wsService } from '@/services/websocket';
import { isEphemeralSessionTitle } from '@/stores/useChatStore';
import type {
  ChatAdapter,
  ChatAdapterCardActionInput,
  ChatAdapterEvent,
} from '@/types/chatAdapter';
import type { Message } from '@/types/message';
import type { Session } from '@/types/session';
import type { SessionVisualizeRuntime } from '@/types/visualize';
import type {
  WsCardMessage,
  WsChartMessage,
  WsError,
  WsMessageChunk,
  WsSessionCreated,
} from '@/types/ws';
import type {
  OpenClawAgentEventPayload,
  OpenClawChatEventPayload,
  OpenClawGatewayMessage,
  OpenClawGatewaySessionEntry,
  OpenClawHistoryItem,
} from '@/types/openclaw';
import { prefixedId } from '@/utils/id';

interface HistoryResult {
  messages: Message[];
  sessionPatch?: Partial<Session> | null;
}

const DIRECT_DASHBOARD_SESSION_PREFIX = 'agent:main:dashboard:';

/**
 * 判断会话是否属于当前 dashboard 命名空间。
 *
 * 设计原因：
 * - 本地直连阶段只希望展示当前前端负责的会话
 * - 真实 Gateway 里可能同时存在 CLI、控制台或历史联调留下的其他 session
 * - 将规则提炼成 helper 后，adapter 与测试可以共享同一边界判断
 */
export function isDirectDashboardSessionKey(sessionId: string): boolean {
  return sessionId.startsWith(DIRECT_DASHBOARD_SESSION_PREFIX);
}

/**
 * 构建 direct 模式下的 dashboard 会话 key。
 *
 * 设计原因：
 * - 当前前端需要一个稳定、可识别、可过滤的命名空间
 * - 显式前缀可以让真实 Gateway 与本地 UI 在多会话场景下保持清晰边界
 */
export function buildDirectDashboardSessionKey(seed?: string): string {
  const randomId =
    seed ??
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${DIRECT_DASHBOARD_SESSION_PREFIX}${randomId}`;
}

/**
 * 解析 OpenClaw 会话标题。
 *
 * 设计原因：
 * - Gateway 条目里同时可能出现 `label`（显式自定义标题）和 `title`（派生标题）
 * - 若 `label` 仍是“新对话”这类占位文案，应优先使用更有信息量的派生标题
 * - 但一旦用户明确重命名，仍要让显式 label 覆盖派生 title
 */
function resolveSessionTitle(record: OpenClawGatewaySessionEntry): string {
  const explicitLabel = record.label?.trim() ?? '';
  const derivedTitle = record.title?.trim() ?? '';

  if (explicitLabel && !isEphemeralSessionTitle(explicitLabel)) {
    return explicitLabel;
  }

  if (derivedTitle) {
    return derivedTitle;
  }

  if (explicitLabel) {
    return explicitLabel;
  }

  return 'OpenClaw 会话';
}

function toSession(record: Session | OpenClawGatewaySessionEntry): Session {
  if ('id' in record) {
    return record;
  }

  const sessionId = record.key ?? record.sessionKey ?? record.sessionId ?? prefixedId('session');
  const createdAt = record.createdAtMs ?? record.createdAt ?? Date.now();
  const updatedAt = record.updatedAtMs ?? record.updatedAt ?? createdAt;

  return {
    id: sessionId,
    title: resolveSessionTitle(record),
    createdAt,
    lastMessageAt: updatedAt,
    lastMessage: record.lastMessagePreview ?? record.lastMessage,
    messageCount: record.messageCount ?? 0,
  };
}

function extractGatewayMessageText(message: OpenClawGatewayMessage | undefined): string {
  if (!message) {
    return '';
  }

  /**
   * 清理 OpenClaw / 模型端常见的包裹标签。
   *
   * 设计原因：
   * - 某些 provider 或 agent 模板会把最终输出包在 `<final>...</final>` 中
   * - 这些标签属于协议/提示工程细节，不应该直接泄漏给终端用户
   * - 在 adapter 层统一剥离，可以同时覆盖历史消息、流式消息与复制文本
   */
  const normalizeGatewayText = (rawText: string): string =>
    rawText
      .replace(/^\s*<final>\s*/i, '')
      .replace(/\s*<\/final>\s*$/i, '')
      .trim();

  if (typeof message.text === 'string') {
    return normalizeGatewayText(message.text);
  }

  if (Array.isArray(message.content)) {
    return normalizeGatewayText(
      message.content
        .filter((item) => item?.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text as string)
        .join(''),
    );
  }

  return '';
}

function resolveGatewayMessageTimestamp(message: OpenClawGatewayMessage | undefined): number {
  return (
    message?.timestampMs ??
    message?.timestamp ??
    message?.createdAtMs ??
    message?.createdAt ??
    Date.now()
  );
}

function mapGatewayHistoryMessage(
  sessionId: string,
  message: OpenClawGatewayMessage,
  index: number,
): Message {
  return {
    id: message.id ?? prefixedId(`history_${index}`),
    sessionId,
    role: message.role === 'user' ? 'user' : 'assistant',
    contentType: 'text',
    content: {
      text: extractGatewayMessageText(message),
    },
    status: 'done',
    timestamp: resolveGatewayMessageTimestamp(message),
  };
}

function mapMockHistoryItem(sessionId: string, item: OpenClawHistoryItem): Message {
  if (item.kind === 'card') {
    return {
      id: item.id,
      sessionId,
      role: 'assistant',
      contentType: 'card',
      content: item.card,
      status: 'done',
      timestamp: item.timestamp,
    };
  }

  if (item.kind === 'chart') {
    return {
      id: item.id,
      sessionId,
      role: 'assistant',
      contentType: 'chart',
      content: item.chart,
      status: 'done',
      timestamp: item.timestamp,
    };
  }

  return {
    id: item.id,
    sessionId,
    role: item.role,
    contentType: 'text',
    content: {
      text: item.text,
    },
    status: 'done',
    timestamp: item.timestamp,
  };
}

/**
 * 为会话历史推导摘要信息。
 *
 * 设计原因：
 * - 页面刷新或 direct 历史补偿后，需要立刻恢复消息数、最后摘要与时间戳
 * - 这些信息不应该依赖额外的二次请求，而应该随历史映射一次性产出
 */
function buildHistorySessionPatch(messages: Message[]): Partial<Session> {
  const lastMessage = [...messages].reverse().find((message) => {
    if (message.contentType === 'text') {
      return ((message.content as { text?: string }).text ?? '').trim().length > 0;
    }

    return true;
  });

  let lastMessagePreview = '';
  if (lastMessage) {
    switch (lastMessage.contentType) {
      case 'text':
        lastMessagePreview = ((lastMessage.content as { text?: string }).text ?? '').trim();
        break;
      case 'card':
        lastMessagePreview = '[卡片消息]';
        break;
      case 'chart':
        lastMessagePreview = '[图表]';
        break;
      case 'file':
        lastMessagePreview =
          'fileName' in lastMessage.content ? lastMessage.content.fileName : '[附件]';
        break;
      case 'error':
        lastMessagePreview = '[错误]';
        break;
      default:
        lastMessagePreview = '';
    }
  }

  return {
    messageCount: messages.length,
    lastMessage: lastMessagePreview || undefined,
    lastMessageAt: lastMessage?.timestamp,
  };
}

/**
 * 统一的 OpenClaw 协议 adapter 基类。
 *
 * 设计原因：
 * - mock 与 direct 都要被翻译成同一套 `ChatAdapterEvent`
 * - 页面不应关心底层到底来自本地模拟器还是真实 Gateway
 */
abstract class BaseOpenClawChatAdapter implements ChatAdapter {
  protected readonly eventHandlers = new Set<(event: ChatAdapterEvent) => void>();
  protected readonly statusHandlers = new Set<(connected: boolean) => void>();
  protected unsubscribeProtocolListeners: Array<() => void> = [];

  constructor(protected readonly transport: OpenClawGatewayTransport) {}

  connect(): Promise<void> | void {
    this.bindTransportListeners();
    return this.transport.connect();
  }

  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  onEvent(handler: (event: ChatAdapterEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  abstract createSession(title?: string): Promise<Session>;
  abstract renameSession(sessionId: string, title: string): Promise<void>;
  abstract deleteSession(sessionId: string): Promise<void>;
  abstract getHistory(sessionId: string): Promise<HistoryResult>;
  abstract sendMessage(
    sessionId: string,
    input: {
      text: string;
      files?: Array<{ fileId: string; fileName: string; fileType: string }>;
      requestId: string;
    },
  ): Promise<void>;
  abstract sendCardAction(
    sessionId: string,
    cardId: string,
    action: ChatAdapterCardActionInput,
  ): Promise<void>;

  async listSessions(): Promise<Session[]> {
    const result = await this.transport.request('sessions.list', {
      includeDerivedTitles: true,
      includeLastMessage: true,
    });
    return result.sessions.map((session) => toSession(session as OpenClawGatewaySessionEntry));
  }

  protected bindTransportListeners(): void {
    if (this.unsubscribeProtocolListeners.length > 0) {
      return;
    }

    this.unsubscribeProtocolListeners.push(
      this.transport.onStatus((connected) => {
        this.statusHandlers.forEach((handler) => handler(connected));
      }),
    );
  }

  protected emit(event: ChatAdapterEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  protected emitRuntime(sessionId: string, runtime: SessionVisualizeRuntime): void {
    this.emit({
      type: 'runtime.changed',
      sessionId,
      runtime,
    });
  }
}

/**
 * mock OpenClaw chat adapter。
 *
 * 设计原因：
 * - transport 只负责协议层请求与事件
 * - 页面真正关心的是“消息增量 / 结构化结果 / 运行态变化”这些领域事件
 * - adapter 在这里完成 sessionKey 到现有 UI sessionId 的收口；第一阶段两者暂时直接等同
 */
export class MockOpenClawChatAdapter extends BaseOpenClawChatAdapter {
  constructor(transport: MockOpenClawTransport) {
    super(transport);
  }

  async createSession(title = '新对话'): Promise<Session> {
    const sessionId = prefixedId('session');
    const record = (this.transport as MockOpenClawTransport).ensureLocalSession(sessionId, title);
    return {
      id: record.sessionKey,
      title: record.title,
      createdAt: record.createdAt,
      messageCount: 0,
    };
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await this.transport.request('sessions.patch', {
      key: sessionId,
      label: title,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.transport.request('sessions.delete', {
      key: sessionId,
    });
  }

  async getHistory(sessionId: string): Promise<HistoryResult> {
    const result = await this.transport.request('chat.history', {
      sessionKey: sessionId,
    });

    const items = result.items ?? [];
    const messages = items.map((item) => mapMockHistoryItem(sessionId, item));
    return {
      messages,
      sessionPatch: buildHistorySessionPatch(messages),
    };
  }

  async sendMessage(
    sessionId: string,
    input: {
      text: string;
      files?: Array<{ fileId: string; fileName: string; fileType: string }>;
      requestId: string;
    },
  ): Promise<void> {
    await this.transport.request('chat.send', {
      sessionKey: sessionId,
      idempotencyKey: input.requestId,
      text: input.text,
      files: input.files,
    });
  }

  async sendCardAction(
    sessionId: string,
    _cardId: string,
    action: ChatAdapterCardActionInput,
  ): Promise<void> {
    // mock 阶段先将卡片交互折算为一条 chat.inject，保证协议骨架上仍然经过 adapter/transport。
    await this.transport.request('chat.inject', {
      sessionKey: sessionId,
      text: `card_action:${action.tag}:${action.key}`,
    });
  }

  /**
   * 供测试环境重置 adapter 内部监听器。
   *
   * 设计原因：
   * - transport.reset() 会清空底层事件订阅
   * - 若不同时复位 adapter，自身会误以为订阅仍然有效，导致后续用例不再接收到事件
   */
  reset(): void {
    this.unsubscribeProtocolListeners.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeProtocolListeners = [];
    this.eventHandlers.clear();
    this.statusHandlers.clear();
  }

  protected override bindTransportListeners(): void {
    super.bindTransportListeners();

    if (this.unsubscribeProtocolListeners.length > 1) {
      return;
    }

    this.unsubscribeProtocolListeners.push(
      this.transport.on('chat', (frame) => {
        const payload = frame.payload as Extract<OpenClawChatEventPayload, { kind: string }>;
        switch (payload.kind) {
          case 'message.delta':
            this.emit({
              type: 'message.delta',
              sessionId: payload.sessionKey,
              messageId: payload.messageId,
              delta: payload.delta,
            });
            break;
          case 'message.completed':
            this.emit({
              type: 'message.completed',
              sessionId: payload.sessionKey,
              messageId: payload.messageId,
            });
            break;
          case 'message.card':
            this.emit({
              type: 'message.card',
              sessionId: payload.sessionKey,
              messageId: payload.messageId,
              card: payload.card,
            });
            break;
          case 'message.chart':
            this.emit({
              type: 'message.chart',
              sessionId: payload.sessionKey,
              messageId: payload.messageId,
              chart: payload.chart,
            });
            break;
          case 'message.error':
            this.emit({
              type: 'error',
              sessionId: payload.sessionKey,
              code: payload.code,
              message: payload.message,
            });
            break;
        }
      }),
    );

    this.unsubscribeProtocolListeners.push(
      this.transport.on('agent', (frame) => {
        if (!frame.payload.sessionKey) {
          return;
        }

        this.emit({
          type: 'runtime.changed',
          sessionId: frame.payload.sessionKey,
          runtime: {
            state: frame.payload.state ?? 'idle',
            detail: frame.payload.detail ?? '',
            updatedAt: frame.payload.updatedAt ?? Date.now(),
            source: 'gateway',
            messageId: frame.payload.messageId,
          },
        });
      }),
    );
  }
}

/**
 * 浏览器直连真实 OpenClaw Gateway 的 adapter。
 *
 * 设计原因：
 * - 真实 Gateway 的 `chat.delta` 事件返回的是“整段当前文本”，而不是 UI 所需的增量片段
 * - 因此 adapter 需要在这里维护最小 run buffer，把官方事件重新拆成 UI 可消费的 delta
 */
export class DirectOpenClawChatAdapter extends BaseOpenClawChatAdapter {
  private readonly runTextByKey = new Map<string, string>();
  private readonly messageIdByRunKey = new Map<string, string>();
  private readonly subscribedSessionIds = new Set<string>();

  /**
   * 确保当前连接已经订阅目标会话的实时消息事件。
   *
   * 设计原因：
   * - OpenClaw Gateway 不会默认向所有 webchat 连接广播某个 session 的 `chat/agent` 事件
   * - 若缺少 `sessions.messages.subscribe`，页面就会出现“发送成功但一直 loading，刷新后才能看到历史”的假死体验
   * - 这里按 session 做幂等订阅，避免每次发消息都重复走一次 RPC
   */
  private async ensureSessionMessagesSubscribed(sessionId: string): Promise<string> {
    if (this.subscribedSessionIds.has(sessionId)) {
      return sessionId;
    }

    const result = await this.transport.request('sessions.messages.subscribe', {
      key: sessionId,
    });
    const canonicalSessionId = result.key?.trim() || sessionId;
    this.subscribedSessionIds.add(canonicalSessionId);
    this.subscribedSessionIds.add(sessionId);
    return canonicalSessionId;
  }

  override async listSessions(): Promise<Session[]> {
    const sessions = await super.listSessions();
    return sessions.filter((session) => isDirectDashboardSessionKey(session.id));
  }

  async createSession(title = '新对话'): Promise<Session> {
    const fallbackSessionKey = buildDirectDashboardSessionKey();

    /**
     * 优先请求 Gateway 创建权威 session。
     *
     * 设计原因：
     * - 真实联调阶段不能长期依赖“前端自己猜一个 key”
     * - 但老版本 Gateway 或某些 dev 变体可能暂未返回完整 entry
     * - 因此这里采用“先请求权威创建，拿不到 usable key 时再本地兜底”的渐进策略
     */
    try {
      const result = await this.transport.request('sessions.create', {
        key: fallbackSessionKey,
        label: title,
      });
      const sessionEntry = result.entry;
      const resolvedSessionId =
        sessionEntry?.key ??
        sessionEntry?.sessionKey ??
        sessionEntry?.sessionId ??
        result.key ??
        result.sessionId ??
        fallbackSessionKey;
      const normalizedSession = toSession(
        sessionEntry
          ? {
              ...sessionEntry,
              key: resolvedSessionId,
              label: sessionEntry.label ?? title,
            }
          : {
              key: resolvedSessionId,
              label: title,
              createdAtMs: Date.now(),
              updatedAtMs: Date.now(),
              messageCount: 0,
            },
      );
      return {
        ...normalizedSession,
        title: normalizedSession.title || title,
      };
    } catch {
      return {
        id: fallbackSessionKey,
        title,
        createdAt: Date.now(),
        messageCount: 0,
      };
    }
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await this.transport.request('sessions.patch', {
      key: sessionId,
      label: title,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.transport.request('sessions.delete', {
      key: sessionId,
    });
    this.subscribedSessionIds.delete(sessionId);
  }

  async getHistory(sessionId: string): Promise<HistoryResult> {
    await this.ensureSessionMessagesSubscribed(sessionId).catch(() => {
      /**
       * 订阅失败不应阻断历史读取。
       *
       * 设计原因：
       * - 历史记录仍然是当前页面恢复内容的第一优先级
       * - 即便订阅暂时失败，也要先把已有消息展示出来，后续再让发送链路补订阅
       */
    });

    const result = await this.transport.request('chat.history', {
      sessionKey: sessionId,
      limit: 200,
    });

    const messages = (result.messages ?? [])
      .filter((message) => ['user', 'assistant'].includes((message.role ?? '').toLowerCase()))
      .map((message, index) => mapGatewayHistoryMessage(sessionId, message, index));
    const displayableMessages = messages.filter((message) => {
      if (message.contentType !== 'text') {
        return true;
      }

      const textContent = message.content as { text?: string };
      return (textContent.text ?? '').trim().length > 0;
    });

    return {
      messages: displayableMessages,
      sessionPatch: buildHistorySessionPatch(displayableMessages),
    };
  }

  async sendMessage(
    sessionId: string,
    input: {
      text: string;
      files?: Array<{ fileId: string; fileName: string; fileType: string }>;
      requestId: string;
    },
  ): Promise<void> {
    await this.ensureSessionMessagesSubscribed(sessionId);

    /**
     * 当前 direct 阶段只验证文本协议闭环。
     *
     * 设计原因：
     * - 真实 Gateway 附件协议要求传输实际二进制 / base64 数据
     * - 现有输入框在 adapter 层只保留文件元数据，尚不具备真实上传能力
     * - 因此这里先发送文本并保留 UI 侧附件乐观展示，附件真实接入放到后续阶段
     */
    await this.transport.request('chat.send', {
      sessionKey: sessionId,
      idempotencyKey: input.requestId,
      message: input.text,
      deliver: false,
    });

    /**
     * 主动发出一条“处理中”运行态，给工作台和 pending UI 提供立即反馈。
     *
     * 设计原因：
     * - 真实 Gateway 的 agent 事件到达时间并不稳定，甚至某些环境只会先返回 chat delta
     * - 如果完全依赖后续事件，用户会看到“消息已发送但工作台没亮起”的空窗
     * - 这里将发送动作本身视为一次明确的 research 阶段起点
     */
    this.emitRuntime(sessionId, {
      state: 'researching',
      detail: 'OpenClaw 正在处理当前请求',
      updatedAt: Date.now(),
      source: 'gateway',
    });
  }

  async sendCardAction(
    sessionId: string,
    _cardId: string,
    action: ChatAdapterCardActionInput,
  ): Promise<void> {
    await this.ensureSessionMessagesSubscribed(sessionId);

    await this.transport.request('chat.send', {
      sessionKey: sessionId,
      idempotencyKey: prefixedId('req'),
      message: `card_action:${action.tag}:${action.key}`,
      deliver: false,
    });

    this.emitRuntime(sessionId, {
      state: 'executing',
      detail: 'OpenClaw 正在执行当前操作',
      updatedAt: Date.now(),
      source: 'gateway',
    });
  }

  protected override bindTransportListeners(): void {
    super.bindTransportListeners();

    if (this.unsubscribeProtocolListeners.length > 1) {
      return;
    }

    this.unsubscribeProtocolListeners.push(
      this.transport.on('chat', (frame) => {
        this.handleDirectChatEvent(
          frame.payload as Extract<OpenClawChatEventPayload, { state: string }>,
        );
      }),
    );

    this.unsubscribeProtocolListeners.push(
      this.transport.on('agent', (frame) => {
        const runtime = this.resolveRuntimeFromAgentEvent(frame.payload);
        if (!runtime || !frame.payload.sessionKey) {
          return;
        }

        this.emitRuntime(frame.payload.sessionKey, runtime);
      }),
    );
  }

  private handleDirectChatEvent(
    payload: Extract<OpenClawChatEventPayload, { state: string }>,
  ): void {
    const runKey = this.buildRunKey(payload.sessionKey, payload.runId);
    const messageId = this.messageIdByRunKey.get(runKey) ?? payload.runId ?? prefixedId('msg');
    const currentText = extractGatewayMessageText(payload.message);
    const previousText = this.runTextByKey.get(runKey) ?? '';

    this.messageIdByRunKey.set(runKey, messageId);

    if (payload.state === 'delta') {
      const delta = currentText.startsWith(previousText)
        ? currentText.slice(previousText.length)
        : currentText;

      if (delta) {
        this.emit({
          type: 'message.delta',
          sessionId: payload.sessionKey,
          messageId,
          delta,
        });
      }

      this.runTextByKey.set(runKey, currentText);
      this.emitRuntime(payload.sessionKey, {
        state: 'writing',
        detail: 'OpenClaw 正在生成回复',
        updatedAt: Date.now(),
        source: 'gateway',
        messageId,
      });
      return;
    }

    if (payload.state === 'final' || payload.state === 'aborted') {
      const delta = currentText.startsWith(previousText)
        ? currentText.slice(previousText.length)
        : currentText;

      if (delta) {
        this.emit({
          type: 'message.delta',
          sessionId: payload.sessionKey,
          messageId,
          delta,
        });
      }

      this.emit({
        type: 'message.completed',
        sessionId: payload.sessionKey,
        messageId,
      });

      this.emitRuntime(payload.sessionKey, {
        state: 'idle',
        detail: payload.state === 'aborted' ? '本轮回复已中断' : '本轮回复已完成',
        updatedAt: Date.now(),
        source: 'gateway',
        messageId,
      });

      this.runTextByKey.delete(runKey);
      this.messageIdByRunKey.delete(runKey);
      return;
    }

    if (payload.state === 'error') {
      this.emit({
        type: 'error',
        sessionId: payload.sessionKey,
        code: 'OPENCLAW_CHAT_ERROR',
        message: payload.errorMessage ?? 'OpenClaw 对话执行失败',
      });
      this.emitRuntime(payload.sessionKey, {
        state: 'error',
        detail: payload.errorMessage ?? 'OpenClaw 对话执行失败',
        updatedAt: Date.now(),
        source: 'gateway',
        messageId,
      });
      this.runTextByKey.delete(runKey);
      this.messageIdByRunKey.delete(runKey);
    }
  }

  private resolveRuntimeFromAgentEvent(
    payload: OpenClawAgentEventPayload,
  ): SessionVisualizeRuntime | null {
    if (!payload.sessionKey || !payload.state) {
      return null;
    }

    return {
      state: payload.state,
      detail: payload.detail ?? 'OpenClaw 正在处理当前会话',
      updatedAt: payload.updatedAtMs ?? payload.updatedAt ?? Date.now(),
      source: 'gateway',
      messageId: payload.messageId,
    };
  }

  private buildRunKey(sessionId: string, runId?: string): string {
    return `${sessionId}:${runId ?? 'default'}`;
  }
}

/**
 * company-gateway 模式下的 OpenClaw adapter。
 *
 * 设计原因：
 * - 本地 proxy / 公司 BFF 对前端暴露的仍是 Gateway-like 契约
 * - 因此可以直接复用 direct 阶段已经验证过的会话、历史、流式与 runtime 收口逻辑
 * - 单独导出一个类，便于未来在 proxy 模式下追加特有行为，而不污染 direct 诊断路径
 */
export class ProxyOpenClawChatAdapter extends DirectOpenClawChatAdapter {}

/**
 * legacy websocket adapter。
 *
 * 说明：
 * - OpenClaw 改造后，legacy 仅承担兼容兜底职责
 * - 页面层统一经由 adapter 接入，避免不同协议分支继续扩散到 UI
 */
class LegacyWebSocketChatAdapter implements ChatAdapter {
  private readonly eventHandlers = new Set<(event: ChatAdapterEvent) => void>();
  private readonly statusHandlers = new Set<(connected: boolean) => void>();
  private subscriptionsBound = false;

  connect(): void {
    this.bindListeners();
    wsService.connect();
  }

  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  onEvent(handler: (event: ChatAdapterEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  async createSession(title = '新对话'): Promise<Session> {
    const requestId = prefixedId('req');

    return new Promise<Session>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        reject(new Error('创建会话超时'));
      }, 3000);

      const unsubscribe = wsService.on('session_created', (message) => {
        const sessionMessage = message as WsSessionCreated;
        if (sessionMessage.requestId !== requestId) {
          return;
        }

        window.clearTimeout(timeout);
        unsubscribe();
        resolve({
          id: sessionMessage.session.id,
          title: sessionMessage.session.title,
          createdAt: sessionMessage.session.createdAt,
          messageCount: 0,
        });
      });

      const sent = wsService.send({
        type: 'create_session',
        requestId,
        title,
      });

      if (!sent) {
        window.clearTimeout(timeout);
        unsubscribe();
        reject(new Error('当前连接不可用，无法创建会话'));
      }
    });
  }

  async renameSession(_sessionId: string, _title: string): Promise<void> {
    /**
     * legacy 协议当前没有稳定的远端重命名接口。
     *
     * 设计原因：
     * - 现阶段 legacy 仅承担兜底职责，避免为即将退场的协议继续扩展复杂度
     * - 页面仍会先更新本地 store，保证当前交互不中断
     */
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sent = wsService.send({
      type: 'delete_session',
      sessionId,
    });

    if (!sent) {
      throw new Error('当前连接不可用，无法删除会话');
    }
  }

  async listSessions(): Promise<Session[]> {
    return [];
  }

  async getHistory(): Promise<HistoryResult> {
    return {
      messages: [],
      sessionPatch: null,
    };
  }

  async sendMessage(
    sessionId: string,
    input: {
      text: string;
      files?: Array<{ fileId: string; fileName: string; fileType: string }>;
      requestId: string;
    },
  ): Promise<void> {
    const sent = wsService.send({
      type: 'user_message',
      sessionId,
      requestId: input.requestId,
      content: {
        text: input.text,
        files: input.files,
      },
    });

    if (!sent) {
      throw new Error('当前连接不可用，无法发送消息');
    }

    this.emitRuntime(sessionId, {
      state: 'researching',
      detail: '等待 OpenClaw 响应',
      updatedAt: Date.now(),
      source: 'frontend',
    });
  }

  async sendCardAction(
    sessionId: string,
    cardId: string,
    action: ChatAdapterCardActionInput,
  ): Promise<void> {
    const sent = wsService.send({
      type: 'card_action',
      sessionId,
      requestId: prefixedId('req'),
      cardId,
      action,
    });

    if (!sent) {
      throw new Error('当前连接不可用，无法提交卡片操作');
    }
  }

  private bindListeners(): void {
    if (this.subscriptionsBound) {
      return;
    }

    this.subscriptionsBound = true;

    wsService.onStatus((connected) => {
      this.statusHandlers.forEach((handler) => handler(connected));
    });

    wsService.on('message_chunk', (message) => {
      const chunk = message as WsMessageChunk;
      if (chunk.done) {
        this.emit({
          type: 'message.completed',
          sessionId: chunk.sessionId,
          messageId: chunk.messageId,
        });
        this.emitRuntime(chunk.sessionId, {
          state: 'idle',
          detail: '本轮回复已完成',
          updatedAt: Date.now(),
          source: 'frontend',
          messageId: chunk.messageId,
        });
        return;
      }

      this.emit({
        type: 'message.delta',
        sessionId: chunk.sessionId,
        messageId: chunk.messageId,
        delta: chunk.delta,
      });
      this.emitRuntime(chunk.sessionId, {
        state: 'writing',
        detail: '正在生成回复内容',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: chunk.messageId,
      });
    });

    wsService.on('card', (message) => {
      const cardMessage = message as WsCardMessage;
      this.emit({
        type: 'message.card',
        sessionId: cardMessage.sessionId,
        messageId: cardMessage.messageId,
        card: cardMessage.card,
      });
      this.emitRuntime(cardMessage.sessionId, {
        state: 'idle',
        detail: '已返回交互卡片',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: cardMessage.messageId,
      });
    });

    wsService.on('chart', (message) => {
      const chartMessage = message as WsChartMessage;
      this.emit({
        type: 'message.chart',
        sessionId: chartMessage.sessionId,
        messageId: chartMessage.messageId,
        chart: chartMessage.chart,
      });
      this.emitRuntime(chartMessage.sessionId, {
        state: 'idle',
        detail: '已返回图表结果',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: chartMessage.messageId,
      });
    });

    wsService.on('error', (message) => {
      const errorMessage = message as WsError;
      this.emit({
        type: 'error',
        sessionId: errorMessage.sessionId,
        code: errorMessage.code,
        message: errorMessage.message,
      });
      if (errorMessage.sessionId) {
        this.emitRuntime(errorMessage.sessionId, {
          state: 'error',
          detail: errorMessage.message,
          updatedAt: Date.now(),
          source: 'frontend',
        });
      }
    });
  }

  private emitRuntime(sessionId: string, runtime: SessionVisualizeRuntime): void {
    this.emit({
      type: 'runtime.changed',
      sessionId,
      runtime,
    });
  }

  private emit(event: ChatAdapterEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }
}

export const mockOpenClawChatAdapter = new MockOpenClawChatAdapter(mockOpenClawTransport);
export const directOpenClawChatAdapter = new DirectOpenClawChatAdapter(directOpenClawTransport);
export const proxyOpenClawChatAdapter = new ProxyOpenClawChatAdapter(proxyOpenClawTransport);
export const legacyWebSocketChatAdapter = new LegacyWebSocketChatAdapter();

/** 统一获取当前运行时应使用的 chat adapter。 */
export function getActiveChatAdapter(): ChatAdapter {
  switch (CHAT_RUNTIME) {
    case 'openclaw-direct':
      return directOpenClawChatAdapter;
    case 'openclaw-proxy':
      return proxyOpenClawChatAdapter;
    case 'legacy-websocket':
      return legacyWebSocketChatAdapter;
    case 'mock-openclaw':
    default:
      return mockOpenClawChatAdapter;
  }
}

/** 测试辅助：重置 mock adapter 与 transport 的共享运行态。 */
export function resetMockChatAdapterRuntime(): void {
  mockOpenClawChatAdapter.reset();
  mockOpenClawTransport.reset();
}
