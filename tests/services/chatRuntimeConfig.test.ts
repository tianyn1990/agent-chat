import { describe, expect, it } from 'vitest';
import {
  createChatRuntimeConfig,
  isLoopbackHostname,
  resolveChatRuntimeMode,
} from '@/config/chatRuntime';

describe('chatRuntime config', () => {
  it('在显式配置 runtime 时优先采用显式模式', () => {
    expect(
      resolveChatRuntimeMode({
        VITE_CHAT_RUNTIME: 'openclaw-direct',
        VITE_MOCK_ENABLED: 'true',
      }),
    ).toBe('openclaw-direct');

    expect(
      resolveChatRuntimeMode({
        VITE_CHAT_RUNTIME: 'openclaw-proxy',
        VITE_MOCK_ENABLED: 'true',
      }),
    ).toBe('openclaw-proxy');
  });

  it('在未配置显式 runtime 时兼容旧版 mock 布尔开关', () => {
    expect(
      resolveChatRuntimeMode({
        VITE_MOCK_ENABLED: 'true',
      }),
    ).toBe('mock-openclaw');

    expect(
      resolveChatRuntimeMode({
        VITE_MOCK_ENABLED: 'false',
      }),
    ).toBe('legacy-websocket');
  });

  it('会为 direct 模式构建完整默认配置', () => {
    const config = createChatRuntimeConfig({
      VITE_CHAT_RUNTIME: 'openclaw-direct',
      VITE_OPENCLAW_GATEWAY_URL: 'ws://127.0.0.1:38080',
    });

    expect(config.mode).toBe('openclaw-direct');
    expect(config.requiresUserLogin).toBe(false);
    expect(config.directGatewayScopes).toEqual([
      'operator.read',
      'operator.write',
      'operator.admin',
    ]);
  });

  it('显式传入 scopes 时仍会保留调用者配置', () => {
    const config = createChatRuntimeConfig({
      VITE_CHAT_RUNTIME: 'openclaw-direct',
      VITE_OPENCLAW_GATEWAY_URL: 'ws://127.0.0.1:38080',
      VITE_OPENCLAW_GATEWAY_SCOPES: 'operator.read,operator.write',
    });

    expect(config.directGatewayScopes).toEqual(['operator.read', 'operator.write']);
  });

  it('会为 proxy 模式补齐默认 proxy 地址', () => {
    const config = createChatRuntimeConfig({
      VITE_CHAT_RUNTIME: 'openclaw-proxy',
    });

    expect(config.mode).toBe('openclaw-proxy');
    expect(config.requiresUserLogin).toBe(false);
    expect(config.proxyUrl).toBe('/__openclaw_proxy');
  });

  it('仅允许 localhost 与 127.0.0.1 作为本地直连 origin', () => {
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('192.168.1.8')).toBe(false);
  });
});
