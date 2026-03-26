import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIRECT_GATEWAY_URL,
  buildOpenClawDirectEnv,
  buildOpenClawGatewayArgs,
  buildViteArgs,
} from '../../scripts/dev-openclaw-direct.mjs';

describe('dev-openclaw-direct script helpers', () => {
  it('会为子进程注入 direct runtime 环境变量且保留其他字段', () => {
    const env = buildOpenClawDirectEnv({
      PATH: '/usr/bin',
      VITE_CHAT_RUNTIME: 'mock-openclaw',
      CUSTOM_FLAG: 'custom',
    });

    expect(env.PATH).toBe('/usr/bin');
    expect(env.CUSTOM_FLAG).toBe('custom');
    expect(env.VITE_CHAT_RUNTIME).toBe('openclaw-direct');
    expect(env.VITE_MOCK_ENABLED).toBe('false');
    expect(env.VITE_OPENCLAW_GATEWAY_URL).toBe(DEFAULT_DIRECT_GATEWAY_URL);
    expect(env.VITE_OPENCLAW_GATEWAY_ROLE).toBe('operator');
    expect(env.VITE_OPENCLAW_GATEWAY_SCOPES).toBe('operator.read,operator.write,operator.admin');
    expect(env.VITE_STAR_OFFICE_MOCK_ENABLED).toBe('true');
  });

  it('会保留调用者显式传入的 Gateway 配置', () => {
    const env = buildOpenClawDirectEnv({
      VITE_OPENCLAW_GATEWAY_URL: 'ws://127.0.0.1:29001',
      VITE_OPENCLAW_GATEWAY_ROLE: 'observer',
      VITE_OPENCLAW_GATEWAY_SCOPES: 'observer.read',
      VITE_STAR_OFFICE_MOCK_ENABLED: 'false',
    });

    expect(env.VITE_OPENCLAW_GATEWAY_URL).toBe('ws://127.0.0.1:29001');
    expect(env.VITE_OPENCLAW_GATEWAY_ROLE).toBe('observer');
    expect(env.VITE_OPENCLAW_GATEWAY_SCOPES).toBe('observer.read');
    expect(env.VITE_STAR_OFFICE_MOCK_ENABLED).toBe('false');
  });

  it('operator 角色即使显式传入旧 scopes，也会自动补齐 admin', () => {
    const env = buildOpenClawDirectEnv({
      VITE_OPENCLAW_GATEWAY_ROLE: 'operator',
      VITE_OPENCLAW_GATEWAY_SCOPES: 'operator.read,operator.write',
    });

    expect(env.VITE_OPENCLAW_GATEWAY_SCOPES).toBe('operator.read,operator.write,operator.admin');
  });

  it('显式开启真实 Star-Office 联调时，不会强行再写入 mock 开关', () => {
    const env = buildOpenClawDirectEnv({
      VITE_STAR_OFFICE_REAL_DEV_ENABLED: 'true',
    });

    expect(env.VITE_STAR_OFFICE_REAL_DEV_ENABLED).toBe('true');
    expect(env.VITE_STAR_OFFICE_MOCK_ENABLED).toBe('');
  });

  it('会生成固定的 Gateway 前台启动参数', () => {
    expect(buildOpenClawGatewayArgs()).toEqual([
      '--dev',
      'gateway',
      'run',
      '--auth',
      'none',
      '--allow-unconfigured',
      '--force',
    ]);
  });

  it('会为 Vite 注入 localhost host 并透传额外参数', () => {
    expect(buildViteArgs(['--port', '3010'])).toEqual([
      'run',
      'dev',
      '--',
      '--host',
      'localhost',
      '--port',
      '3010',
    ]);
  });
});
