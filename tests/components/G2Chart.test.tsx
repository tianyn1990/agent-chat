import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import G2Chart from '@/components/Chart/G2Chart';
import type { G2ChartPayload } from '@/types/chart';

const renderMock = vi.fn(async () => undefined);
const destroyMock = vi.fn();
const optionsMock = vi.fn();

vi.mock('@antv/g2', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    options: optionsMock,
    render: renderMock,
    destroy: destroyMock,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('点击全屏按钮会切换为全屏模式', async () => {
    render(<G2Chart payload={payload} />);

    const fullscreenButton = await screen.findByRole('button', { name: '全屏查看图表' });
    fireEvent.click(fullscreenButton);

    expect(await screen.findByRole('button', { name: '退出全屏查看图表' })).toBeInTheDocument();
  });
});
