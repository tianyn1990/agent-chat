import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import MessageList from '@/components/Chat/MessageList';
import type { Message } from '@/types/message';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 120,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        key: index,
        index,
        start: index * 120,
      })),
    measureElement: vi.fn(),
  }),
}));

vi.mock('@/components/Chat/MessageBubble', () => ({
  default: ({
    message,
    pendingAccessory,
  }: {
    message: Message;
    pendingAccessory?: boolean;
  }) => (
    <div>
      <span>{message.id}</span>
      {pendingAccessory ? <span aria-label="pending-accessory">pending</span> : null}
    </div>
  ),
}));

vi.mock('@/components/Chat/TypingIndicator', () => ({
  default: ({ mode }: { mode?: 'pending' | 'streaming' }) => (
    <div aria-label={mode === 'pending' ? 'OpenClaw 正在准备回复' : 'OpenClaw 正在输出内容'}>
      typing
    </div>
  ),
}));

vi.mock('@/components/Chat/ScrollToBottom', () => ({
  default: ({
    visible,
    hasNewMessage,
    onClick,
  }: {
    visible: boolean;
    hasNewMessage?: boolean;
    onClick: () => void;
  }) =>
    visible ? (
      <button type="button" onClick={onClick}>
        {hasNewMessage ? 'new-message' : 'scroll-bottom'}
      </button>
    ) : null,
}));

function createMessage(id: string, status: Message['status'] = 'done'): Message {
  return {
    id,
    sessionId: 'session-1',
    role: 'assistant',
    contentType: 'text',
    content: {
      text: `message-${id}`,
    },
    status,
    timestamp: Date.now(),
  };
}

describe('MessageList', () => {
  const scrollToMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    scrollToMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('用户已上滚时，流式更新不应强制滚到底部', () => {
    const messages = [createMessage('m1'), createMessage('m2', 'streaming')];
    const { container, rerender } = render(
      <MessageList
        sessionId="session-1"
        messages={messages}
        streamingBuffer={{}}
        isStreaming={true}
      />,
    );

    const viewport = container.firstElementChild?.firstElementChild as HTMLDivElement;
    expect(viewport).toBeTruthy();

    scrollToMock.mockClear();

    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 2200,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      value: 1200,
      writable: true,
    });

    fireEvent.scroll(viewport);

    rerender(
      <MessageList
        sessionId="session-1"
        messages={messages}
        streamingBuffer={{ m2: 'stream chunk' }}
        isStreaming={true}
      />,
    );

    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it('用户位于底部时，流式更新应继续自动跟随到底部', () => {
    const messages = [createMessage('m1'), createMessage('m2', 'streaming')];
    const { container, rerender } = render(
      <MessageList
        sessionId="session-1"
        messages={messages}
        streamingBuffer={{}}
        isStreaming={true}
      />,
    );

    const viewport = container.firstElementChild?.firstElementChild as HTMLDivElement;
    expect(viewport).toBeTruthy();

    scrollToMock.mockClear();

    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 2200,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      value: 1600,
      writable: true,
    });

    fireEvent.scroll(viewport);

    rerender(
      <MessageList
        sessionId="session-1"
        messages={messages}
        streamingBuffer={{ m2: 'stream chunk' }}
        isStreaming={true}
      />,
    );

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: 'instant',
      top: 2200,
    });
  });

  it('新增消息到达时使用瞬时滚动，避免首帧平滑动画与用户滚动打架', () => {
    const initialMessages = [createMessage('m1')];
    const nextMessages = [createMessage('m1'), createMessage('m2', 'streaming')];
    const { container, rerender } = render(
      <MessageList
        sessionId="session-1"
        messages={initialMessages}
        streamingBuffer={{}}
        isStreaming={false}
      />,
    );

    const viewport = container.firstElementChild?.firstElementChild as HTMLDivElement;
    expect(viewport).toBeTruthy();

    scrollToMock.mockClear();

    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 1800,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      value: 1200,
      writable: true,
    });

    fireEvent.scroll(viewport);

    rerender(
      <MessageList
        sessionId="session-1"
        messages={nextMessages}
        streamingBuffer={{}}
        isStreaming={true}
      />,
    );

    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: 'instant',
      top: 1800,
    });
  });

  it('等待首个 delta 时也会展示 pending 提示并维持底部跟随', () => {
    const userMessage: Message = {
      id: 'user_1',
      sessionId: 'session-1',
      role: 'user',
      contentType: 'text',
      content: { text: '请帮我分析一下' },
      status: 'done',
      timestamp: Date.now(),
    };
    const { container, getByLabelText, rerender } = render(
      <MessageList
        sessionId="session-1"
        messages={[userMessage]}
        streamingBuffer={{}}
        isStreaming={false}
        isAwaitingResponse={false}
      />,
    );

    const viewport = container.firstElementChild?.firstElementChild as HTMLDivElement;
    expect(viewport).toBeTruthy();

    scrollToMock.mockClear();

    Object.defineProperty(viewport, 'scrollHeight', {
      configurable: true,
      value: 1600,
    });
    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 600,
    });
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      value: 1200,
      writable: true,
    });

    fireEvent.scroll(viewport);

    rerender(
      <MessageList
        sessionId="session-1"
        messages={[userMessage]}
        streamingBuffer={{}}
        isStreaming={false}
        isAwaitingResponse
      />,
    );

    expect(getByLabelText('pending-accessory')).toBeInTheDocument();
    expect(scrollToMock).toHaveBeenCalledWith({
      behavior: 'instant',
      top: 1600,
    });
  });

  it('切换会话时会立即重置到底部', () => {
    const sessionOneMessages = [createMessage('m1')];
    const sessionTwoMessages = [
      { ...createMessage('m2'), sessionId: 'session-2' },
      { ...createMessage('m3'), sessionId: 'session-2' },
    ];
    const { rerender } = render(
      <MessageList
        sessionId="session-1"
        messages={sessionOneMessages}
        streamingBuffer={{}}
        isStreaming={false}
      />,
    );

    scrollToMock.mockClear();

    rerender(
      <MessageList
        sessionId="session-2"
        messages={sessionTwoMessages}
        streamingBuffer={{}}
        isStreaming={false}
      />,
    );
    vi.runAllTimers();

    expect(scrollToMock).toHaveBeenCalled();
    expect(scrollToMock).toHaveBeenLastCalledWith({
      behavior: 'instant',
      top: expect.any(Number),
    });
  });
});
