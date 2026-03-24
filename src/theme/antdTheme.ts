import type { ThemeConfig } from 'antd';

/**
 * Graphite Console 调色板。
 * 这里集中维护 Ant Design 主题使用的关键颜色，避免全局样式与组件 token 漂移。
 */
const graphitePalette = {
  primary: '#7b91ff',
  primaryHover: '#92a5ff',
  primaryActive: '#6278db',
  success: '#70b38c',
  warning: '#d2a65c',
  danger: '#d87b7b',
  textPrimary: '#edf2fb',
  textSecondary: '#a7b0bf',
  textTertiary: '#7d8796',
  bgBase: '#0d0f13',
  bgContainer: '#151922',
  bgSpotlight: '#1b212b',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSoft: 'rgba(255, 255, 255, 0.06)',
  fill: 'rgba(255, 255, 255, 0.06)',
  fillSecondary: 'rgba(255, 255, 255, 0.04)',
  fillTertiary: 'rgba(255, 255, 255, 0.03)',
  fillQuaternary: 'rgba(255, 255, 255, 0.02)',
  mask: 'rgba(8, 10, 14, 0.72)',
} as const;

/**
 * Ant Design 主题配置。
 * 目标是让 AntD 组件在没有命中局部 less 覆写时，也能自然继承当前 Graphite Console 视觉系统。
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: graphitePalette.primary,
    colorInfo: graphitePalette.primary,
    colorSuccess: graphitePalette.success,
    colorWarning: graphitePalette.warning,
    colorError: graphitePalette.danger,
    colorLink: graphitePalette.primary,
    colorLinkHover: graphitePalette.primaryHover,
    colorLinkActive: graphitePalette.primaryActive,
    colorTextBase: graphitePalette.textPrimary,
    colorText: graphitePalette.textPrimary,
    colorTextSecondary: graphitePalette.textSecondary,
    colorTextTertiary: graphitePalette.textTertiary,
    colorTextQuaternary: 'rgba(237, 242, 251, 0.36)',
    colorTextDescription: graphitePalette.textSecondary,
    colorTextPlaceholder: graphitePalette.textTertiary,
    colorIcon: graphitePalette.textSecondary,
    colorIconHover: graphitePalette.textPrimary,
    colorBgBase: graphitePalette.bgBase,
    colorBgLayout: graphitePalette.bgBase,
    colorBgContainer: graphitePalette.bgContainer,
    colorBgElevated: graphitePalette.bgContainer,
    colorBgSpotlight: graphitePalette.bgSpotlight,
    colorBgMask: graphitePalette.mask,
    colorBorder: graphitePalette.border,
    colorBorderSecondary: graphitePalette.borderSoft,
    colorSplit: graphitePalette.borderSoft,
    colorFill: graphitePalette.fill,
    colorFillSecondary: graphitePalette.fillSecondary,
    colorFillTertiary: graphitePalette.fillTertiary,
    colorFillQuaternary: graphitePalette.fillQuaternary,
    controlOutline: 'rgba(123, 145, 255, 0.14)',
    boxShadow: 'none',
    boxShadowSecondary: 'none',
    borderRadius: 12,
    fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif",
  },
  components: {
    Button: {
      // 按钮统一保持低饱和、扁平化，避免局部操作重新出现默认蓝白按钮。
      fontWeight: 500,
      defaultShadow: 'none',
      primaryShadow: 'none',
      dangerShadow: 'none',
      defaultColor: graphitePalette.textPrimary,
      defaultBg: graphitePalette.fillTertiary,
      defaultBorderColor: graphitePalette.border,
      defaultHoverBg: graphitePalette.fillSecondary,
      defaultHoverColor: graphitePalette.textPrimary,
      defaultHoverBorderColor: 'rgba(255, 255, 255, 0.18)',
      defaultActiveBg: graphitePalette.fill,
      defaultActiveColor: graphitePalette.textPrimary,
      defaultActiveBorderColor: 'rgba(255, 255, 255, 0.22)',
      primaryColor: graphitePalette.textPrimary,
      dangerColor: '#f0caca',
      borderColorDisabled: graphitePalette.border,
      defaultGhostColor: graphitePalette.textPrimary,
      defaultGhostBorderColor: graphitePalette.border,
      ghostBg: 'transparent',
      solidTextColor: graphitePalette.textPrimary,
      textTextColor: graphitePalette.textSecondary,
      textTextHoverColor: graphitePalette.textPrimary,
      textTextActiveColor: graphitePalette.textPrimary,
      textHoverBg: graphitePalette.fillSecondary,
      linkHoverBg: graphitePalette.fillSecondary,
      paddingBlock: 6,
      paddingBlockSM: 4,
      paddingBlockLG: 8,
      paddingInline: 14,
      paddingInlineSM: 10,
      paddingInlineLG: 18,
      groupBorderColor: graphitePalette.border,
    },
    Input: {
      // 输入框与底部 dock 使用同一套 graphite 表面层，避免出现浅底输入框。
      addonBg: graphitePalette.fillSecondary,
      hoverBg: graphitePalette.fillSecondary,
      activeBg: graphitePalette.fillSecondary,
      hoverBorderColor: 'rgba(255, 255, 255, 0.14)',
      activeBorderColor: graphitePalette.primary,
      activeShadow: '0 0 0 3px rgba(123, 145, 255, 0.12)',
      errorActiveShadow: '0 0 0 3px rgba(216, 123, 123, 0.14)',
      warningActiveShadow: '0 0 0 3px rgba(210, 166, 92, 0.14)',
    },
    Select: {
      // 下拉选项与选择器必须保持深色容器和稳定对比度，避免 option 回退成浅色态。
      selectorBg: graphitePalette.fillTertiary,
      clearBg: graphitePalette.bgContainer,
      optionActiveBg: graphitePalette.fill,
      optionSelectedBg: 'rgba(123, 145, 255, 0.12)',
      optionSelectedColor: graphitePalette.textPrimary,
      optionSelectedFontWeight: 500,
      hoverBorderColor: 'rgba(255, 255, 255, 0.14)',
      activeBorderColor: graphitePalette.primary,
      activeOutlineColor: 'rgba(123, 145, 255, 0.12)',
      multipleItemBg: graphitePalette.fill,
      multipleItemBorderColor: graphitePalette.border,
      multipleSelectorBgDisabled: graphitePalette.fillQuaternary,
      multipleItemColorDisabled: 'rgba(237, 242, 251, 0.44)',
      multipleItemBorderColorDisabled: graphitePalette.borderSoft,
    },
    Modal: {
      // Modal 是最容易露出 AntD 默认浅色 header/footer 的区域，直接在 token 层钉死。
      headerBg: graphitePalette.bgContainer,
      contentBg: graphitePalette.bgContainer,
      footerBg: graphitePalette.bgContainer,
      titleColor: graphitePalette.textPrimary,
      titleFontSize: 16,
    },
    Message: {
      // Toast 走 portal 渲染，组件 token 需要和 global.less 一起兜底，避免文字对比度失衡。
      contentBg: '#1a2028',
      contentPadding: '10px 14px',
    },
    Notification: {
      // Notification 不做高饱和语义底色，统一回到深色容器，再用图标表达语义。
      colorSuccessBg: graphitePalette.bgContainer,
      colorErrorBg: graphitePalette.bgContainer,
      colorInfoBg: graphitePalette.bgContainer,
      colorWarningBg: graphitePalette.bgContainer,
      width: 360,
    },
    Drawer: {
      footerPaddingBlock: 12,
      footerPaddingInline: 16,
    },
  },
};

export { graphitePalette };
