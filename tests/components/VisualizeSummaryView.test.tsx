import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import VisualizeSummaryView from '@/components/Visualize/VisualizeSummaryView';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

describe('VisualizeSummaryView', () => {
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

  it('展示会话摘要信息', () => {
    useVisualizeStore.getState().setSessionRuntime('session_summary', {
      state: 'writing',
      detail: '正在生成工作台摘要',
      updatedAt: Date.now(),
      source: 'frontend',
    });

    render(
      <MemoryRouter initialEntries={['/chat/session_summary']}>
        <VisualizeSummaryView sessionId="session_summary" />
      </MemoryRouter>,
    );

    expect(screen.getByText('执行状态')).toBeInTheDocument();
    expect(screen.getByText(/会话：session_summary/)).toBeInTheDocument();
    expect(screen.getByText('生成中')).toBeInTheDocument();
    expect(screen.getByText('正在生成工作台摘要')).toBeInTheDocument();
  });

  it('点击恢复工作台后跳转并打开工作台状态', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat/session_jump']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <VisualizeSummaryView sessionId="session_jump" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: '恢复执行状态工作台' }));

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(true);
    expect(useVisualizeStore.getState().workbenchSessionId).toBe('session_jump');
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/visualize/session_jump');
  });
});
