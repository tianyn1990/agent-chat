import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import Sidebar from '@/components/Layout/Sidebar';
import { useThemeStore } from '@/stores/useThemeStore';
import { useUserStore } from '@/stores/useUserStore';

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setMode('dark');
    useUserStore.setState({
      token: 'test-token',
      userInfo: {
        id: 'user_sidebar',
        name: '田亚楠',
        avatar: '',
        department: '研发',
      },
      isLoading: false,
    });
  });

  it('在聊天页展示可折叠的会话档案面板', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat/session_sidebar']}>
        <Sidebar extra={<div>会话插槽内容</div>} />
      </MemoryRouter>,
    );

    expect(screen.getByText('会话档案')).toBeInTheDocument();
    expect(screen.getByText('会话插槽内容')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '收起档案面板' }));

    expect(screen.queryByText('会话插槽内容')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '展开档案面板' })).toBeInTheDocument();
  });

  it('在非聊天页不展示多余的二级面板按钮', () => {
    render(
      <MemoryRouter initialEntries={['/skills']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: '收起档案面板' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展开档案面板' })).not.toBeInTheDocument();
  });

  it('提供全局主题切换入口，并会更新根节点主题状态', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/chat/session_sidebar']}>
        <Sidebar extra={<div>会话插槽内容</div>} />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole('button', { name: '切换到明亮皮肤' });
    // 图标表达当前主题状态，避免按钮文案和视觉状态出现理解错位。
    expect(toggleButton.querySelector('[aria-label="moon"]')).toBeInTheDocument();

    await user.click(toggleButton);

    expect(document.documentElement.dataset.theme).toBe('light');
    const updatedToggleButton = screen.getByRole('button', { name: '切换到深色皮肤' });
    expect(updatedToggleButton).toBeInTheDocument();
    expect(updatedToggleButton.querySelector('[aria-label="sun"]')).toBeInTheDocument();
  });
});
