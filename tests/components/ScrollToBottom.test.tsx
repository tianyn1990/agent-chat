import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ScrollToBottom from '@/components/Chat/ScrollToBottom';

describe('ScrollToBottom', () => {
  it('不可见时不渲染按钮', () => {
    const { container } = render(<ScrollToBottom visible={false} onClick={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('普通定位模式下展示回到底部入口', () => {
    render(<ScrollToBottom visible onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: '回到最新消息' })).toHaveAttribute(
      'data-has-new-message',
      'false',
    );
    expect(screen.queryByText('新消息')).not.toBeInTheDocument();
  });

  it('收到新消息时展示强化提示并响应点击', () => {
    const onClick = vi.fn();
    render(<ScrollToBottom visible hasNewMessage onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '回到底部查看新消息' }));

    expect(screen.getByText('新消息')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
