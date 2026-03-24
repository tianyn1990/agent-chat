import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from '@/components/Chat/MessageInput';

describe('MessageInput', () => {
  const mockOnChange = vi.fn();
  const mockOnSend = vi.fn();
  const mockOnFilesChange = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    files: [],
    onFilesChange: mockOnFilesChange,
    onSend: mockOnSend,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染输入框和发送按钮', () => {
    render(<MessageInput {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送消息' })).toBeInTheDocument();
  });

  it('输入时触发 onChange 回调', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} />);

    const input = screen.getByRole('textbox');
    await user.type(input, '你好');

    // onChange 被调用
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('value 为空时发送按钮禁用', () => {
    render(<MessageInput {...defaultProps} value="" />);
    const btn = screen.getByRole('button', { name: '发送消息' });
    expect(btn).toBeDisabled();
  });

  it('value 不为空时发送按钮可用', () => {
    render(<MessageInput {...defaultProps} value="有内容" />);
    const btn = screen.getByRole('button', { name: '发送消息' });
    expect(btn).not.toBeDisabled();
  });

  it('disabled=true 时发送按钮禁用', () => {
    render(<MessageInput {...defaultProps} value="有内容" disabled={true} />);
    const btn = screen.getByRole('button', { name: '发送消息' });
    expect(btn).toBeDisabled();
  });

  it('点击发送按钮触发 onSend', () => {
    render(<MessageInput {...defaultProps} value="测试消息" />);
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('按 Enter 键触发 onSend', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} value="回车发送" />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  it('按 Shift+Enter 不触发 onSend（换行用）', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} value="不发送" />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('显示附件上传按钮', () => {
    render(<MessageInput {...defaultProps} />);
    expect(screen.getByRole('button', { name: '上传文件' })).toBeInTheDocument();
  });

  it('有附件时在输入区内显示附件预览', () => {
    const file = new File(['hello'], 'report.txt', { type: 'text/plain' });
    render(
      <MessageInput
        {...defaultProps}
        files={[
          {
            localId: 'local_file_1',
            file,
            fileId: 'mock_file_1',
          },
        ]}
      />,
    );

    expect(screen.getByText('report.txt')).toBeInTheDocument();
    expect(screen.getByText(/5 B/i)).toBeInTheDocument();
  });

  it('使用自定义 placeholder', () => {
    render(<MessageInput {...defaultProps} placeholder="自定义提示文字" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', '自定义提示文字');
  });

  it('超过 80% 字数限制时显示字数统计', () => {
    const longText = 'a'.repeat(3500); // 超过 4000*0.8=3200
    render(<MessageInput {...defaultProps} value={longText} />);
    // 字数统计应该出现
    expect(screen.getByText(`${longText.length}/4000`)).toBeInTheDocument();
  });
});
