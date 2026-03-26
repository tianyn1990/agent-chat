import { afterEach, describe, expect, it } from 'vitest';
import {
  isDashboardSessionKey,
  startOpenClawProxyDevServer,
} from '../../scripts/openclaw-proxy-dev-server.mjs';

class FakeGatewayClient {
  static instance: FakeGatewayClient | null = null;

  options: {
    onHelloOk?: (payload: { protocol: number }) => void;
  };
  requests: Array<{ method: string; params: Record<string, unknown> }>;
  stopped = false;

  constructor(options: { onHelloOk?: (payload: { protocol: number }) => void }) {
    this.options = options;
    this.requests = [];
    FakeGatewayClient.instance = this;
  }

  start() {
    queueMicrotask(() => {
      this.options.onHelloOk?.({
        protocol: 3,
      });
    });
  }

  stop() {
    this.stopped = true;
  }

  async request(method: string, params: Record<string, unknown> = {}) {
    this.requests.push({ method, params });

    if (method === 'sessions.list') {
      return {
        sessions: [
          {
            key: 'agent:main:dashboard:alpha',
            label: 'Alpha',
          },
          {
            key: 'external-session',
            label: '外部会话',
          },
        ],
      };
    }

    if (method === 'sessions.messages.subscribe') {
      return {
        subscribed: true,
        key: params.key,
      };
    }

    if (method === 'chat.history') {
      return {
        sessionKey: params.sessionKey,
        messages: [],
      };
    }

    if (method === 'sessions.delete') {
      return {
        ok: true,
        deleted: true,
        key: params.key,
      };
    }

    return {};
  }
}

describe('openclaw-proxy-dev-server', () => {
  let serverHandle:
    | {
        host: string;
        port: number;
        close: () => Promise<void>;
      }
    | null = null;

  afterEach(async () => {
    await serverHandle?.close();
    serverHandle = null;
    FakeGatewayClient.instance = null;
  });

  it('会识别 dashboard 命名空间会话', () => {
    expect(isDashboardSessionKey('agent:main:dashboard:test')).toBe(true);
    expect(isDashboardSessionKey('external-session')).toBe(false);
  });

  it('会过滤非 dashboard 会话，并在拉取历史前自动订阅消息', async () => {
    serverHandle = await startOpenClawProxyDevServer({
      host: '127.0.0.1',
      port: 0,
      gatewayRuntimeModule: {
        GatewayClient: FakeGatewayClient,
      },
    });

    const baseUrl = `http://${serverHandle.host}:${serverHandle.port}`;
    const listResponse = await fetch(`${baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'sessions.list',
        params: {
          includeDerivedTitles: true,
        },
      }),
    });
    const listPayload = await listResponse.json();

    expect(listPayload.ok).toBe(true);
    expect(listPayload.payload.sessions).toEqual([
      {
        key: 'agent:main:dashboard:alpha',
        label: 'Alpha',
      },
    ]);

    const historyResponse = await fetch(`${baseUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'chat.history',
        params: {
          sessionKey: 'agent:main:dashboard:alpha',
        },
      }),
    });
    const historyPayload = await historyResponse.json();

    expect(historyPayload.ok).toBe(true);
    expect(FakeGatewayClient.instance.requests).toEqual([
      {
        method: 'sessions.list',
        params: {
          includeDerivedTitles: true,
        },
      },
      {
        method: 'sessions.messages.subscribe',
        params: {
          key: 'agent:main:dashboard:alpha',
        },
      },
      {
        method: 'chat.history',
        params: {
          sessionKey: 'agent:main:dashboard:alpha',
        },
      },
    ]);
  });
});
