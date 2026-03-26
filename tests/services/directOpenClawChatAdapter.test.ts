import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildDirectDashboardSessionKey,
  DirectOpenClawChatAdapter,
  isDirectDashboardSessionKey,
} from '@/services/chatAdapter';
import type { OpenClawGatewayTransport } from '@/services/openclawTransport';
import type {
  OpenClawGatewayEvent,
  OpenClawGatewayEventType,
  OpenClawGatewaySessionEntry,
  OpenClawMethodParamsMap,
  OpenClawMethodResultMap,
} from '@/types/openclaw';

class FakeDirectTransport implements OpenClawGatewayTransport {
  readonly eventHandlers = new Map<
    OpenClawGatewayEventType,
    Set<(event: OpenClawGatewayEvent) => void>
  >();
  readonly statusHandlers = new Set<(connected: boolean) => void>();
  isConnected = false;
  readonly requests: Array<{ method: keyof OpenClawMethodParamsMap; params?: unknown }> = [];
  sessionsList: OpenClawGatewaySessionEntry[] = [];
  sessionsCreateResult: OpenClawMethodResultMap['sessions.create'] = {};
  sessionsCreateShouldThrow = false;
  sessionsPatchResult: OpenClawMethodResultMap['sessions.patch'] = { ok: true };
  sessionsDeleteResult: OpenClawMethodResultMap['sessions.delete'] = { ok: true, deleted: true };
  sessionsPatchShouldThrow = false;
  sessionsDeleteShouldThrow = false;

  async connect(): Promise<void> {
    this.isConnected = true;
    this.statusHandlers.forEach((handler) => handler(true));
  }

  disconnect(): void {
    this.isConnected = false;
    this.statusHandlers.forEach((handler) => handler(false));
  }

  async request<TMethod extends keyof OpenClawMethodParamsMap>(
    method: TMethod,
    params?: OpenClawMethodParamsMap[TMethod],
  ): Promise<OpenClawMethodResultMap[TMethod]> {
    this.requests.push({ method, params });

    if (method === 'chat.history') {
      return {
        sessionKey: 'agent:main:dashboard:test',
        messages: [
          {
            id: 'msg_user',
            role: 'user',
            content: [{ type: 'text', text: '你好' }],
            timestamp: 1711111111000,
          },
          {
            id: 'msg_assistant',
            role: 'assistant',
            content: [{ type: 'text', text: '您好，我在。' }],
            timestamp: 1711111112000,
          },
        ],
      } as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'sessions.list') {
      return {
        sessions: this.sessionsList,
      } as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'sessions.create') {
      if (this.sessionsCreateShouldThrow) {
        throw new Error('gateway method unavailable');
      }

      return this.sessionsCreateResult as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'sessions.patch') {
      if (this.sessionsPatchShouldThrow) {
        throw new Error('sessions.patch unavailable');
      }
      return this.sessionsPatchResult as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'sessions.delete') {
      if (this.sessionsDeleteShouldThrow) {
        throw new Error('sessions.delete unavailable');
      }
      return this.sessionsDeleteResult as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'sessions.messages.subscribe' || method === 'sessions.messages.unsubscribe') {
      return {
        subscribed: method === 'sessions.messages.subscribe',
        key: ((params as { key?: string } | undefined)?.key ?? '').trim(),
      } as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'chat.send') {
      return {
        runId: 'run_test',
        status: 'started',
      } as OpenClawMethodResultMap[TMethod];
    }

    if (method === 'chat.abort') {
      return {
        aborted: true,
      } as OpenClawMethodResultMap[TMethod];
    }

    throw new Error(`未实现的方法: ${String(method)}`);
  }

  on<TEvent extends OpenClawGatewayEventType>(
    event: TEvent,
    handler: (event: Extract<OpenClawGatewayEvent, { event: TEvent }>) => void,
  ): () => void {
    const handlerSet = this.eventHandlers.get(event) ?? new Set();
    const wrappedHandler = handler as (event: OpenClawGatewayEvent) => void;
    handlerSet.add(wrappedHandler);
    this.eventHandlers.set(event, handlerSet);

    return () => {
      handlerSet.delete(wrappedHandler);
    };
  }

  onStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  emit(event: OpenClawGatewayEvent): void {
    this.eventHandlers.get(event.event)?.forEach((handler) => handler(event));
  }
}

describe('DirectOpenClawChatAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('会只展示 dashboard 命名空间下的会话', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsList = [
      {
        key: 'agent:main:dashboard:alpha',
        label: 'Dashboard Alpha',
        createdAtMs: 1711111111000,
      },
      {
        key: '680028ad-4b3d-449c-8e9e-54930936d0a2',
        label: 'CLI 历史会话',
        createdAtMs: 1711111112000,
      },
    ];

    const adapter = new DirectOpenClawChatAdapter(transport);
    const sessions = await adapter.listSessions();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('agent:main:dashboard:alpha');
  });

  it('会优先使用派生标题覆盖占位 label', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsList = [
      {
        key: 'agent:main:dashboard:title-fallback',
        label: '新对话',
        title: '真实派生标题',
        createdAtMs: 1711111111000,
      },
    ];

    const adapter = new DirectOpenClawChatAdapter(transport);
    const sessions = await adapter.listSessions();

    expect(sessions[0].title).toBe('真实派生标题');
    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.list',
      params: {
        includeDerivedTitles: true,
        includeLastMessage: true,
      },
    });
  });

  it('会将真实 chat.history 结果映射为 UI 消息', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);

    const result = await adapter.getHistory('agent:main:dashboard:test');

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].contentType).toBe('text');
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.messages.subscribe',
      params: { key: 'agent:main:dashboard:test' },
    });
  });

  it('会在历史消息中剥离 <final> 包裹标签', async () => {
    const transport = new FakeDirectTransport();
    transport.request = (async (method, params) => {
      transport.requests.push({ method, params });

      if (method === 'sessions.messages.subscribe') {
        return {
          subscribed: true,
          key: ((params as { key?: string } | undefined)?.key ?? '').trim(),
        } as OpenClawMethodResultMap[typeof method];
      }

      if (method === 'chat.history') {
        return {
          sessionKey: 'agent:main:dashboard:test',
          messages: [
            {
              id: 'msg_assistant_final',
              role: 'assistant',
              text: '<final>Hi there! How can I help you today?</final>',
              timestamp: 1711111112000,
            },
          ],
        } as OpenClawMethodResultMap[typeof method];
      }

      if (method === 'sessions.list') {
        return {
          sessions: [],
        } as OpenClawMethodResultMap[typeof method];
      }

      throw new Error(`未实现的方法: ${String(method)}`);
    }) as FakeDirectTransport['request'];

    const adapter = new DirectOpenClawChatAdapter(transport);
    const result = await adapter.getHistory('agent:main:dashboard:test');

    expect(result.messages[0].contentType).toBe('text');
    expect(result.messages[0].content.text).toBe('Hi there! How can I help you today?');
  });

  it('会把真实 chat delta/final 事件翻译为统一领域事件', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);
    const events: string[] = [];

    adapter.onEvent((event) => {
      events.push(event.type);
    });

    await adapter.connect();

    transport.emit({
      type: 'event',
      event: 'chat',
      payload: {
        sessionKey: 'agent:main:dashboard:test',
        runId: 'run_1',
        state: 'delta',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: '你好' }],
        },
      },
    });

    transport.emit({
      type: 'event',
      event: 'chat',
      payload: {
        sessionKey: 'agent:main:dashboard:test',
        runId: 'run_1',
        state: 'final',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: '你好，OpenClaw。' }],
        },
      },
    });

    expect(events).toContain('message.delta');
    expect(events).toContain('message.completed');
    expect(events).toContain('runtime.changed');
  });

  it('会在流式事件中剥离 <final> 包裹标签', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);
    const deltas: string[] = [];

    adapter.onEvent((event) => {
      if (event.type === 'message.delta') {
        deltas.push(event.delta);
      }
    });

    await adapter.connect();

    transport.emit({
      type: 'event',
      event: 'chat',
      payload: {
        sessionKey: 'agent:main:dashboard:test',
        runId: 'run_final_tag',
        state: 'delta',
        message: {
          role: 'assistant',
          text: '<final>Hello',
        },
      },
    });

    transport.emit({
      type: 'event',
      event: 'chat',
      payload: {
        sessionKey: 'agent:main:dashboard:test',
        runId: 'run_final_tag',
        state: 'final',
        message: {
          role: 'assistant',
          text: '<final>Hello there!</final>',
        },
      },
    });

    expect(deltas.join('')).toBe('Hello there!');
  });

  it('新建会话时会优先请求 Gateway 创建权威 session', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsCreateResult = {
      entry: {
        key: 'agent:main:dashboard:gateway-created',
        label: '网关创建会话',
        createdAtMs: 1711111111111,
      },
    };

    const adapter = new DirectOpenClawChatAdapter(transport);
    const session = await adapter.createSession('网关创建会话');

    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.create',
      params: {
        key: expect.stringMatching(/^agent:main:dashboard:/),
        label: '网关创建会话',
      },
    });
    expect(session.id).toBe('agent:main:dashboard:gateway-created');
    expect(session.title).toBe('网关创建会话');
  });

  it('当 Gateway 暂不支持 sessions.create 时会回退到本地 dashboard key', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsCreateShouldThrow = true;
    const adapter = new DirectOpenClawChatAdapter(transport);

    const session = await adapter.createSession('本地兜底会话');

    expect(isDirectDashboardSessionKey(session.id)).toBe(true);
    expect(session.title).toBe('本地兜底会话');
  });

  it('会提供稳定的 dashboard session key helper', () => {
    const sessionKey = buildDirectDashboardSessionKey('seed-value');

    expect(sessionKey).toBe('agent:main:dashboard:seed-value');
    expect(isDirectDashboardSessionKey(sessionKey)).toBe(true);
    expect(isDirectDashboardSessionKey('dev-session')).toBe(false);
  });

  it('发送消息前会确保目标会话已订阅实时事件', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);

    await adapter.sendMessage('agent:main:dashboard:test', {
      text: 'hello',
      requestId: 'req_subscribe_first',
    });

    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.messages.subscribe',
      params: { key: 'agent:main:dashboard:test' },
    });
    expect(transport.requests[1]).toMatchObject({
      method: 'chat.send',
    });
  });

  it('发送消息成功后会主动发出 researching 运行态，避免界面空窗', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);
    const runtimeEvents: string[] = [];

    adapter.onEvent((event) => {
      if (event.type === 'runtime.changed') {
        runtimeEvents.push(event.runtime.state);
      }
    });

    await adapter.sendMessage('agent:main:dashboard:test', {
      text: 'hello',
      requestId: 'req_runtime_after_send',
    });

    expect(runtimeEvents).toContain('researching');
  });

  it('重命名会话时会调用 sessions.patch', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);

    await adapter.renameSession('agent:main:dashboard:test', '新的会话标题');

    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.patch',
      params: {
        key: 'agent:main:dashboard:test',
        label: '新的会话标题',
      },
    });
  });

  it('远端 patch 不可用时会向上抛出失败，避免误判已真实重命名', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsPatchShouldThrow = true;
    const adapter = new DirectOpenClawChatAdapter(transport);

    await expect(adapter.renameSession('agent:main:dashboard:test', '本地覆盖标题')).rejects.toThrow(
      'sessions.patch unavailable',
    );
  });

  it('删除会话时会调用 sessions.delete', async () => {
    const transport = new FakeDirectTransport();
    const adapter = new DirectOpenClawChatAdapter(transport);

    await adapter.deleteSession('agent:main:dashboard:test');

    expect(transport.requests[0]).toMatchObject({
      method: 'sessions.delete',
      params: {
        key: 'agent:main:dashboard:test',
      },
    });
  });

  it('远端 delete 不可用时会向上抛出失败，避免误判已真实删除', async () => {
    const transport = new FakeDirectTransport();
    transport.sessionsDeleteShouldThrow = true;
    const adapter = new DirectOpenClawChatAdapter(transport);

    await expect(adapter.deleteSession('agent:main:dashboard:delete')).rejects.toThrow(
      'sessions.delete unavailable',
    );
  });
});
