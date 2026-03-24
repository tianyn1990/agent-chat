import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import VisualizeWorkbenchFrame from '@/components/Visualize/VisualizeWorkbenchFrame';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

describe('VisualizeWorkbenchFrame', () => {
  beforeEach(() => {
    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
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
});
