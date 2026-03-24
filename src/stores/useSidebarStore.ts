import { create } from 'zustand';
import type { ReactNode } from 'react';

interface SidebarState {
  /**
   * 侧边栏插槽内容
   * 由各页面（如 ChatPage）在挂载时设置，卸载时清除
   */
  extraContent: ReactNode | null;
  /** 设置插槽内容 */
  setExtraContent: (content: ReactNode | null) => void;
}

/**
 * 侧边栏插槽 Store
 * 允许各页面向侧边栏注入动态内容（如会话列表）
 * 通过 store 而非 React 组件树传递，避免复杂的 prop drilling
 */
export const useSidebarStore = create<SidebarState>()((set) => ({
  extraContent: null,
  setExtraContent: (content) => set({ extraContent: content }),
}));
