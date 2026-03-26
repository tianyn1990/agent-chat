import { afterEach, describe, expect, it } from 'vitest';
import {
  buildBrowserDeviceAuthPayloadV3,
  clearBrowserDeviceAuthToken,
  loadBrowserDeviceAuthToken,
  loadOrCreateBrowserDeviceIdentity,
  signBrowserDevicePayload,
  storeBrowserDeviceAuthToken,
} from '@/services/openclawBrowserDeviceAuth';

describe('openclawBrowserDeviceAuth', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('会创建并复用稳定的浏览器 device identity', async () => {
    const firstIdentity = await loadOrCreateBrowserDeviceIdentity();
    const secondIdentity = await loadOrCreateBrowserDeviceIdentity();

    expect(firstIdentity.deviceId).toBe(secondIdentity.deviceId);
    expect(firstIdentity.publicKeyRawBase64Url).toBe(secondIdentity.publicKeyRawBase64Url);
    expect(firstIdentity.privateKeyPkcs8Base64Url).toBe(secondIdentity.privateKeyPkcs8Base64Url);
  });

  it('会基于 v3 payload 生成可发送的签名', async () => {
    const identity = await loadOrCreateBrowserDeviceIdentity();
    const payload = buildBrowserDeviceAuthPayloadV3({
      deviceId: identity.deviceId,
      clientId: 'webchat-ui',
      clientMode: 'webchat',
      role: 'operator',
      scopes: ['operator.read', 'operator.write'],
      signedAtMs: 1711111111111,
      token: null,
      nonce: 'nonce_test',
      platform: 'MacIntel',
      deviceFamily: 'browser',
    });
    const signature = await signBrowserDevicePayload(identity.privateKeyPkcs8Base64Url, payload);

    expect(payload).toContain('v3');
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('会持久化并读取 device token', () => {
    storeBrowserDeviceAuthToken({
      deviceId: 'device_test',
      role: 'operator',
      token: 'token_test',
      scopes: ['operator.read'],
    });

    expect(
      loadBrowserDeviceAuthToken({
        deviceId: 'device_test',
        role: 'operator',
      }),
    ).toMatchObject({
      token: 'token_test',
      scopes: ['operator.read'],
    });
  });

  it('会只清理指定 role 的 device token，保留其他缓存项', () => {
    storeBrowserDeviceAuthToken({
      deviceId: 'device_test',
      role: 'operator',
      token: 'token_operator',
      scopes: ['operator.read'],
    });
    storeBrowserDeviceAuthToken({
      deviceId: 'device_test',
      role: 'observer',
      token: 'token_observer',
      scopes: ['observer.read'],
    });

    clearBrowserDeviceAuthToken({
      deviceId: 'device_test',
      role: 'operator',
    });

    expect(
      loadBrowserDeviceAuthToken({
        deviceId: 'device_test',
        role: 'operator',
      }),
    ).toBeNull();
    expect(
      loadBrowserDeviceAuthToken({
        deviceId: 'device_test',
        role: 'observer',
      }),
    ).toMatchObject({
      token: 'token_observer',
    });
  });
});
