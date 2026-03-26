import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { App } from 'antd';
import userEvent from '@testing-library/user-event';
vi.mock('@/services/chatAdapter', async () => {
  const actual = await vi.importActual<typeof import('@/services/chatAdapter')>(
    '@/services/chatAdapter',
  );

  return {
    ...actual,
    getActiveChatAdapter: () => actual.mockOpenClawChatAdapter,
  };
});

import ChatPage from '@/pages/Chat';
import ChatRuntimeHost from '@/components/Chat/ChatRuntimeHost';
import { useChatStore } from '@/stores/useChatStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import { useUserStore } from '@/stores/useUserStore';
import { resetMockChatAdapterRuntime } from '@/services/chatAdapter';

function renderChatPage(initialEntry = '/chat') {
  return render(
    <App>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ChatRuntimeHost />
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/visualize/:sessionId" element={<div>工作台路由</div>} />
        </Routes>
      </MemoryRouter>
    </App>,
  );
}

function SidebarExtraOutlet() {
  const extraContent = useSidebarStore((state) => state.extraContent);
  return <>{extraContent}</>;
}

function renderChatPageWithSidebar(initialEntry = '/chat') {
  return render(
    <App>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ChatRuntimeHost />
        <SidebarExtraOutlet />
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/visualize/:sessionId" element={<div>工作台路由</div>} />
        </Routes>
      </MemoryRouter>
    </App>,
  );
}

function VisualizeRouteBackButton() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${sessionId}`)}
      aria-label="返回聊天测试"
    >
      返回聊天测试
    </button>
  );
}

describe('ChatPage', () => {
  beforeEach(() => {
    resetMockChatAdapterRuntime();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      }),
    );
    URL.createObjectURL = vi.fn(() => 'blob:chat-attachment');
    URL.revokeObjectURL = vi.fn();
    HTMLElement.prototype.scrollTo = vi.fn();

    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });

    useSidebarStore.setState({
      extraContent: null,
      setExtraContent: useSidebarStore.getState().setExtraContent,
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
      openPanel: useVisualizeStore.getState().openPanel,
      closePanel: useVisualizeStore.getState().closePanel,
      ensureWorkbenchSession: useVisualizeStore.getState().ensureWorkbenchSession,
      openWorkbench: useVisualizeStore.getState().openWorkbench,
      hideWorkbench: useVisualizeStore.getState().hideWorkbench,
      markWorkbenchLoading: useVisualizeStore.getState().markWorkbenchLoading,
      markWorkbenchReady: useVisualizeStore.getState().markWorkbenchReady,
      markWorkbenchError: useVisualizeStore.getState().markWorkbenchError,
      setSessionRuntime: useVisualizeStore.getState().setSessionRuntime,
      clearSessionRuntime: useVisualizeStore.getState().clearSessionRuntime,
    });

    useUserStore.setState({
      userInfo: null,
      token: null,
      isLoading: false,
      setUserInfo: useUserStore.getState().setUserInfo,
      setToken: useUserStore.getState().setToken,
      login: useUserStore.getState().login,
      logout: useUserStore.getState().logout,
      setLoading: useUserStore.getState().setLoading,
    });
  });

  afterEach(() => {
    resetMockChatAdapterRuntime();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('首次点击欢迎页快捷建议时会自动创建会话并预填输入内容', async () => {
    renderChatPage('/chat');

    fireEvent.click(screen.getByRole('button', { name: '数据分析' }));

    await waitFor(() => {
      const textbox = screen.getByRole('textbox');
      expect(textbox).toHaveValue('帮我分析一份销售数据，找出关键趋势');
      expect(textbox).toHaveFocus();
    }, { timeout: 2000 });
  });

  it('无会话时输入框仍可编辑，发送后会自动创建新对话并提交消息', async () => {
    const user = userEvent.setup();
    renderChatPage('/chat');

    const input = screen.getByRole('textbox');
    expect(input).not.toBeDisabled();

    await user.type(input, '直接从欢迎页发起任务');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => {
      expect(useChatStore.getState().sessions.length).toBeGreaterThan(0);
      const nextSessionId = useChatStore.getState().currentSessionId;
      expect(nextSessionId).toBeTruthy();

      const nextMessages = nextSessionId ? useChatStore.getState().messages[nextSessionId] ?? [] : [];
      expect(
        nextMessages.some(
          (message) =>
            message.contentType === 'text' &&
            'text' in message.content &&
            message.content.text === '直接从欢迎页发起任务',
        ),
      ).toBe(true);
    });
  });

  it('通过 skill 查询参数进入时会自动创建会话并预填技能引导文案', async () => {
    renderChatPage('/chat?skill=数据分析师');

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue(
        '请介绍技能「数据分析师」，并告诉我如何在当前工作台中使用它。',
      );
    }, { timeout: 2000 });
  });

  it('会在路由命中已存在会话时自动补远端历史消息', async () => {
    vi.useFakeTimers();
    const { mockOpenClawChatAdapter } = await import('@/services/chatAdapter');
    await mockOpenClawChatAdapter.connect();
    const session = await mockOpenClawChatAdapter.createSession('历史恢复会话');

    await mockOpenClawChatAdapter.sendMessage(session.id, {
      text: '帮我恢复历史',
      requestId: 'req_bootstrap_history',
    });
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });

    renderChatPage(`/chat/${session.id}`);

    await waitFor(() => {
      const sessionMessages = useChatStore.getState().messages[session.id] ?? [];
      expect(
        sessionMessages.some(
          (message) =>
            message.contentType === 'text' &&
            'text' in message.content &&
            message.content.text.includes('帮我恢复历史'),
        ),
      ).toBe(true);
    });
  });

  it('刷新已有会话且历史尚未恢复时，不会短暂闪出欢迎页', async () => {
    const { mockOpenClawChatAdapter } = await import('@/services/chatAdapter');
    const session = await mockOpenClawChatAdapter.createSession('刷新恢复会话');
    const deferredHistory = new Promise<Awaited<ReturnType<typeof mockOpenClawChatAdapter.getHistory>>>(
      () => {
        // 保持 pending，用于验证初始化占位态是否生效。
      },
    );
    const getHistorySpy = vi
      .spyOn(mockOpenClawChatAdapter, 'getHistory')
      .mockReturnValue(deferredHistory);

    useChatStore.setState({
      sessions: [session],
      currentSessionId: null,
      messages: {},
      streamingBuffer: {},
      isConnected: false,
      isSending: false,
      sendingSessionIds: {},
      drafts: {},
    });

    renderChatPage(`/chat/${session.id}`);

    await waitFor(() => {
      expect(screen.getByLabelText('会话初始化中')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: '数据分析' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '载入会话中' })).toBeInTheDocument();

    getHistorySpy.mockRestore();
  });

  it('执行态会让会话级执行状态入口进入运行样式', async () => {
    const sessionId = 'session-running';

    useChatStore.setState({
      sessions: [
        {
          id: sessionId,
          title: '执行中的会话',
          createdAt: Date.now(),
        },
      ],
      currentSessionId: sessionId,
      messages: {
        [sessionId]: [],
      },
    });

    useVisualizeStore.setState({
      runtimeBySession: {
        [sessionId]: {
          state: 'executing',
          detail: '正在执行工作流',
          updatedAt: Date.now(),
          source: 'frontend',
        },
      },
    });

    renderChatPage(`/chat/${sessionId}`);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看当前会话执行状态' })).toHaveAttribute(
        'data-busy',
        'true',
      );
      expect(screen.getByText('工作台处理中')).toBeInTheDocument();
    });
  });

  it('点击头部执行状态入口会直接进入沉浸式工作台', async () => {
    const user = userEvent.setup();
    const sessionId = 'session-open-workbench';

    useChatStore.setState({
      sessions: [
        {
          id: sessionId,
          title: '工作台入口测试',
          createdAt: Date.now(),
        },
      ],
      currentSessionId: sessionId,
      messages: {
        [sessionId]: [],
      },
    });

    renderChatPage(`/chat/${sessionId}`);

    await user.click(screen.getByRole('button', { name: '查看当前会话执行状态' }));

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(true);
    expect(useVisualizeStore.getState().workbenchSessionId).toBe(sessionId);
    expect(await screen.findByText('工作台路由')).toBeInTheDocument();
  });

  it('当前会话处理中时仍可编辑输入框，但不可发送', async () => {
    const sessionId = 'session-editable-while-busy';

    useChatStore.setState({
      sessions: [
        {
          id: sessionId,
          title: '处理中会话',
          createdAt: Date.now(),
        },
      ],
      currentSessionId: sessionId,
      messages: {
        [sessionId]: [],
      },
      drafts: {
        [sessionId]: '等待期间继续准备下一条',
      },
      sendingSessionIds: {
        [sessionId]: true,
      },
    });

    renderChatPage(`/chat/${sessionId}`);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).not.toBeDisabled();
      expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();
    });
  });

  it('发送图片附件后会在会话消息中保留附件消息', async () => {
    const sessionId = 'session-file-send';

    useChatStore.setState({
      sessions: [
        {
          id: sessionId,
          title: '附件会话',
          createdAt: Date.now(),
        },
      ],
      currentSessionId: sessionId,
      messages: {
        [sessionId]: [],
      },
      drafts: {
        [sessionId]: '',
      },
    });

    const { container } = renderChatPage(`/chat/${sessionId}`);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const imageFile = new File(['image-bytes'], 'evidence.png', { type: 'image/png' });

    fireEvent.change(fileInput, {
      target: {
        files: [imageFile],
      },
    });

    expect(screen.getByRole('button', { name: '发送消息' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('已选附件列表')).not.toBeInTheDocument();
      const sessionMessages = useChatStore.getState().messages[sessionId] ?? [];
      expect(
        sessionMessages.some(
          (message) =>
            message.contentType === 'file' &&
            'fileName' in message.content &&
            message.content.fileName === 'evidence.png',
        ),
      ).toBe(true);
    });
  });

  it('流式回复中进入工作台再返回时不会残留错误的 loading 状态', async () => {
    vi.useFakeTimers();
    const sessionId = 'session-workbench-runtime';

    useChatStore.setState({
      sessions: [
        {
          id: sessionId,
          title: '工作台切换回归',
          createdAt: Date.now(),
          messageCount: 0,
        },
      ],
      currentSessionId: sessionId,
      messages: {
        [sessionId]: [],
      },
      drafts: {
        [sessionId]: '',
      },
    });

    render(
      <App>
        <MemoryRouter initialEntries={[`/chat/${sessionId}`]}>
          <ChatRuntimeHost />
          <Routes>
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/visualize/:sessionId" element={<VisualizeRouteBackButton />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '请继续处理这个任务' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    fireEvent.click(screen.getByRole('button', { name: '查看当前会话执行状态' }));

    expect(screen.getByRole('button', { name: '返回聊天测试' })).toBeInTheDocument();

    await vi.runAllTimersAsync();
    fireEvent.click(screen.getByRole('button', { name: '返回聊天测试' }));

    expect(useChatStore.getState().sendingSessionIds[sessionId]).toBeUndefined();
    expect(useVisualizeStore.getState().runtimeBySession[sessionId]?.state).toBe('idle');

    const textbox = screen.getByRole('textbox');
    expect(textbox).not.toBeDisabled();

    fireEvent.change(textbox, {
      target: { value: '继续下一轮任务' },
    });

    expect(screen.getByRole('button', { name: '发送消息' })).not.toBeDisabled();
  });

  it('删除当前会话后会切换到下一个会话，而不是被旧路由补回来', async () => {
    const user = userEvent.setup();
    const sessionA = await (await import('@/services/chatAdapter')).mockOpenClawChatAdapter.createSession(
      '待删除会话',
    );
    const sessionB = await (await import('@/services/chatAdapter')).mockOpenClawChatAdapter.createSession(
      '保留会话',
    );

    useChatStore.setState({
      sessions: [sessionB, sessionA],
      currentSessionId: sessionA.id,
      messages: {
        [sessionA.id]: [],
        [sessionB.id]: [],
      },
    });

    const { container } = renderChatPageWithSidebar(`/chat/${sessionA.id}`);

    const sessionItem = container.querySelector('[class*="itemActive"]') as HTMLElement;
    const menuButton = container.querySelector('[class*="menuBtn"]') as HTMLElement;
    fireEvent.mouseEnter(sessionItem);
    await user.click(menuButton);
    await user.click(await screen.findByText('删除'));
    await user.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(useChatStore.getState().sessions.some((session) => session.id === sessionA.id)).toBe(false);
      expect(useChatStore.getState().currentSessionId).toBe(sessionB.id);
      expect(screen.getByRole('heading', { name: '保留会话' })).toBeInTheDocument();
    });
  });

  it('删除最后一个会话后，不会在稍后被补回空白占位会话', async () => {
    const user = userEvent.setup();
    const session = await (await import('@/services/chatAdapter')).mockOpenClawChatAdapter.createSession(
      '最后一个会话',
    );

    useChatStore.setState({
      sessions: [session],
      currentSessionId: session.id,
      messages: {
        [session.id]: [],
      },
    });

    const { container } = renderChatPageWithSidebar(`/chat/${session.id}`);

    const sessionItem = container.querySelector('[class*="itemActive"]') as HTMLElement;
    const menuButton = container.querySelector('[class*="menuBtn"]') as HTMLElement;
    fireEvent.mouseEnter(sessionItem);
    await user.click(menuButton);
    await user.click(await screen.findByText('删除'));
    await user.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => {
      expect(useChatStore.getState().sessions).toHaveLength(0);
      expect(useChatStore.getState().currentSessionId).toBeNull();
    });

    await waitFor(() => {
      expect(useChatStore.getState().sessions).toHaveLength(0);
    });

    expect(screen.getByRole('button', { name: '数据分析' })).toBeInTheDocument();
  });
});
