import { IS_MOCK_ENABLED } from '@/constants';
import { mockOpenClawTransport, MockOpenClawTransport } from '@/mocks/websocket';
import { wsService } from '@/services/websocket';
import type {
  ChatAdapter,
  ChatAdapterCardActionInput,
  ChatAdapterEvent,
} from '@/types/chatAdapter';
import type { Session } from '@/types/session';
import type { SessionVisualizeRuntime } from '@/types/visualize';
import type {
  WsCardMessage,
  WsChartMessage,
  WsError,
  WsMessageChunk,
  WsSessionCreated,
} from '@/types/ws';
import { prefixedId } from '@/utils/id';

/**
 * mock OpenClaw chat adapter。
 *
 * 设计原因：
 * - transport 只负责协议层请求与事件
 * - 页面真正关心的是“消息增量 / 结构化结果 / 运行态变化”这些领域事件
 * - adapter 在这里完成 sessionKey 到现有 UI sessionId 的收口；第一阶段两者暂时直接等同
 */
class MockOpenClawChatAdapter implements ChatAdapter {
  private readonly eventHandlers = new Set<(event: ChatAdapterEvent) => void>();
  private readonly statusHandlers = new Set<(connected: boolean) => void>();
  private unsubscribeProtocolListeners: Array<() => void> = [];

  constructor(private readonly transport: MockOpenClawTransport) {}

  connect(): Promise<void> {
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

  async createSession(title = '新对话'): Promise<Session> {
    const sessionId = prefixedId('session');
    const record = this.transport.ensureLocalSession(sessionId, title);
    return {
      id: record.sessionKey,
      title: record.title,
      createdAt: record.createdAt,
      messageCount: 0,
    };
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.transport.request('sessions.list', {});
    return result.sessions.map((session) => ({
      id: session.sessionKey,
      title: session.title,
      createdAt: session.createdAt,
      lastMessageAt: session.updatedAt,
      messageCount: 0,
    }));
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

  private bindTransportListeners(): void {
    if (this.unsubscribeProtocolListeners.length > 0) {
      return;
    }

    this.unsubscribeProtocolListeners.push(
      this.transport.onStatus((connected) => {
        this.statusHandlers.forEach((handler) => handler(connected));
      }),
    );

    this.unsubscribeProtocolListeners.push(
      this.transport.on('chat', (frame) => {
        const payload = frame.payload;
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
        this.emit({
          type: 'runtime.changed',
          sessionId: frame.payload.sessionKey,
          runtime: {
            state: frame.payload.state,
            detail: frame.payload.detail,
            updatedAt: frame.payload.updatedAt,
            source: 'gateway',
            messageId: frame.payload.messageId,
          },
        });
      }),
    );
  }

  private emit(event: ChatAdapterEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }
}

/**
 * legacy websocket adapter。
 *
 * 说明：
 * - 第一阶段只把本地 mock 迁移到 OpenClaw-compatible 结构
 * - 非 mock 分支暂时保留旧 websocket service，但页面层统一经由 adapter 接入
 * - 这样第二阶段再替换 transport 时，页面代码不需要再次大改
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

  async listSessions(): Promise<Session[]> {
    return [];
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
export const legacyWebSocketChatAdapter = new LegacyWebSocketChatAdapter();

/**
 * 统一获取当前运行时应使用的 chat adapter。
 *
 * 说明：
 * - 第一阶段只有 mock 分支完成 OpenClaw-compatible 改造
 * - 非 mock 分支暂时经由 legacy adapter 兼容，避免现网 / 非 mock 本地配置立刻断裂
 */
export function getActiveChatAdapter(): ChatAdapter {
  return IS_MOCK_ENABLED ? mockOpenClawChatAdapter : legacyWebSocketChatAdapter;
}

/** 测试辅助：重置 mock adapter 与 transport 的共享运行态。 */
export function resetMockChatAdapterRuntime(): void {
  mockOpenClawChatAdapter.reset();
  mockOpenClawTransport.reset();
}
