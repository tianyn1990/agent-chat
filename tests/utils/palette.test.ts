import { describe, expect, it } from 'vitest';
import { lightPalette, paletteToCssVariables } from '@/theme/palette';

describe('palette', () => {
  it('light 主题应保持白灰化的 Porcelain Console 基底', () => {
    expect(lightPalette.contentBg).toBe('#f4f6f8');
    expect(lightPalette.contentBgSecondary).toBe('#eceff3');
    expect(lightPalette.paperBg).toBe('#fcfdff');
    expect(lightPalette.sidebarBg).toBe('#f1f4f7');
    expect(lightPalette.visualizeShellBg).toBe('#eef2f6');
  });

  it('paletteToCssVariables 会输出与 light 主题一致的关键变量', () => {
    const cssVars = paletteToCssVariables(lightPalette);

    expect(cssVars['--content-bg']).toBe(lightPalette.contentBg);
    expect(cssVars['--paper-bg']).toBe(lightPalette.paperBg);
    expect(cssVars['--panel-border']).toBe(lightPalette.panelBorder);
    expect(cssVars['--visualize-shell-bg']).toBe(lightPalette.visualizeShellBg);
    expect(cssVars['--message-bg']).toBe(lightPalette.messageBg);
  });
});
