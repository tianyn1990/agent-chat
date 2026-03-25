import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import SessionWorkbenchEntry from '@/components/Visualize/SessionWorkbenchEntry';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

describe('SessionWorkbenchEntry', () => {
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

  it('没有会话时展示禁用入口', () => {
    render(
      <MemoryRouter>
        <SessionWorkbenchEntry sessionId={null} runtime={null} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '执行状态暂不可用' })).toBeDisabled();
    expect(screen.getByText('工作台暂不可用')).toBeInTheDocument();
  });

  it('点击会话级入口会打开工作台并跳转到对应路由', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat/session_entry']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <SessionWorkbenchEntry
                  sessionId="session_entry"
                  runtime={{
                    state: 'idle',
                    detail: '等待处理',
                    updatedAt: Date.now(),
                    source: 'frontend',
                  }}
                />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: '查看当前会话执行状态' }));

    expect(useVisualizeStore.getState().isWorkbenchVisible).toBe(true);
    expect(useVisualizeStore.getState().workbenchSessionId).toBe('session_entry');
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/visualize/session_entry');
  });

  it('warming 状态下展示进入中的运行样式', () => {
    useVisualizeStore.getState().ensureWorkbenchSession('session_warming');
    useVisualizeStore.getState().markWorkbenchLoading('session_warming');

    render(
      <MemoryRouter>
        <SessionWorkbenchEntry
          sessionId="session_warming"
          runtime={{
            state: 'idle',
            detail: '等待中',
            updatedAt: Date.now(),
            source: 'frontend',
          }}
        />
      </MemoryRouter>,
    );

    const entry = screen.getByRole('button', { name: '查看当前会话执行状态' });
    expect(entry).toHaveAttribute('data-tone', 'running');
    expect(entry).toHaveAttribute('data-busy', 'true');
    expect(screen.getByText('正在进入工作台')).toBeInTheDocument();
  });

  it('使用像素显示器 SVG 作为会话级入口图标', () => {
    render(
      <MemoryRouter>
        <SessionWorkbenchEntry
          sessionId="session_icon"
          runtime={{
            state: 'idle',
            detail: '等待中',
            updatedAt: Date.now(),
            source: 'frontend',
          }}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: '查看当前会话执行状态' });
    const svg = button.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 18 18');
  });
});
