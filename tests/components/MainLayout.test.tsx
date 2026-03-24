import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import MainLayout from '@/components/Layout/MainLayout';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useUserStore } from '@/stores/useUserStore';

describe('MainLayout', () => {
  beforeEach(() => {
    // 为侧边栏提供稳定的用户信息，避免测试受登录态缺失影响。
    useUserStore.setState({
      token: 'layout-token',
      userInfo: {
        id: 'user-layout',
        name: '田亚楠',
        avatar: '',
        department: '研发',
      },
      isLoading: false,
    });

    // 使用 store 注入聊天页附属上下文，验证主布局仍能承接 rail + panel + content 结构。
    useSidebarStore.setState({
      extraContent: <div>侧边栏附属上下文</div>,
      setExtraContent: useSidebarStore.getState().setExtraContent,
    });
  });

  it('会同时渲染侧边栏插槽内容与主内容区 Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="chat" element={<div>主舞台内容</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('侧边栏附属上下文')).toBeInTheDocument();
    expect(screen.getByText('主舞台内容')).toBeInTheDocument();
    expect(screen.getByText('会话档案')).toBeInTheDocument();
  });
});
