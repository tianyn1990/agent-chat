import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserInfo from '@/components/Layout/UserInfo';
import { useUserStore } from '@/stores/useUserStore';

describe('UserInfo', () => {
  beforeEach(() => {
    useUserStore.setState({
      token: 'token-user-info',
      userInfo: {
        id: 'user_001',
        name: '田亚楠',
        avatar: '',
        department: '研发',
      },
      isLoading: false,
      logout: vi.fn(),
    });
  });

  it('紧凑模式下点击头像打开菜单时会关闭悬浮气泡', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <UserInfo compact />
      </MemoryRouter>,
    );

    await user.hover(screen.getByRole('img', { name: 'user' }));
    expect(await screen.findByText('田亚楠 · 研发')).toBeInTheDocument();

    await user.click(screen.getByRole('img', { name: 'user' }));

    expect(await screen.findByText('退出登录')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('田亚楠 · 研发')).not.toBeInTheDocument();
    });
  });
});
