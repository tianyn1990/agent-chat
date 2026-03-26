import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { App } from 'antd';
import ChatRuntimeHost from '@/components/Chat/ChatRuntimeHost';
import { mockOpenClawChatAdapter, resetMockChatAdapterRuntime } from '@/services/chatAdapter';
import { useChatStore } from '@/stores/useChatStore';
import { useUserStore } from '@/stores/useUserStore';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

describe('ChatRuntimeHost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockChatAdapterRuntime();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      }),
    );

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

  it('在没有 ChatPage 挂载时仍会消费流式完成事件并清理发送态', async () => {
    render(
      <App>
        <ChatRuntimeHost />
      </App>,
    );

    const session = await mockOpenClawChatAdapter.createSession('runtime-host-test');
    useChatStore.getState().addSession(session);
    useChatStore.getState().setCurrentSession(session.id);
    useChatStore.getState().setSessionSending(session.id, true);

    await mockOpenClawChatAdapter.sendMessage(session.id, {
      text: '你好',
      requestId: 'req_runtime_host',
    });

    await vi.runAllTimersAsync();

    const sessionMessages = useChatStore.getState().messages[session.id] ?? [];
    expect(sessionMessages.some((message) => message.role === 'assistant')).toBe(true);
    expect(useChatStore.getState().sendingSessionIds[session.id]).toBeUndefined();
    expect(useVisualizeStore.getState().runtimeBySession[session.id]?.state).toBe('idle');
  });
});
