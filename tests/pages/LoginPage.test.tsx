import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAT_RUNTIME_REQUIRES_LOGIN } from '@/constants';
import LoginPage from '@/pages/Login';
import { useUserStore } from '@/stores/useUserStore';

const navigateMock = vi.fn();

function makeValidToken() {
  const payload = btoa(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  );

  return `header.${payload}.signature`;
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({
      pathname: '/login',
      search: '',
      hash: '',
      state: { from: '/chat/session_login' },
      key: 'login-test',
    }),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useUserStore.setState({
      token: null,
      userInfo: null,
      isLoading: false,
    });
  });

  it('展示品牌化登录文案与入口按钮', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Paper Ops Workspace')).toBeInTheDocument();
    expect(screen.getByText(/把对话、技能与执行状态放进同一张工作台/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: CHAT_RUNTIME_REQUIRES_LOGIN ? /登录/ : /进入开发工作台/,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('已存在有效 token 时自动跳回原始页面', () => {
    useUserStore.setState({
      token: makeValidToken(),
      userInfo: { id: 'u1', name: '张三', avatar: '', department: '研发' },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(navigateMock).toHaveBeenCalledWith('/chat/session_login', { replace: true });
  });
});
