import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VisualizeWorkbenchFrame from '@/components/Visualize/VisualizeWorkbenchFrame';
import { useChatStore } from '@/stores/useChatStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

vi.mock('@/utils/starOffice', () => ({
  resolveStarOfficeIframeUrl: (sessionId: string) => `/__mock/star-office/app?sessionId=${sessionId}`,
}));

describe('VisualizeWorkbenchFrame', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useChatStore.setState({
      sessions: [
        {
          id: 'session_frame',
          title: '执行状态测试会话',
          createdAt: Date.now(),
        },
        {
          id: 'session_keepalive',
          title: '保活工作台会话',
          createdAt: Date.now(),
        },
        {
          id: 'session_back',
          title: '返回测试会话',
          createdAt: Date.now(),
        },
        {
          id: 'session_keyboard',
          title: '键盘拖拽测试会话',
          createdAt: Date.now(),
        },
      ],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });

    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
      workbenchCacheSessionIds: [],
      workbenchLifecycleBySession: {},
      runtimeBySession: {},
    });
  });

  it('展示沉浸式工作台工具栏', () => {
    render(
      <MemoryRouter initialEntries={['/visualize/session_frame']}>
        <VisualizeWorkbenchFrame sessionId="session_frame" visible />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('执行状态工作台工具栏')).toBeInTheDocument();
    expect(screen.getByLabelText('拖动执行状态工具栏')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回聊天' })).toHaveTextContent('返回聊天');
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收起' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('执行状态工作台工具栏')).toHaveStyle({ top: '94px' });
  });

  it('首开时展示加载封面，iframe ready 后切换到真实工作台', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/visualize/session_frame']}>
        <VisualizeWorkbenchFrame sessionId="session_frame" visible />
      </MemoryRouter>,
    );

    expect(screen.getByText(/正在进入当前会话的沉浸式工作台/)).toBeInTheDocument();

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();

    fireEvent.load(iframe!);

    expect(screen.queryByText(/正在进入当前会话的沉浸式工作台/)).not.toBeInTheDocument();
  });

  it('隐藏时保留已挂载的 iframe，再次显示时复用同一节点', () => {
    const { container, rerender } = render(
      <MemoryRouter initialEntries={['/visualize/session_keepalive']}>
        <VisualizeWorkbenchFrame sessionId="session_keepalive" visible />
      </MemoryRouter>,
    );

    const firstIframe = container.querySelector('iframe');
    expect(firstIframe).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/chat/session_keepalive']}>
        <VisualizeWorkbenchFrame sessionId="session_keepalive" visible={false} />
      </MemoryRouter>,
    );

    const hiddenIframe = container.querySelector('iframe');
    expect(hiddenIframe).toBe(firstIframe);

    rerender(
      <MemoryRouter initialEntries={['/visualize/session_keepalive']}>
        <VisualizeWorkbenchFrame sessionId="session_keepalive" visible />
      </MemoryRouter>,
    );

    const restoredIframe = container.querySelector('iframe');
    expect(restoredIframe).toBe(firstIframe);
  });

  it('点击返回聊天会隐藏工作台并跳转到会话页', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/visualize/session_back']}>
        <Routes>
          <Route
            path="*"
            element={<VisualizeWorkbenchFrame sessionId="session_back" visible />}
          />
          <Route path="/chat/:sessionId" element={<div>聊天页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    useVisualizeStore.getState().openWorkbench('session_back');
    await user.click(screen.getByRole('button', { name: '返回聊天' }));

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(false);
    expect(screen.getByText('聊天页')).toBeInTheDocument();
  });

  it('拖拽手柄支持方向键微调位置，并限制在最小边界内', () => {
    render(
      <MemoryRouter initialEntries={['/visualize/session_keyboard']}>
        <VisualizeWorkbenchFrame sessionId="session_keyboard" visible />
      </MemoryRouter>,
    );

    const toolbar = screen.getByLabelText('执行状态工作台工具栏');
    const dragHandle = screen.getByRole('button', { name: '拖动执行状态工具栏' });

    fireEvent.keyDown(dragHandle, { key: 'ArrowLeft' });
    fireEvent.keyDown(dragHandle, { key: 'ArrowUp' });

    expect(toolbar).toHaveStyle({ left: '12px', top: '88px' });

    fireEvent.keyDown(dragHandle, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(dragHandle, { key: 'ArrowDown', shiftKey: true });

    expect(toolbar).toHaveStyle({ left: '60px', top: '136px' });
  });

  it('加载超时后展示明确的工作台异常提示', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/visualize/session_frame']}>
        <VisualizeWorkbenchFrame sessionId="session_frame" visible />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(9000);
    });

    expect(screen.getByText('工作台加载时间较长，请稍后重试或点击右上角刷新。')).toBeInTheDocument();
  });
});
