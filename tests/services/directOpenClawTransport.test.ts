import { afterEach, describe, expect, it } from 'vitest';
import { Server, WebSocket as MockWebSocket } from 'mock-socket';
import {
  DirectOpenClawTransport,
  DirectOpenClawTransportError,
} from '@/services/directOpenClawTransport';
import {
  loadBrowserDeviceAuthToken,
  loadOrCreateBrowserDeviceIdentity,
  storeBrowserDeviceAuthToken,
} from '@/services/openclawBrowserDeviceAuth';

const GATEWAY_URL = 'ws://127.0.0.1:39091';

describe('DirectOpenClawTransport', () => {
  let server: Server | null = null;

  afterEach(() => {
    server?.stop();
    server = null;
    localStorage.clear();
  });

  it('可以完成真实握手最小闭环并发起 request', async () => {
    server = new Server(GATEWAY_URL);
    server.on('connection', (socket) => {
      socket.send(
        JSON.stringify({
          type: 'event',
          event: 'connect.challenge',
          payload: {
            nonce: 'nonce_test',
            ts: 1711111111111,
          },
        }),
      );

      socket.on('message', (data) => {
        const frame = JSON.parse(String(data));

        if (frame.type === 'req' && frame.method === 'connect') {
          expect(frame.params.client.id).toBe('webchat-ui');
          expect(frame.params.client.mode).toBe('webchat');
          expect(frame.params.device.id).toMatch(/^[a-f0-9]{64}$/);
          expect(frame.params.device.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
          expect(frame.params.device.signature).toMatch(/^[A-Za-z0-9_-]+$/);
          expect(frame.params.device.nonce).toBe('nonce_test');
          socket.send(
            JSON.stringify({
              type: 'res',
              id: frame.id,
              ok: true,
              payload: {
                type: 'hello-ok',
                protocol: 3,
                server: {
                  version: '2026.3.24',
                  connId: 'conn_test',
                },
                auth: {
                  deviceToken: 'device_token_test',
                  role: 'operator',
                  scopes: ['operator.read', 'operator.write'],
                },
                features: {
                  methods: ['sessions.list'],
                  events: ['chat'],
                },
                snapshot: {},
                policy: {
                  maxPayload: 1024,
                  maxBufferedBytes: 1024,
                  tickIntervalMs: 1000,
                },
              },
            }),
          );
          return;
        }

        if (frame.type === 'req' && frame.method === 'sessions.list') {
          socket.send(
            JSON.stringify({
              type: 'res',
              id: frame.id,
              ok: true,
              payload: {
                sessions: [
                  {
                    key: 'agent:main:dashboard:test',
                    label: '测试会话',
                    createdAtMs: 1711111111111,
                    updatedAtMs: 1711111112222,
                  },
                ],
              },
            }),
          );
        }
      });
    });

    const transport = new DirectOpenClawTransport({
      gatewayUrl: GATEWAY_URL,
      browserHostname: '127.0.0.1',
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await transport.connect();
    const result = await transport.request('sessions.list', {});

    expect(transport.isConnected).toBe(true);
    expect(result.sessions).toHaveLength(1);
  });

  it('仍兼容历史 challenge 与顶层 hello-ok 形态', async () => {
    server = new Server(GATEWAY_URL);
    server.on('connection', (socket) => {
      socket.send(
        JSON.stringify({
          type: 'connect.challenge',
          nonce: 'legacy_nonce_test',
        }),
      );

      socket.on('message', (data) => {
        const frame = JSON.parse(String(data));

        if (frame.type === 'req' && frame.method === 'connect') {
          socket.send(
            JSON.stringify({
              type: 'hello-ok',
              protocol: 3,
              server: {
                version: '2026.3.24',
                connId: 'conn_legacy_test',
              },
            }),
          );
        }
      });
    });

    const transport = new DirectOpenClawTransport({
      gatewayUrl: GATEWAY_URL,
      browserHostname: '127.0.0.1',
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await transport.connect();
    expect(transport.isConnected).toBe(true);
  });

  it('会阻止非 localhost 页面 origin 使用 direct 模式', async () => {
    const transport = new DirectOpenClawTransport({
      gatewayUrl: GATEWAY_URL,
      browserHostname: '192.168.1.3',
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await expect(Promise.resolve().then(() => transport.connect())).rejects.toBeInstanceOf(
      DirectOpenClawTransportError,
    );
    await expect(Promise.resolve().then(() => transport.connect())).rejects.toMatchObject({
      code: 'DIRECT_HOST_REQUIRED',
    });
  });

  it('会在缺少 Gateway URL 时给出明确诊断', async () => {
    const transport = new DirectOpenClawTransport({
      gatewayUrl: '',
      browserHostname: '127.0.0.1',
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await expect(Promise.resolve().then(() => transport.connect())).rejects.toMatchObject({
      code: 'DIRECT_URL_MISSING',
    });
  });

  it('会在缓存的 device token 失效时清理冲突 token 后自动恢复一次握手', async () => {
    let connectAttempt = 0;
    const deviceIdentity = await loadOrCreateBrowserDeviceIdentity();
    storeBrowserDeviceAuthToken({
      deviceId: deviceIdentity.deviceId,
      role: 'operator',
      token: 'stale_token',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
    });

    server = new Server(GATEWAY_URL);
    server.on('connection', (socket) => {
      socket.send(
        JSON.stringify({
          type: 'event',
          event: 'connect.challenge',
          payload: {
            nonce: `nonce_${connectAttempt + 1}`,
          },
        }),
      );

      socket.on('message', (data) => {
        const frame = JSON.parse(String(data));

        if (frame.type === 'req' && frame.method === 'connect') {
          connectAttempt += 1;
          expect(frame.params.device.id).toBe(deviceIdentity.deviceId);

          if (connectAttempt === 1) {
            expect(frame.params.auth?.deviceToken).toBe('stale_token');
            socket.send(
              JSON.stringify({
                type: 'res',
                id: frame.id,
                ok: false,
                error: {
                  code: 'AUTH_FAILED',
                  message: 'device signature invalid',
                },
              }),
            );
            return;
          }

          expect(frame.params.auth?.deviceToken).toBeUndefined();
          socket.send(
            JSON.stringify({
              type: 'res',
              id: frame.id,
              ok: true,
              payload: {
                type: 'hello-ok',
                protocol: 3,
                server: {
                  version: '2026.3.24',
                  connId: 'conn_recovered',
                },
                auth: {
                  deviceToken: 'fresh_device_token',
                  role: 'operator',
                  scopes: ['operator.read', 'operator.write', 'operator.admin'],
                },
              },
            }),
          );
        }
      });
    });

    const transport = new DirectOpenClawTransport({
      gatewayUrl: GATEWAY_URL,
      browserHostname: '127.0.0.1',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await transport.connect();

    expect(connectAttempt).toBe(2);
    expect(transport.isConnected).toBe(true);
    expect(
      loadBrowserDeviceAuthToken({
        deviceId: deviceIdentity.deviceId,
        role: 'operator',
      }),
    ).toMatchObject({
      token: 'fresh_device_token',
    });
  });

  it('当缓存 token scopes 不满足当前请求时，不会继续复用旧 token', async () => {
    const deviceIdentity = await loadOrCreateBrowserDeviceIdentity();
    storeBrowserDeviceAuthToken({
      deviceId: deviceIdentity.deviceId,
      role: 'operator',
      token: 'narrow_scope_token',
      scopes: ['operator.read', 'operator.write'],
    });

    server = new Server(GATEWAY_URL);
    server.on('connection', (socket) => {
      socket.send(
        JSON.stringify({
          type: 'event',
          event: 'connect.challenge',
          payload: {
            nonce: 'nonce_scope_upgrade',
          },
        }),
      );

      socket.on('message', (data) => {
        const frame = JSON.parse(String(data));

        if (frame.type === 'req' && frame.method === 'connect') {
          expect(frame.params.auth?.deviceToken).toBeUndefined();
          expect(frame.params.scopes).toEqual([
            'operator.read',
            'operator.write',
            'operator.admin',
          ]);
          socket.send(
            JSON.stringify({
              type: 'res',
              id: frame.id,
              ok: true,
              payload: {
                type: 'hello-ok',
                protocol: 3,
                server: {
                  version: '2026.3.24',
                  connId: 'conn_scope_upgrade',
                },
                auth: {
                  deviceToken: 'fresh_admin_token',
                  role: 'operator',
                  scopes: ['operator.read', 'operator.write', 'operator.admin'],
                },
              },
            }),
          );
        }
      });
    });

    const transport = new DirectOpenClawTransport({
      gatewayUrl: GATEWAY_URL,
      browserHostname: '127.0.0.1',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
      webSocketFactory: (url) => new MockWebSocket(url) as never,
    });

    await transport.connect();

    expect(
      loadBrowserDeviceAuthToken({
        deviceId: deviceIdentity.deviceId,
        role: 'operator',
      }),
    ).toMatchObject({
      token: 'fresh_admin_token',
      scopes: ['operator.read', 'operator.write', 'operator.admin'],
    });
  });
});
