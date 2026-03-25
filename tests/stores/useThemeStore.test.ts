import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/constants';
import { applyThemeToDocument, useThemeStore } from '@/stores/useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().setMode('dark');
  });

  it('切换主题时会同步 data-theme、color-scheme 与本地存储', () => {
    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe('light');
  });

  it('toggleMode 会在 dark 与 light 之间切换', () => {
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('applyThemeToDocument 会把关键 CSS 变量写入根节点', () => {
    applyThemeToDocument('light');

    const rootStyle = document.documentElement.style;
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(rootStyle.getPropertyValue('--primary-color')).toBeTruthy();
    expect(rootStyle.getPropertyValue('--app-background')).toContain('linear-gradient');
    expect(rootStyle.getPropertyValue('--text-primary')).toBeTruthy();
  });
});
