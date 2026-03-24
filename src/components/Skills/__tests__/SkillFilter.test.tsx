import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillFilter from '../SkillFilter';

describe('SkillFilter', () => {
  it('应该渲染所有分类选项', () => {
    const onChange = vi.fn();
    render(<SkillFilter selectedCategory="all" onChange={onChange} />);

    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getByText('数据分析')).toBeInTheDocument();
    expect(screen.getByText('写作助手')).toBeInTheDocument();
    expect(screen.getByText('代码工具')).toBeInTheDocument();
    expect(screen.getByText('办公自动化')).toBeInTheDocument();
    expect(screen.getByText('沟通协作')).toBeInTheDocument();
    expect(screen.getByText('其他')).toBeInTheDocument();
  });

  it('应该高亮当前选中的分类', () => {
    const onChange = vi.fn();
    render(<SkillFilter selectedCategory="data_analysis" onChange={onChange} />);

    // Ant Design CheckableTag 选中时会添加 ant-tag-checkable-checked 类
    const dataAnalysisTag = screen.getByText('数据分析').closest('.ant-tag');
    expect(dataAnalysisTag).toHaveClass('ant-tag-checkable-checked');
  });

  it('应该在点击分类时触发 onChange', () => {
    const onChange = vi.fn();
    render(<SkillFilter selectedCategory="all" onChange={onChange} />);

    const codeTag = screen.getByText('代码工具');
    fireEvent.click(codeTag);

    expect(onChange).toHaveBeenCalledWith('code');
  });

  it('应该支持切换到"全部"分类', () => {
    const onChange = vi.fn();
    render(<SkillFilter selectedCategory="writing" onChange={onChange} />);

    const allTag = screen.getByText('全部');
    fireEvent.click(allTag);

    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('应该显示分类标签', () => {
    const onChange = vi.fn();
    render(<SkillFilter selectedCategory="all" onChange={onChange} />);

    expect(screen.getByText('分类：')).toBeInTheDocument();
  });
});
