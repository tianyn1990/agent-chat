import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProxyOpenClawTransport } from '@/services/proxyOpenClawTransport';

class FakeEventSource {
  readonly handlers = new Map<string, Set<(event: Event | MessageEvent) => void>>();
  readonly readyState = 0;
  closed = false;

  addEventListener(
    type: 'open' | 'message' | 'error',
    listener: (event: Event | MessageEvent) => void,
  ): void {
    const handlerSet = this.handlers.get(type) ?? new Set();
    handlerSet.add(listener);
    this.handlers.set(type, handlerSet);
  }

  removeEventListener(
    type: 'open' | 'message' | 'error',
    listener: (event: Event | MessageEvent) => void,
  ): void {
    this.handlers.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: 'open' | 'message' | 'error', event: Event | MessageEvent): void {
    this.handlers.get(type)?.forEach((handler) => handler(event));
  }
}

describe('ProxyOpenClawTransport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('可以通过 SSE 建立连接并分发 Gateway-like 事件', async () => {
    const fakeEventSource = new FakeEventSource();
    const transport = new ProxyOpenClawTransport({
      proxyUrl: '/__openclaw_proxy',
      eventSourceFactory: () => fakeEventSource,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    const chatEvents: Array<{ sessionKey: string; state: string }> = [];

    transport.on('chat', (event) => {
      chatEvents.push({
        sessionKey: event.payload.sessionKey,
        state: event.payload.state,
      });
    });

    const connectPromise = transport.connect();
    fakeEventSource.emit('open', new Event('open'));
    await connectPromise;

    fakeEventSource.emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'event',
          event: 'chat',
          payload: {
            sessionKey: 'agent:main:dashboard:test',
            state: 'delta',
            runId: 'run_test',
          },
        }),
      }),
    );

    expect(transport.isConnected).toBe(true);
    expect(chatEvents).toEqual([
      {
        sessionKey: 'agent:main:dashboard:test',
        state: 'delta',
      },
    ]);
  });

  it('会通过 HTTP RPC 请求 proxy server', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          payload: {
            sessions: [],
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    const transport = new ProxyOpenClawTransport({
      proxyUrl: 'http://127.0.0.1:19002',
      eventSourceFactory: () => new FakeEventSource(),
      fetchImpl,
    });

    const result = await transport.request('sessions.list', {
      includeDerivedTitles: true,
    });

    expect(result.sessions).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://127.0.0.1:19002/rpc',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('会在 proxy 返回失败时抛出明确诊断', async () => {
    const transport = new ProxyOpenClawTransport({
      proxyUrl: 'http://127.0.0.1:19002',
      eventSourceFactory: () => new FakeEventSource(),
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              message: 'sessions.delete failed',
            },
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    });

    await expect(
      transport.request('sessions.delete', {
        key: 'agent:main:dashboard:test',
      }),
    ).rejects.toMatchObject({
      code: 'PROXY_REQUEST_FAILED',
      message: 'sessions.delete failed',
    });
  });
});
