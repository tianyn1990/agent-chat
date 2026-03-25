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

  it('仅有附件时发送按钮也可用', () => {
    const file = new File(['binary'], 'image.png', { type: 'image/png' });

    render(
      <MessageInput
        {...defaultProps}
        value=""
        files={[
          {
            localId: 'local_file_image',
            file,
            fileId: 'mock_file_image',
            previewUrl: 'blob:image-preview',
            downloadUrl: 'blob:image-preview',
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: '发送消息' })).not.toBeDisabled();
  });

  it('disabled=true 时输入框与发送按钮都禁用', () => {
    render(<MessageInput {...defaultProps} value="有内容" disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    const btn = screen.getByRole('button', { name: '发送消息' });
    expect(btn).toBeDisabled();
  });

  it('sendDisabled=true 时仍可编辑，但不可发送', async () => {
    const user = userEvent.setup();
    render(<MessageInput {...defaultProps} value="准备中的消息" sendDisabled />);

    const input = screen.getByRole('textbox');
    const btn = screen.getByRole('button', { name: '发送消息' });

    expect(input).not.toBeDisabled();
    expect(btn).toBeDisabled();

    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockOnSend).not.toHaveBeenCalled();
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

  it('IME 组合输入期间按 Enter 不触发发送', () => {
    render(<MessageInput {...defaultProps} value="wolijie" />);

    const input = screen.getByRole('textbox');

    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('IME 组合输入结束后按 Enter 可正常发送', () => {
    render(<MessageInput {...defaultProps} value="我理解" />);

    const input = screen.getByRole('textbox');

    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

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

  it('有附件时在输入区上方显示独立附件预览条带', () => {
    const file = new File(['hello'], 'report.txt', { type: 'text/plain' });
    const { container } = render(
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

    const attachmentList = screen.getByLabelText('已选附件列表');
    const textarea = screen.getByRole('textbox');

    expect(screen.getByText('report.txt')).toBeInTheDocument();
    expect(screen.getByText(/5 B/i)).toBeInTheDocument();
    expect(
      attachmentList.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelector('[class*="inputRow"]')).toBeInTheDocument();
  });

  it('图片附件在发送前支持预览入口和下载入口', () => {
    const file = new File(['image-bytes'], 'preview.png', { type: 'image/png' });

    render(
      <MessageInput
        {...defaultProps}
        files={[
          {
            localId: 'local_preview_image',
            file,
            fileId: 'mock_preview_image',
            previewUrl: 'blob:preview-image',
            downloadUrl: 'blob:preview-image',
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: '预览图片 preview.png' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '下载图片 preview.png' })).toHaveAttribute(
      'download',
      'preview.png',
    );
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

  it('发送或切换后清空草稿时会恢复为单行高度', () => {
    const { rerender } = render(<MessageInput {...defaultProps} value="第一行\n第二行" />);
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;

    Object.defineProperty(input, 'scrollHeight', {
      configurable: true,
      value: 88,
    });

    fireEvent.change(input, {
      target: {
        value: '第一行\n第二行',
      },
    });

    expect(input.style.height).toBe('88px');

    Object.defineProperty(input, 'scrollHeight', {
      configurable: true,
      value: 0,
    });

    rerender(<MessageInput {...defaultProps} value="" />);

    expect(input.style.height).toBe('22px');
  });
});
