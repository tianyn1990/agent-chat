import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildOpenClawProxyEnv,
  DEFAULT_PROXY_BASE_PATH,
  DEFAULT_PROXY_DEV_TARGET,
  waitForProxyReady,
} from '../../scripts/dev-openclaw-proxy.mjs';

describe('dev-openclaw-proxy script helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('会为 proxy 联调生成隔离的运行时环境变量', () => {
    const env = buildOpenClawProxyEnv({
      VITE_CHAT_RUNTIME: 'mock-openclaw',
      VITE_MOCK_ENABLED: 'true',
    });

    expect(env.VITE_CHAT_RUNTIME).toBe('openclaw-proxy');
    expect(env.VITE_MOCK_ENABLED).toBe('false');
    expect(env.VITE_OPENCLAW_PROXY_URL).toBe(DEFAULT_PROXY_BASE_PATH);
    expect(env.VITE_OPENCLAW_PROXY_DEV_TARGET).toBe(DEFAULT_PROXY_DEV_TARGET);
    expect(env.VITE_STAR_OFFICE_MOCK_ENABLED).toBe('true');
  });

  it('会在 health 返回成功时结束等待', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      waitForProxyReady({
        timeoutMs: 50,
        pollIntervalMs: 5,
      }),
    ).resolves.toBeUndefined();
  });
});
