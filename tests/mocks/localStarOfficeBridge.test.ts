import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalStarOfficeBridge,
  LOCAL_STAR_OFFICE_PUSH_DELAY,
  mapRuntimeToLocalStarOfficePayload,
} from '@/mocks/starOffice/bridge';

describe('localStarOfficeBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mapRuntimeToLocalStarOfficePayload 正确映射运行态', () => {
    expect(
      mapRuntimeToLocalStarOfficePayload('session_alpha', {
        state: 'writing',
        detail: '正在生成回复',
        updatedAt: Date.now(),
        source: 'frontend',
        messageId: 'msg_1',
      }),
    ).toMatchObject({
      sessionId: 'session_alpha',
      state: 'writing',
      detail: '正在生成回复',
      progress: 58,
      messageId: 'msg_1',
    });
  });

  it('中间态会被节流后推送', async () => {
    const pushState = vi.fn().mockResolvedValue(undefined);
    const bridge = createLocalStarOfficeBridge({
      pushState,
      schedule: (callback, delay) => setTimeout(callback, delay),
      cancel: (timer) => clearTimeout(timer),
    });

    bridge.enqueue('session_beta', {
      state: 'writing',
      detail: '正在生成回复',
      updatedAt: Date.now(),
      source: 'frontend',
    });

    expect(pushState).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(LOCAL_STAR_OFFICE_PUSH_DELAY);
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('idle 终态会立即推送', () => {
    const pushState = vi.fn().mockResolvedValue(undefined);
    const bridge = createLocalStarOfficeBridge({
      pushState,
      schedule: (callback, delay) => setTimeout(callback, delay),
      cancel: (timer) => clearTimeout(timer),
    });

    bridge.enqueue('session_gamma', {
      state: 'idle',
      detail: '本轮已完成',
      updatedAt: Date.now(),
      source: 'frontend',
    });

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('同一会话重复载荷不会重复推送', async () => {
    const pushState = vi.fn().mockResolvedValue(undefined);
    const bridge = createLocalStarOfficeBridge({
      pushState,
      schedule: (callback, delay) => setTimeout(callback, delay),
      cancel: (timer) => clearTimeout(timer),
    });

    const runtime = {
      state: 'writing' as const,
      detail: '正在生成回复',
      updatedAt: 1,
      source: 'frontend' as const,
    };

    bridge.enqueue('session_delta', runtime);
    await vi.advanceTimersByTimeAsync(LOCAL_STAR_OFFICE_PUSH_DELAY);
    bridge.enqueue('session_delta', runtime);
    await vi.advanceTimersByTimeAsync(LOCAL_STAR_OFFICE_PUSH_DELAY);

    expect(pushState).toHaveBeenCalledTimes(1);
  });
});
