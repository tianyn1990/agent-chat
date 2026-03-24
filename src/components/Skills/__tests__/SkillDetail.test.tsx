import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SkillDetail from '../SkillDetail';
import type { Skill } from '@/types/skill';

const mockSkill: Skill = {
  id: 'skill_test',
  name: '测试技能',
  description: '这是一个测试技能的完整描述',
  icon: '🧪',
  category: 'code',
  version: '2.0.0',
  author: 'Test Team',
  homepage: 'https://example.com',
  installed: false,
  features: ['功能特性1', '功能特性2', '功能特性3'],
  tags: ['测试', '示例', 'demo'],
};

// 包装组件以提供 Router 上下文
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SkillDetail', () => {
  it('关闭状态时不应渲染内容', () => {
    const { container } = renderWithRouter(
      <SkillDetail skill={mockSkill} open={false} onClose={vi.fn()} />,
    );

    expect(container.querySelector('.ant-drawer')).not.toBeInTheDocument();
  });

  it('打开状态时应渲染技能详情', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByText('测试技能')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试技能的完整描述')).toBeInTheDocument();
    expect(screen.getByText('🧪')).toBeInTheDocument();
  });

  it('应该显示技能的基本信息', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByText(/版本: 2\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/作者: Test Team/)).toBeInTheDocument();
    expect(screen.getByText('代码工具')).toBeInTheDocument();
  });

  it('应该显示功能特性列表', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByText('✨ 主要功能')).toBeInTheDocument();
    expect(screen.getByText(/功能特性1/)).toBeInTheDocument();
    expect(screen.getByText(/功能特性2/)).toBeInTheDocument();
    expect(screen.getByText(/功能特性3/)).toBeInTheDocument();
  });

  it('应该显示标签', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByText('🏷️ 标签')).toBeInTheDocument();
    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(screen.getByText('示例')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
  });

  it('应该显示主页链接', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('未安装状态应显示"安装"按钮', () => {
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /安\s*装/ })).toBeInTheDocument();
  });

  it('已安装状态应显示"卸载"和"在对话中使用"按钮', () => {
    const installedSkill = { ...mockSkill, installed: true };
    renderWithRouter(<SkillDetail skill={installedSkill} open={true} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /卸\s*载/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /在对话中使用/ })).toBeInTheDocument();
  });

  it('应该在点击关闭按钮时触发 onClose', () => {
    const onClose = vi.fn();
    renderWithRouter(<SkillDetail skill={mockSkill} open={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('应该在点击安装按钮时触发 onInstallClick', () => {
    const onInstallClick = vi.fn();
    renderWithRouter(
      <SkillDetail
        skill={mockSkill}
        open={true}
        onClose={vi.fn()}
        onInstallClick={onInstallClick}
      />,
    );

    // Ant Design 按钮文本可能有空格分隔
    const installButton = screen.getByRole('button', { name: /安\s*装/ });
    fireEvent.click(installButton);

    expect(onInstallClick).toHaveBeenCalledWith(mockSkill);
  });

  it('应该显示 loading 状态', () => {
    renderWithRouter(
      <SkillDetail skill={mockSkill} open={true} onClose={vi.fn()} loading={true} />,
    );

    // loading 状态下按钮文本会有空格分隔，使用正则匹配
    const button = screen.getByRole('button', { name: /安\s*装/ });
    expect(button).toHaveClass('ant-btn-loading');
  });

  it('skill 为 null 时不应渲染', () => {
    const { container } = renderWithRouter(
      <SkillDetail skill={null} open={true} onClose={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
