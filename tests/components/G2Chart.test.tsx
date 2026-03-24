import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import G2Chart from '@/components/Chart/G2Chart';
import type { G2ChartPayload } from '@/types/chart';

const renderMock = vi.fn(async () => undefined);
const destroyMock = vi.fn();
const optionsMock = vi.fn();
const changeSizeMock = vi.fn();

vi.mock('@antv/g2', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    options: optionsMock,
    render: renderMock,
    destroy: destroyMock,
    changeSize: changeSizeMock,
  })),
}));

describe('G2Chart', () => {
  const payload: G2ChartPayload = {
    spec: {
      type: 'line',
      data: { value: [{ month: '1月', value: 12 }] },
      encode: { x: 'month', y: 'value' },
    },
    exportable: true,
  };

  beforeEach(() => {
    renderMock.mockClear();
    destroyMock.mockClear();
    optionsMock.mockClear();
    changeSizeMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('点击全屏按钮会切换为全屏模式', async () => {
    const requestFullscreenMock = vi.fn(async () => undefined);

    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    });

    render(<G2Chart payload={payload} />);

    const fullscreenButton = await screen.findByRole('button', { name: '全屏查看图表' });
    fireEvent.click(fullscreenButton);

    expect(requestFullscreenMock).toHaveBeenCalled();
  });
});
