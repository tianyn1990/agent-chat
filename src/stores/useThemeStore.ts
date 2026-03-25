import { create } from 'zustand';
import { STORAGE_KEYS } from '@/constants';
import { type ThemeMode, paletteToCssVariables, themePalettes } from '@/theme/palette';

/**
 * 校验并恢复本地主题偏好。
 * 这里显式限制为 dark / light，避免无效值把应用留在未知视觉状态。
 */
function restoreThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const rawTheme = window.localStorage.getItem(STORAGE_KEYS.THEME);
  return rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : 'dark';
}

/**
 * 将主题同步到 document。
 *
 * 设计原因：
 * - CSS vars、data-theme 与 color-scheme 都依赖根节点状态
 * - 同步动作集中在这里，可以避免多个组件分别写入 document 导致竞态
 */
export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const palette = themePalettes[mode];
  const cssVariables = paletteToCssVariables(palette);

  root.dataset.theme = mode;
  root.style.colorScheme = palette.colorScheme;

  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

const initialMode = restoreThemeMode();

/**
 * 模块加载时立即恢复主题，尽量减少首次渲染前的闪烁。
 * 由于 CSS vars 带 dark fallback，这一步失败时也不会让页面失去基本样式。
 */
applyThemeToDocument(initialMode);

interface ThemeState {
  /** 当前显式主题模式 */
  mode: ThemeMode;
  /** 设置主题 */
  setMode: (mode: ThemeMode) => void;
  /** 在 dark / light 间切换 */
  toggleMode: () => void;
}

/**
 * 全局主题 Store。
 * 主题状态使用独立 Store 而非散落在组件局部 state，便于 portal、图表和布局层统一消费。
 */
export const useThemeStore = create<ThemeState>()((set, get) => ({
  mode: initialMode,
  setMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.THEME, mode);
    }

    applyThemeToDocument(mode);
    set({ mode });
  },
  toggleMode: () => {
    const nextMode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    get().setMode(nextMode);
  },
}));
