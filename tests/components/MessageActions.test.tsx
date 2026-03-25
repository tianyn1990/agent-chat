import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MessageActions from '@/components/Chat/MessageActions';

describe('MessageActions', () => {
  beforeEach(() => {
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
          <MessageActions copyText="可复制内容" />
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
          <MessageActions copyText="可复制内容" />
        </MemoryRouter>
      </App>,
    );

    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(writeText).toHaveBeenCalledWith('可复制内容');
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(await screen.findByText('已复制消息内容')).toBeInTheDocument();
  });

  it('消息级操作区不再展示执行状态主入口', () => {
    render(
      <App>
        <MemoryRouter>
          <MessageActions copyText="可复制内容" />
        </MemoryRouter>
      </App>,
    );

    expect(screen.queryByRole('button', { name: '查看执行状态' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制' })).toBeInTheDocument();
  });
});
