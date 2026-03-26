import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockOpenClawChatAdapter, resetMockChatAdapterRuntime } from '@/services/chatAdapter';
import type { ChatAdapterEvent } from '@/types/chatAdapter';

describe('mockOpenClawChatAdapter', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    resetMockChatAdapterRuntime();
    await mockOpenClawChatAdapter.connect();
  });

  afterEach(() => {
    resetMockChatAdapterRuntime();
    vi.useRealTimers();
  });

  it('createSession 会返回可直接用于 UI store 的会话对象', async () => {
    const session = await mockOpenClawChatAdapter.createSession('协议改造测试');

    expect(session.id).toMatch(/^session_/);
    expect(session.title).toBe('协议改造测试');

    const sessions = await mockOpenClawChatAdapter.listSessions();
    expect(sessions.some((item) => item.id === session.id)).toBe(true);
  });

  it('发送普通消息时会输出文本增量与运行态事件', async () => {
    const session = await mockOpenClawChatAdapter.createSession('普通对话');
    const events: ChatAdapterEvent[] = [];
    mockOpenClawChatAdapter.onEvent((event) => {
      events.push(event);
    });

    await mockOpenClawChatAdapter.sendMessage(session.id, {
      text: '你好',
      requestId: 'req_delta',
    });

    await vi.runAllTimersAsync();

    expect(events.some((event) => event.type === 'message.delta')).toBe(true);
    expect(events.some((event) => event.type === 'message.completed')).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === 'runtime.changed' &&
          (event.runtime.state === 'researching' || event.runtime.state === 'writing'),
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) => event.type === 'runtime.changed' && event.runtime.state === 'idle',
      ),
    ).toBe(true);
  });

  it('发送测试指令时会映射为结构化图表事件', async () => {
    const session = await mockOpenClawChatAdapter.createSession('图表会话');
    const events: ChatAdapterEvent[] = [];
    mockOpenClawChatAdapter.onEvent((event) => {
      events.push(event);
    });

    await mockOpenClawChatAdapter.sendMessage(session.id, {
      text: 'test table',
      requestId: 'req_table',
    });

    await vi.runAllTimersAsync();

    expect(
      events.some(
        (event) => event.type === 'message.chart' && event.chart.chartType === 'table',
      ),
    ).toBe(true);
  });
});
