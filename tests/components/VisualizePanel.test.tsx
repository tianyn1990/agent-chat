import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import VisualizePanel from '@/components/Visualize/VisualizePanel';
import { useVisualizeStore } from '@/stores/useVisualizeStore';

describe('VisualizePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useVisualizeStore.setState({
      isPanelOpen: false,
      panelSessionId: null,
      panelMessageId: null,
      isWorkbenchVisible: false,
      workbenchSessionId: null,
      runtimeBySession: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('展示轻量恢复提示并在短时间后自动关闭', () => {
    useVisualizeStore.getState().openPanel('session_auto_close');

    const { queryByLabelText } = render(
      <MemoryRouter>
        <VisualizePanel />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('执行状态轻量提示')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(queryByLabelText('执行状态轻量提示')).not.toBeInTheDocument();
    expect(useVisualizeStore.getState().isPanelOpen).toBe(false);
  });
});
