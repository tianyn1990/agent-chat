import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionItem from '@/components/Chat/SessionItem';
import type { Session } from '@/types/session';

/** 创建测试用会话对象 */
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session_001',
    title: '测试会话',
    createdAt: Date.now(),
    messageCount: 3,
    lastMessage: '最后一条消息',
    ...overrides,
  };
}

describe('SessionItem', () => {
  const mockOnClick = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常渲染会话标题', () => {
    render(
      <SessionItem
        session={makeSession()}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText('测试会话')).toBeInTheDocument();
  });

  it('显示最后一条消息摘要', () => {
    render(
      <SessionItem
        session={makeSession({ lastMessage: '这是最后一条' })}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );
    expect(screen.getByText('这是最后一条')).toBeInTheDocument();
  });

  it('点击时触发 onClick 回调', () => {
    render(
      <SessionItem
        session={makeSession()}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );
    fireEvent.click(screen.getByText('测试会话'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('isActive=true 时添加激活样式', () => {
    const { container } = render(
      <SessionItem
        session={makeSession()}
        isActive={true}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );
    // 激活态的容器类名包含 Active
    const item = container.firstChild as HTMLElement;
    expect(item.className).toMatch(/Active/);
  });

  it('双击进入重命名编辑状态', async () => {
    render(
      <SessionItem
        session={makeSession()}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );

    // 双击标题触发重命名模式
    fireEvent.dblClick(screen.getByText('测试会话').closest('div[class]')!);

    // 编辑框应该出现
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('重命名编辑后按 Enter 确认', async () => {
    const user = userEvent.setup();
    render(
      <SessionItem
        session={makeSession({ title: '原始标题' })}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );

    // 触发双击进入编辑
    fireEvent.dblClick(screen.getByText('原始标题').closest('div[class]')!);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // 清空并输入新标题
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '新标题');
    await user.keyboard('{Enter}');

    expect(mockOnRename).toHaveBeenCalledWith('新标题');
  });

  it('重命名编辑后按 Escape 取消', async () => {
    const user = userEvent.setup();
    render(
      <SessionItem
        session={makeSession({ title: '原始标题' })}
        isActive={false}
        onClick={mockOnClick}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.dblClick(screen.getByText('原始标题').closest('div[class]')!);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Escape 取消，不应调用 onRename
    await user.keyboard('{Escape}');
    expect(mockOnRename).not.toHaveBeenCalled();

    // 编辑框应该消失
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });
});
