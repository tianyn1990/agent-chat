import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from '@/components/Auth/AuthGuard';
import { useUserStore } from '@/stores/useUserStore';

/** 生成有效的 Mock JWT */
function makeValidToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'test', exp }));
  return `${header}.${payload}.sig`;
}

// token prop 已移除，TestApp 直接从 store 读取状态
function TestApp() {
  return (
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>登录页</div>} />
        <Route
          path="/protected"
          element={
            <AuthGuard>
              <div>受保护页面</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    useUserStore.setState({ userInfo: null, token: null });
    localStorage.clear();
  });

  it('未登录时重定向到登录页', () => {
    useUserStore.setState({ token: null });
    render(<TestApp />);
    expect(screen.getByText('登录页')).toBeInTheDocument();
  });

  it('已登录时渲染子组件', () => {
    const token = makeValidToken();
    useUserStore.setState({ token });
    localStorage.setItem('oc_token', token);

    render(<TestApp />);
    expect(screen.getByText('受保护页面')).toBeInTheDocument();
  });
});
