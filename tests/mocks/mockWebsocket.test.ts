import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenClawChatEventPayload } from '@/types/openclaw';
import { FIRST_GUIDE_REPLY, mockOpenClawTransport } from '@/mocks/websocket';

/** 收集 chat 事件中的文本增量，并还原为完整回复文本。 */
function collectMessageText(events: OpenClawChatEventPayload[]): string {
  return events
    .filter((event): event is Extract<OpenClawChatEventPayload, { kind: 'message.delta' }> => event.kind === 'message.delta')
    .map((event) => event.delta)
    .join('');
}

describe('mockOpenClawTransport', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    mockOpenClawTransport.reset();
    await mockOpenClawTransport.connect();
  });

  afterEach(() => {
    mockOpenClawTransport.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('同一会话首次普通对话固定返回 test 指令引导', async () => {
    const events: OpenClawChatEventPayload[] = [];
    mockOpenClawTransport.on('chat', (frame) => {
      events.push(frame.payload);
    });

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_first',
      idempotencyKey: 'req_first',
      text: '你好',
    });

    await vi.runAllTimersAsync();

    expect(collectMessageText(events)).toContain(FIRST_GUIDE_REPLY.slice(0, 12));
    expect(collectMessageText(events)).toContain('test card');
    expect(collectMessageText(events)).toContain('test iframe');
  });

  it('同一会话在首轮引导后恢复普通随机回复', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_repeat',
      idempotencyKey: 'req_guide',
      text: '先给我一个提示',
    });
    await vi.runAllTimersAsync();

    const secondRoundEvents: OpenClawChatEventPayload[] = [];
    mockOpenClawTransport.on('chat', (frame) => {
      secondRoundEvents.push(frame.payload);
    });

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_repeat',
      idempotencyKey: 'req_normal',
      text: '继续聊聊这个需求',
    });
    await vi.runAllTimersAsync();

    const content = collectMessageText(secondRoundEvents);
    expect(content).not.toContain('请优先输入以下测试指令');
    expect(content).toContain('我理解您的问题是关于"继续聊聊这个需求"');
  });

  it('不同会话各自拥有独立的首次引导', async () => {
    const sessionAEvents: OpenClawChatEventPayload[] = [];
    mockOpenClawTransport.on('chat', (frame) => {
      if (frame.payload.sessionKey === 'session_a') {
        sessionAEvents.push(frame.payload);
      }
    });

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_a',
      idempotencyKey: 'req_a',
      text: '会话 A 首次发言',
    });
    await vi.runAllTimersAsync();

    const sessionBEvents: OpenClawChatEventPayload[] = [];
    mockOpenClawTransport.on('chat', (frame) => {
      if (frame.payload.sessionKey === 'session_b') {
        sessionBEvents.push(frame.payload);
      }
    });

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_b',
      idempotencyKey: 'req_b',
      text: '会话 B 首次发言',
    });
    await vi.runAllTimersAsync();

    expect(collectMessageText(sessionAEvents)).toContain('请优先输入以下测试指令');
    expect(collectMessageText(sessionBEvents)).toContain('请优先输入以下测试指令');
  });

  it('首条消息若直接输入测试指令，仍然返回结构化图表事件', async () => {
    const events: OpenClawChatEventPayload[] = [];
    mockOpenClawTransport.on('chat', (frame) => {
      events.push(frame.payload);
    });

    await mockOpenClawTransport.request('chat.send', {
      sessionKey: 'session_chart',
      idempotencyKey: 'req_chart',
      text: 'test line',
    });
    await vi.runAllTimersAsync();

    expect(events.some((event) => event.kind === 'message.chart')).toBe(true);
    expect(collectMessageText(events)).toBe('');
  });
});
