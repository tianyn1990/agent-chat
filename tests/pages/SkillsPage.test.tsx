import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SkillsPage from '@/pages/Skills';
import { useSkillStore } from '@/stores/useSkillStore';
import type { Skill } from '@/types/skill';

const fetchSkillsMock = vi.fn();
const installSkillMock = vi.fn();
const uninstallSkillMock = vi.fn();

vi.mock('@/services/skillApi', () => ({
  fetchSkills: () => fetchSkillsMock(),
  installSkill: (...args: unknown[]) => installSkillMock(...args),
  uninstallSkill: (...args: unknown[]) => uninstallSkillMock(...args),
}));

const mockSkills: Skill[] = [
  {
    id: 'skill_data',
    name: '数据分析师',
    description: '分析业务数据并生成图表。',
    icon: '📊',
    category: 'data_analysis',
    version: '1.0.0',
    author: 'OpenClaw Team',
    installed: true,
    installedAt: Date.now(),
    features: ['统计', '图表'],
    tags: ['数据'],
  },
  {
    id: 'skill_doc',
    name: '文档写作',
    description: '输出结构化方案与说明文档。',
    icon: '📝',
    category: 'writing',
    version: '1.1.0',
    author: 'OpenClaw Team',
    installed: false,
    features: ['方案', '总结'],
    tags: ['文档'],
  },
];

describe('SkillsPage', () => {
  beforeEach(() => {
    fetchSkillsMock.mockResolvedValue(mockSkills);
    installSkillMock.mockResolvedValue(undefined);
    uninstallSkillMock.mockResolvedValue(undefined);

    useSkillStore.setState({
      skills: [],
      isLoading: false,
      searchKeyword: '',
      selectedCategory: 'all',
    });
  });

  it('加载后展示页面头部和技能数据', async () => {
    render(
      <MemoryRouter>
        <SkillsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('能力模块')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('数据分析师')).toHaveLength(1);
      expect(screen.getByText('文档写作')).toBeInTheDocument();
    });

    expect(screen.getByText('已安装技能')).toBeInTheDocument();
    expect(screen.getByText('可用技能')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '搜索技能' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建技能/ })).toBeDisabled();
  });

  it('搜索关键词后只保留匹配技能', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SkillsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('数据分析师')).toHaveLength(1);
    });

    await user.type(screen.getByPlaceholderText('搜索技能...'), '文档');

    expect(screen.getByText('文档写作')).toBeInTheDocument();
    expect(screen.getAllByText('数据分析师')).toHaveLength(1);
  });
});
