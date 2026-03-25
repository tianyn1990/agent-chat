import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VisualizeWorkbenchHost from '@/components/Visualize/VisualizeWorkbenchHost';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

vi.mock('@/components/Visualize/VisualizeWorkbenchFrame', () => ({
  default: ({ sessionId, visible }: { sessionId: string | null; visible: boolean }) => (
    <div data-testid={`workbench-frame-${sessionId}`} data-visible={visible ? 'true' : 'false'} />
  ),
}));

describe('VisualizeWorkbenchHost', () => {
  beforeEach(() => {
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

  it('在聊天路由下会静默预热当前会话的工作台', () => {
    render(
      <MemoryRouter initialEntries={['/chat/session_prewarm']}>
        <Routes>
          <Route path="*" element={<VisualizeWorkbenchHost />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useVisualizeStore.getState().workbenchCacheSessionIds).toEqual(['session_prewarm']);
    expect(screen.getByTestId('workbench-frame-session_prewarm')).toHaveAttribute(
      'data-visible',
      'false',
    );
  });

  it('在 visualize 路由下会显示对应工作台并沿用缓存', () => {
    useVisualizeStore.getState().ensureWorkbenchSession('session_cached');

    render(
      <MemoryRouter initialEntries={['/visualize/session_cached']}>
        <Routes>
          <Route path="*" element={<VisualizeWorkbenchHost />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(true);
    expect(useVisualizeStore.getState().workbenchSessionId).toBe('session_cached');
    expect(screen.getByTestId('workbench-frame-session_cached')).toHaveAttribute(
      'data-visible',
      'true',
    );
  });
});
