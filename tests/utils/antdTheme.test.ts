import { describe, expect, it } from 'vitest';
import { antdTheme, graphitePalette } from '@/theme/antdTheme';

describe('antdTheme', () => {
  it('基础 token 与 Graphite Console 视觉系统保持一致', () => {
    expect(antdTheme.token?.colorPrimary).toBe(graphitePalette.primary);
    expect(antdTheme.token?.colorBgBase).toBe(graphitePalette.bgBase);
    expect(antdTheme.token?.colorBgContainer).toBe(graphitePalette.bgContainer);
    expect(antdTheme.token?.colorText).toBe(graphitePalette.textPrimary);
    expect(antdTheme.token?.colorTextSecondary).toBe(graphitePalette.textSecondary);
    expect(antdTheme.token?.colorBgMask).toBe(graphitePalette.mask);
  });

  it('对关键 portal 组件配置深色 token 兜底', () => {
    expect(antdTheme.components?.Message?.contentBg).toBe('#1a2028');
    expect(antdTheme.components?.Notification?.colorInfoBg).toBe(graphitePalette.bgContainer);
    expect(antdTheme.components?.Modal?.contentBg).toBe(graphitePalette.bgContainer);
    expect(antdTheme.components?.Drawer?.footerPaddingInline).toBe(16);
  });

  it('对交互密集组件设置一致的扁平化 token', () => {
    expect(antdTheme.components?.Button?.defaultShadow).toBe('none');
    expect(antdTheme.components?.Button?.textTextColor).toBe(graphitePalette.textSecondary);
    expect(antdTheme.components?.Input?.activeBorderColor).toBe(graphitePalette.primary);
    expect(antdTheme.components?.Select?.selectorBg).toBe(graphitePalette.fillTertiary);
  });
});
