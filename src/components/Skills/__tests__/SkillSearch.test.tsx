import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillSearch from '../SkillSearch';

describe('SkillSearch', () => {
  it('应该正确渲染搜索框', () => {
    const onChange = vi.fn();
    render(<SkillSearch value="" onChange={onChange} />);

    const input = screen.getByRole('textbox', { name: '搜索技能' });
    expect(input).toBeInTheDocument();
  });

  it('应该补齐无障碍标签', () => {
    const onChange = vi.fn();
    render(<SkillSearch value="" onChange={onChange} />);

    expect(screen.getByLabelText('搜索技能')).toBeInTheDocument();
  });

  it('应该显示自定义占位文本', () => {
    const onChange = vi.fn();
    render(<SkillSearch value="" onChange={onChange} placeholder="自定义占位符" />);

    expect(screen.getByPlaceholderText('自定义占位符')).toBeInTheDocument();
  });

  it('应该显示当前搜索值', () => {
    const onChange = vi.fn();
    render(<SkillSearch value="数据分析" onChange={onChange} />);

    const input = screen.getByDisplayValue('数据分析');
    expect(input).toBeInTheDocument();
  });

  it('应该在输入时触发 onChange 回调', () => {
    const onChange = vi.fn();
    render(<SkillSearch value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('搜索技能...');
    fireEvent.change(input, { target: { value: 'SQL' } });

    expect(onChange).toHaveBeenCalledWith('SQL');
  });

  it('应该显示搜索图标', () => {
    const onChange = vi.fn();
    const { container } = render(<SkillSearch value="" onChange={onChange} />);

    const searchIcon = container.querySelector('.anticon-search');
    expect(searchIcon).toBeInTheDocument();
  });

  it('应该支持清空按钮', () => {
    const onChange = vi.fn();
    const { container } = render(<SkillSearch value="测试" onChange={onChange} />);

    // 清空按钮在有值时才显示，使用 class 选择器查找
    const clearButton = container.querySelector('.anticon-close-circle');
    expect(clearButton).toBeInTheDocument();
  });
});
