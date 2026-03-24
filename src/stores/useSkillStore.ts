import { create } from 'zustand';
import type { Skill, SkillCategory } from '@/types/skill';

interface SkillState {
  skills: Skill[];
  isLoading: boolean;
  searchKeyword: string;
  selectedCategory: SkillCategory | 'all';

  // Actions
  setSkills: (skills: Skill[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  setCategory: (category: SkillCategory | 'all') => void;
  markInstalled: (skillId: string, installed: boolean) => void;

  // Selector
  getFilteredSkills: () => Skill[];
  getInstalledSkills: () => Skill[];
}

export const useSkillStore = create<SkillState>()((set, get) => ({
  skills: [],
  isLoading: false,
  searchKeyword: '',
  selectedCategory: 'all',

  setSkills: (skills) => set({ skills }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setCategory: (category) => set({ selectedCategory: category }),

  markInstalled: (skillId, installed) =>
    set((state) => ({
      skills: state.skills.map((s) =>
        s.id === skillId ? { ...s, installed, installedAt: installed ? Date.now() : undefined } : s,
      ),
    })),

  getFilteredSkills: () => {
    const { skills, searchKeyword, selectedCategory } = get();
    return skills.filter((skill) => {
      const matchCategory = selectedCategory === 'all' || skill.category === selectedCategory;
      const matchKeyword =
        !searchKeyword ||
        skill.name.includes(searchKeyword) ||
        skill.description.includes(searchKeyword) ||
        (skill.tags ?? []).some((t) => t.includes(searchKeyword));
      return matchCategory && matchKeyword;
    });
  },

  getInstalledSkills: () => get().skills.filter((s) => s.installed),
}));
