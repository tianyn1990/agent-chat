import type { ThemeConfig } from 'antd';
import { darkPalette, lightPalette, themePalettes, type ThemeMode } from './palette';

/**
 * 向外暴露 dark palette，兼容现有测试与少量历史引用。
 * 这里保留 `graphitePalette` 名称，是为了减少双主题改造阶段不必要的接口破坏。
 */
export const graphitePalette = darkPalette;

/** Light 主题调色板导出，便于测试与文档引用。 */
export const ivoryPalette = lightPalette;

/**
 * 根据主题模式生成 Ant Design 主题配置。
 *
 * 设计原因：
 * - Ant Design portal 组件无法只依赖 CSS vars，需要 JS token 参与
 * - dark / light 都由同一 palette 生成，可以避免 CSS 与 AntD 组件出现两套颜色体系
 */
export function createAntdTheme(mode: ThemeMode): ThemeConfig {
  const palette = themePalettes[mode];

  return {
    token: {
      colorPrimary: palette.primary,
      colorInfo: palette.primary,
      colorSuccess: palette.successColor,
      colorWarning: palette.warningColor,
      colorError: palette.dangerColor,
      colorLink: palette.primary,
      colorLinkHover: palette.primaryHover,
      colorLinkActive: palette.primaryActive,
      colorTextBase: palette.textPrimary,
      colorText: palette.textPrimary,
      colorTextSecondary: palette.textSecondary,
      colorTextTertiary: palette.textTertiary,
      colorTextQuaternary:
        mode === 'dark' ? 'rgba(237, 242, 251, 0.36)' : 'rgba(104, 116, 136, 0.42)',
      colorTextDescription: palette.textSecondary,
      colorTextPlaceholder: palette.textTertiary,
      colorIcon: palette.textSecondary,
      colorIconHover: palette.textPrimary,
      colorBgBase: palette.contentBg,
      colorBgLayout: palette.contentBg,
      colorBgContainer: palette.paperBg,
      colorBgElevated: palette.paperBg,
      colorBgSpotlight: palette.paperBgStrong,
      // Light 主题的 mask 改为更中性的 slate 灰，避免弹层一打开就把全局色温重新拉黄。
      colorBgMask: mode === 'dark' ? 'rgba(8, 10, 14, 0.72)' : 'rgba(68, 78, 95, 0.18)',
      colorBorder: palette.panelBorder,
      colorBorderSecondary: palette.frameDivider,
      colorSplit: palette.frameDivider,
      colorFill: palette.frameSurfaceElevated,
      colorFillSecondary: palette.frameSurfaceSubtle,
      colorFillTertiary: palette.frameSurfaceSubtle,
      colorFillQuaternary:
        mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(104, 116, 136, 0.03)',
      controlOutline: palette.primarySoft,
      boxShadow: 'none',
      boxShadowSecondary: 'none',
      borderRadius: 12,
      fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif",
    },
    components: {
      Button: {
        // 按钮维持统一的扁平化工作台风格，避免 portal 或表单局部回退到默认 AntD 观感。
        fontWeight: 500,
        defaultShadow: 'none',
        primaryShadow: 'none',
        dangerShadow: 'none',
        defaultColor: palette.textPrimary,
        defaultBg: palette.buttonDefaultBg,
        defaultBorderColor: palette.buttonDefaultBorder,
        defaultHoverBg: palette.buttonDefaultHoverBg,
        defaultHoverColor: palette.textPrimary,
        defaultHoverBorderColor: palette.buttonDefaultHoverBorder,
        defaultActiveBg: palette.buttonDefaultActiveBg,
        defaultActiveColor: palette.textPrimary,
        defaultActiveBorderColor: palette.buttonDefaultActiveBorder,
        primaryColor: palette.buttonPrimaryText,
        dangerColor: palette.buttonDangerText,
        borderColorDisabled: palette.buttonDisabledBorder,
        defaultGhostColor: palette.textPrimary,
        defaultGhostBorderColor: palette.buttonDefaultBorder,
        ghostBg: 'transparent',
        solidTextColor: palette.textPrimary,
        textTextColor: palette.textSecondary,
        textTextHoverColor: palette.textPrimary,
        textTextActiveColor: palette.textPrimary,
        textHoverBg: palette.buttonTextHoverBg,
        linkHoverBg: palette.buttonTextHoverBg,
        paddingBlock: 6,
        paddingBlockSM: 4,
        paddingBlockLG: 8,
        paddingInline: 14,
        paddingInlineSM: 10,
        paddingInlineLG: 18,
        groupBorderColor: palette.panelBorder,
      },
      Input: {
        // 输入框是聊天 dock 和搜索工具条的核心表面层，需要与自定义 CSS vars 完全一致。
        addonBg: palette.controlBg,
        hoverBg: palette.controlBg,
        activeBg: palette.controlBg,
        hoverBorderColor: palette.controlBorderHover,
        activeBorderColor: palette.primary,
        activeShadow: palette.controlFocusShadow,
        errorActiveShadow:
          mode === 'dark'
            ? '0 0 0 3px rgba(216, 123, 123, 0.14)'
            : '0 0 0 3px rgba(177, 95, 103, 0.14)',
        warningActiveShadow:
          mode === 'dark'
            ? '0 0 0 3px rgba(210, 166, 92, 0.14)'
            : '0 0 0 3px rgba(164, 118, 50, 0.14)',
      },
      Select: {
        selectorBg: palette.controlBg,
        clearBg: palette.paperBg,
        optionActiveBg: palette.frameSurfaceElevated,
        optionSelectedBg: palette.primarySoft,
        optionSelectedColor: palette.textPrimary,
        optionSelectedFontWeight: 500,
        hoverBorderColor: palette.controlBorderHover,
        activeBorderColor: palette.primary,
        activeOutlineColor: palette.focusRingSoft,
        multipleItemBg: palette.frameSurfaceElevated,
        multipleItemBorderColor: palette.panelBorder,
        multipleSelectorBgDisabled: palette.frameSurfaceSubtle,
        multipleItemColorDisabled: palette.buttonDisabledText,
        multipleItemBorderColorDisabled: palette.frameDivider,
      },
      Modal: {
        // Modal/Confirm 很容易暴露默认浅色 header/footer，因此统一由主题层兜底。
        headerBg: palette.modalBg,
        contentBg: palette.modalBg,
        footerBg: palette.modalBg,
        titleColor: palette.textPrimary,
        titleFontSize: 16,
      },
      Message: {
        // Toast 通过 portal 渲染，必须与全局 CSS vars 使用同一背景来源。
        contentBg: palette.messageBg,
        contentPadding: '10px 14px',
      },
      Notification: {
        colorSuccessBg: palette.paperBg,
        colorErrorBg: palette.paperBg,
        colorInfoBg: palette.paperBg,
        colorWarningBg: palette.paperBg,
        width: 360,
      },
      Drawer: {
        footerPaddingBlock: 12,
        footerPaddingInline: 16,
      },
    },
  };
}

/**
 * 默认导出 dark 主题，兼容历史导入。
 * 新代码应优先使用 `createAntdTheme(mode)`。
 */
export const antdTheme = createAntdTheme('dark');
