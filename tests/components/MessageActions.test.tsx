import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageActions from '@/components/Chat/MessageActions';
import { useVisualizeStore } from '@/stores/useVisualizeStore';
import type { Message } from '@/types/message';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function makeMessage(): Message {
  return {
    id: 'msg_action_1',
    sessionId: 'session_action_1',
    role: 'assistant',
    contentType: 'text',
    content: { text: '执行状态测试消息' },
    status: 'done',
    timestamp: Date.now(),
  };
}

describe('MessageActions', () => {
  beforeEach(() => {
    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
      runtimeBySession: {},
    });

    vi.restoreAllMocks();
  });

  it('复制成功时提示成功消息', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(
      <App>
        <MemoryRouter>
          <MessageActions message={makeMessage()} copyText="可复制内容" />
        </MemoryRouter>
      </App>,
    );

    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(writeText).toHaveBeenCalledWith('可复制内容');
    expect(await screen.findByText('已复制消息内容')).toBeInTheDocument();
  });

  it('clipboard 失败时回退到 execCommand 复制', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const execCommand = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    render(
      <App>
        <MemoryRouter>
          <MessageActions message={makeMessage()} copyText="可复制内容" />
        </MemoryRouter>
      </App>,
    );

    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(writeText).toHaveBeenCalledWith('可复制内容');
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByText('已复制消息内容')).toBeInTheDocument();
  });

  it('点击查看执行状态后直接进入沉浸式工作台', async () => {
    const user = userEvent.setup();

    render(
      <App>
        <MemoryRouter initialEntries={['/chat/session_action_1']}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <MessageActions message={makeMessage()} copyText="可复制内容" />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    await user.click(screen.getByRole('button', { name: '查看执行状态' }));

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(true);
    expect(useVisualizeStore.getState().workbenchSessionId).toBe('session_action_1');
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/visualize/session_action_1');
  });
});
