import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WsServerMessage } from '@/types/message';
import { mockWsService } from '@/mocks/websocket';

/** 将流式消息片段还原为完整文本，便于断言 mock 回复内容。 */
function collectMessageText(messages: WsServerMessage[]): string {
  return messages
    .filter((message): message is Extract<WsServerMessage, { type: 'message_chunk' }> => message.type === 'message_chunk')
    .map((message) => message.delta)
    .join('');
}

describe('mockWsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWsService.reset();
    mockWsService.connect();
  });

  afterEach(() => {
    mockWsService.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('同一会话首次普通对话固定返回 test 指令引导', async () => {
    const messages: WsServerMessage[] = [];
    mockWsService.onAll((message) => messages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_first',
      requestId: 'req_first',
      content: { text: '你好' },
    });

    await vi.runAllTimersAsync();

    const content = collectMessageText(messages);
    expect(content).toContain('请优先输入以下测试指令');
    expect(content).toContain('test card');
    expect(content).toContain('test iframe');
  });

  it('同一会话在首轮引导后恢复普通随机回复', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const firstRoundMessages: WsServerMessage[] = [];
    mockWsService.onAll((message) => firstRoundMessages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_repeat',
      requestId: 'req_guide',
      content: { text: '先给我一个提示' },
    });
    await vi.runAllTimersAsync();

    const secondRoundMessages: WsServerMessage[] = [];
    mockWsService.onAll((message) => secondRoundMessages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_repeat',
      requestId: 'req_normal',
      content: { text: '继续聊聊这个需求' },
    });
    await vi.runAllTimersAsync();

    const content = collectMessageText(secondRoundMessages);
    expect(content).not.toContain('请优先输入以下测试指令');
    expect(content).toContain('我理解您的问题是关于"继续聊聊这个需求"');
  });

  it('不同会话各自拥有独立的首次引导', async () => {
    const sessionAMessages: WsServerMessage[] = [];
    mockWsService.onAll((message) => sessionAMessages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_a',
      requestId: 'req_a',
      content: { text: '会话 A 首次发言' },
    });
    await vi.runAllTimersAsync();

    const sessionBMessages: WsServerMessage[] = [];
    mockWsService.onAll((message) => sessionBMessages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_b',
      requestId: 'req_b',
      content: { text: '会话 B 首次发言' },
    });
    await vi.runAllTimersAsync();

    expect(collectMessageText(sessionAMessages)).toContain('请优先输入以下测试指令');
    expect(collectMessageText(sessionBMessages)).toContain('请优先输入以下测试指令');
  });

  it('首条消息若直接输入测试指令，仍然返回对应类型消息', async () => {
    const messages: WsServerMessage[] = [];
    mockWsService.onAll((message) => messages.push(message));

    mockWsService.send({
      type: 'user_message',
      sessionId: 'session_chart',
      requestId: 'req_chart',
      content: { text: 'test line' },
    });

    await vi.runAllTimersAsync();

    expect(messages.some((message) => message.type === 'chart')).toBe(true);
    expect(collectMessageText(messages)).toBe('');
  });
});
