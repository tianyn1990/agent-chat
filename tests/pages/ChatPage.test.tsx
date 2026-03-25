import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { App } from 'antd';
import userEvent from '@testing-library/user-event';
import ChatPage from '@/pages/Chat';
import { useChatStore } from '@/stores/useChatStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import { useUserStore } from '@/stores/useUserStore';
import { mockWsService } from '@/mocks/websocket';

function renderChatPage(initialEntry = '/chat') {
  return render(
    <App>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    </App>,
  );
}

describe('ChatPage', () => {
  beforeEach(() => {
    mockWsService.reset();
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
      runtimeBySession: {},
      openPanel: useVisualizeStore.getState().openPanel,
      closePanel: useVisualizeStore.getState().closePanel,
      openWorkbench: useVisualizeStore.getState().openWorkbench,
      hideWorkbench: useVisualizeStore.getState().hideWorkbench,
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
    mockWsService.reset();
  });

  it('首次点击欢迎页快捷建议时会自动创建会话并预填输入内容', async () => {
    renderChatPage('/chat');

    fireEvent.click(screen.getByRole('button', { name: '数据分析' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('帮我分析一份销售数据，找出关键趋势');
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

  it('执行态会让右上角状态胶囊进入运行样式', async () => {
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
      expect(screen.getByLabelText('当前执行状态：执行中')).toHaveAttribute('data-running', 'true');
    });
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
});
