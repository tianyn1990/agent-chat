import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeScreen from '@/components/Chat/WelcomeScreen';
import { useUserStore } from '@/stores/useUserStore';

describe('WelcomeScreen', () => {
  it('未登录时显示默认称呼"同学"', () => {
    useUserStore.setState({ userInfo: null, token: null });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /你好，同学/ })).toBeInTheDocument();
  });

  it('已登录时显示用户姓名', () => {
    useUserStore.setState({
      userInfo: { id: '1', name: '张三', avatar: '', department: '研发部' },
      token: 'fake_token',
    });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /你好，张三/ })).toBeInTheDocument();
  });

  it('渲染快捷提问建议卡片', () => {
    useUserStore.setState({ userInfo: null, token: null });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);

    expect(screen.getByText('Agent Console')).toBeInTheDocument();
    expect(screen.getByText(/今天准备推进什么工作/)).toBeInTheDocument();

    // quick chip 与 suggestion card 都会复用标题，因此这里只校验快捷按钮行
    expect(screen.getByRole('button', { name: '数据分析' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '写作助手' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '代码助手' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '常用功能' })).toBeInTheDocument();
  });

  it('点击建议卡片触发回调并传入对应文本', () => {
    useUserStore.setState({ userInfo: null, token: null });
    const mockCallback = vi.fn();
    render(<WelcomeScreen onSuggestionClick={mockCallback} />);

    // 点击顶部 quick chip，确保回调仍然传出完整建议文本
    fireEvent.click(screen.getByRole('button', { name: '数据分析' }));

    // 回调应被调用，传入对应的提问文本
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      expect.stringContaining('销售数据'),
    );
  });
});
