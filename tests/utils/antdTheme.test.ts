import { describe, expect, it } from 'vitest';
import { createAntdTheme, graphitePalette, ivoryPalette } from '@/theme/antdTheme';

describe('antdTheme', () => {
  it('dark 主题会继续对齐现有 Graphite Console token', () => {
    const darkTheme = createAntdTheme('dark');

    expect(darkTheme.token?.colorPrimary).toBe(graphitePalette.primary);
    expect(darkTheme.token?.colorBgBase).toBe(graphitePalette.contentBg);
    expect(darkTheme.token?.colorBgContainer).toBe(graphitePalette.paperBg);
    expect(darkTheme.token?.colorText).toBe(graphitePalette.textPrimary);
    expect(darkTheme.token?.colorTextSecondary).toBe(graphitePalette.textSecondary);
    expect(darkTheme.components?.Message?.contentBg).toBe(graphitePalette.messageBg);
  });

  it('light 主题会生成独立的 Ivory Editorial token', () => {
    const lightTheme = createAntdTheme('light');

    expect(lightTheme.token?.colorPrimary).toBe(ivoryPalette.primary);
    expect(lightTheme.token?.colorBgBase).toBe(ivoryPalette.contentBg);
    expect(lightTheme.token?.colorBgContainer).toBe(ivoryPalette.paperBg);
    expect(lightTheme.token?.colorText).toBe(ivoryPalette.textPrimary);
    expect(lightTheme.token?.colorBgMask).toBe('rgba(73, 61, 43, 0.22)');
    expect(lightTheme.components?.Message?.contentBg).toBe(ivoryPalette.messageBg);
  });

  it('两套主题都对交互密集组件给出统一的扁平化 token', () => {
    const darkTheme = createAntdTheme('dark');
    const lightTheme = createAntdTheme('light');

    expect(darkTheme.components?.Button?.defaultShadow).toBe('none');
    expect(lightTheme.components?.Button?.defaultShadow).toBe('none');
    expect(darkTheme.components?.Input?.activeBorderColor).toBe(graphitePalette.primary);
    expect(lightTheme.components?.Input?.activeBorderColor).toBe(ivoryPalette.primary);
    expect(darkTheme.components?.Select?.selectorBg).toBe(graphitePalette.controlBg);
    expect(lightTheme.components?.Select?.selectorBg).toBe(ivoryPalette.controlBg);
  });
});
