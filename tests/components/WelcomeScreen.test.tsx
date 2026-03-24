import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeScreen from '@/components/Chat/WelcomeScreen';
import { useUserStore } from '@/stores/useUserStore';

describe('WelcomeScreen', () => {
  it('未登录时显示默认称呼"同学"', () => {
    useUserStore.setState({ userInfo: null, token: null });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);
    expect(screen.getByText('你好，同学')).toBeInTheDocument();
  });

  it('已登录时显示用户姓名', () => {
    useUserStore.setState({
      userInfo: { id: '1', name: '张三', avatar: '', department: '研发部' },
      token: 'fake_token',
    });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);
    expect(screen.getByText('你好，张三')).toBeInTheDocument();
  });

  it('渲染快捷提问建议卡片', () => {
    useUserStore.setState({ userInfo: null, token: null });
    render(<WelcomeScreen onSuggestionClick={vi.fn()} />);

    // 应该有 4 个建议卡片
    expect(screen.getByText('数据分析')).toBeInTheDocument();
    expect(screen.getByText('写作助手')).toBeInTheDocument();
    expect(screen.getByText('代码助手')).toBeInTheDocument();
    expect(screen.getByText('常用功能')).toBeInTheDocument();
  });

  it('点击建议卡片触发回调并传入对应文本', () => {
    useUserStore.setState({ userInfo: null, token: null });
    const mockCallback = vi.fn();
    render(<WelcomeScreen onSuggestionClick={mockCallback} />);

    // 点击"数据分析"卡片
    fireEvent.click(screen.getByText('数据分析').closest('button')!);

    // 回调应被调用，传入对应的提问文本
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(
      expect.stringContaining('销售数据'),
    );
  });
});
