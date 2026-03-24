import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillCard from '../SkillCard';
import type { Skill } from '@/types/skill';

const mockSkill: Skill = {
  id: 'skill_test',
  name: '测试技能',
  description: '这是一个测试技能的描述',
  icon: '🧪',
  category: 'data_analysis',
  version: '1.0.0',
  author: 'Test Author',
  installed: false,
  features: ['功能1', '功能2'],
  tags: ['测试', '示例'],
};

describe('SkillCard', () => {
  it('应该正确渲染技能信息', () => {
    render(<SkillCard skill={mockSkill} />);

    expect(screen.getByText('测试技能')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试技能的描述')).toBeInTheDocument();
    expect(screen.getByText('🧪')).toBeInTheDocument();
    expect(screen.getByText('数据分析')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('应该显示"安装"按钮（未安装状态）', () => {
    render(<SkillCard skill={mockSkill} />);

    const installButton = screen.getByRole('button', { name: /安\s*装/ });
    expect(installButton).toBeInTheDocument();
  });

  it('应该显示"卸载"按钮和已安装标识（已安装状态）', () => {
    const installedSkill = { ...mockSkill, installed: true };
    render(<SkillCard skill={installedSkill} />);

    expect(screen.getByRole('button', { name: /卸\s*载/ })).toBeInTheDocument();
    expect(screen.getByText('已安装')).toBeInTheDocument();
  });

  it('应该在点击卡片时触发 onClick 回调', () => {
    const onClick = vi.fn();
    render(<SkillCard skill={mockSkill} onClick={onClick} />);

    // 卡片现在是 div，通过技能名称找到卡片容器
    const card = screen.getByText('测试技能').closest('[class*="card"]');
    fireEvent.click(card!);

    expect(onClick).toHaveBeenCalledWith(mockSkill);
  });

  it('应该在点击安装按钮时触发 onInstallClick 回调', () => {
    const onInstallClick = vi.fn();
    render(<SkillCard skill={mockSkill} onInstallClick={onInstallClick} />);

    const installButton = screen.getByRole('button', { name: /安\s*装/ });
    fireEvent.click(installButton);

    expect(onInstallClick).toHaveBeenCalledWith(mockSkill);
  });

  it('安装按钮点击不应触发卡片点击事件', () => {
    const onClick = vi.fn();
    const onInstallClick = vi.fn();
    render(<SkillCard skill={mockSkill} onClick={onClick} onInstallClick={onInstallClick} />);

    const installButton = screen.getByRole('button', { name: /安\s*装/ });
    fireEvent.click(installButton);

    expect(onInstallClick).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('应该显示 loading 状态', () => {
    render(<SkillCard skill={mockSkill} loading={true} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('ant-btn-loading');
  });
});
