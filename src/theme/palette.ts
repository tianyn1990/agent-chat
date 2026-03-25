/**
 * 主题模式定义。
 * 当前仅支持显式 dark / light，两者都由产品主动设计，而不是依赖系统默认样式推导。
 */
export type ThemeMode = 'dark' | 'light';

/**
 * 主题调色板。
 *
 * 设计原因：
 * - CSS、LESS、Ant Design token 与少量运行时样式都需要共享同一套语义颜色
 * - 把 palette 单独抽出后，后续新增主题或修正单个颜色时不会出现多处漂移
 */
export interface ThemePalette {
  mode: ThemeMode;
  colorScheme: 'dark' | 'light';
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  accentColor: string;
  accentSoft: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  contentBg: string;
  contentBgSecondary: string;
  paperBg: string;
  paperBgStrong: string;
  panelBg: string;
  panelBorder: string;
  frameDivider: string;
  frameDividerStrong: string;
  frameSurfaceSubtle: string;
  frameSurfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnDark: string;
  textOnDarkSecondary: string;
  sidebarBg: string;
  sidebarSurface: string;
  sidebarText: string;
  sidebarTextSecondary: string;
  sidebarHoverBg: string;
  sidebarActiveBg: string;
  sidebarActiveText: string;
  sidebarBorder: string;
  userBubbleBg: string;
  userBubbleText: string;
  assistantBubbleBg: string;
  assistantBubbleBorder: string;
  assistantBubbleShadow: string;
  cardBlueBg: string;
  cardBlueBorder: string;
  cardGreenBg: string;
  cardGreenBorder: string;
  cardYellowBg: string;
  cardYellowBorder: string;
  cardRedBg: string;
  cardRedBorder: string;
  cardGreyBg: string;
  cardGreyBorder: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowFloat: string;
  appBackground: string;
  appGridPrimary: string;
  appGridSecondary: string;
  appGridMask: string;
  selectionBg: string;
  selectionText: string;
  scrollThumb: string;
  scrollThumbHover: string;
  sidebarScrollThumb: string;
  sidebarScrollThumbHover: string;
  focusOutline: string;
  focusRing: string;
  focusRingSoft: string;
  buttonPrimaryBorder: string;
  buttonPrimaryBg: string;
  buttonPrimaryHoverBorder: string;
  buttonPrimaryHoverBg: string;
  buttonPrimaryActiveBorder: string;
  buttonPrimaryActiveBg: string;
  buttonPrimaryText: string;
  buttonDefaultBorder: string;
  buttonDefaultBg: string;
  buttonDefaultHoverBorder: string;
  buttonDefaultHoverBg: string;
  buttonDefaultActiveBorder: string;
  buttonDefaultActiveBg: string;
  buttonTextHoverBg: string;
  buttonTextActiveBg: string;
  buttonDisabledText: string;
  buttonDisabledBorder: string;
  buttonDisabledBg: string;
  buttonDangerText: string;
  buttonDangerBorder: string;
  buttonDangerBg: string;
  buttonDangerHoverText: string;
  buttonDangerHoverBorder: string;
  buttonDangerHoverBg: string;
  buttonDangerActiveBorder: string;
  buttonDangerActiveBg: string;
  buttonDangerPrimaryText: string;
  buttonDangerPrimaryBorder: string;
  buttonDangerPrimaryBg: string;
  buttonDangerPrimaryHoverText: string;
  buttonDangerPrimaryHoverBorder: string;
  buttonDangerPrimaryHoverBg: string;
  buttonDangerPrimaryActiveBorder: string;
  buttonDangerPrimaryActiveBg: string;
  controlBg: string;
  controlBorder: string;
  controlBorderHover: string;
  controlFocusShadow: string;
  drawerBg: string;
  modalBg: string;
  tooltipBg: string;
  messageBg: string;
  dropdownBg: string;
  navActiveBg: string;
  navActiveBorder: string;
  navActiveText: string;
  surfaceFloating: string;
  surfaceFloatingStrong: string;
  toolbarBg: string;
  toolbarButtonBg: string;
  toolbarButtonHoverBg: string;
  overlayCanvas: string;
  overlayCanvasStrong: string;
  tableHeaderBg: string;
  tableRowBg: string;
  tableRowAltBg: string;
  tableRowHoverBg: string;
  tableCellBorder: string;
  codeInlineBg: string;
  codeInlineBorder: string;
  codeInlineText: string;
  blockquoteBg: string;
  blockquoteBorder: string;
  cardToneBg: string;
  cardToneText: string;
  sessionItemBorder: string;
  sessionItemHoverBorder: string;
  sessionItemIconBg: string;
  sessionItemMenuHoverBg: string;
  sessionRenameBg: string;
  sessionRenameBorder: string;
  sessionRenameFocus: string;
  sessionActiveMetaText: string;
  visualizeShellBg: string;
  visualizeToolbarText: string;
  visualizeToolbarButtonBg: string;
  visualizeToolbarButtonBorder: string;
  visualizeToolbarButtonHoverBg: string;
  visualizeToolbarPrimaryBg: string;
  visualizeToolbarPrimaryBorder: string;
  visualizeToolbarPrimaryHoverBg: string;
  visualizeFrameBg: string;
  emptySurfaceBg: string;
  emptySurfaceBorder: string;
  emptySurfaceShadow: string;
  feedbackInfoTagBg: string;
  feedbackInfoTagBorder: string;
  feedbackInfoTagText: string;
  feedbackSuccessTagBg: string;
  feedbackSuccessTagBorder: string;
  feedbackSuccessTagText: string;
  feedbackWarningTagBg: string;
  feedbackWarningTagBorder: string;
  feedbackWarningTagText: string;
  feedbackDangerTagBg: string;
  feedbackDangerTagBorder: string;
  feedbackDangerTagText: string;
}

/**
 * Dark 主题继续沿用当前已经落地的 Graphite Console。
 * 这里尽量保持现状，避免本次双主题基础设施改造意外改变既有深色结果。
 */
export const darkPalette: ThemePalette = {
  mode: 'dark',
  colorScheme: 'dark',
  primary: '#7b91ff',
  primaryHover: '#92a5ff',
  primaryActive: '#6278db',
  primarySoft: 'rgba(123, 145, 255, 0.14)',
  accentColor: '#c79b65',
  accentSoft: 'rgba(199, 155, 101, 0.16)',
  successColor: '#70b38c',
  warningColor: '#d2a65c',
  dangerColor: '#d87b7b',
  contentBg: '#0d0f13',
  contentBgSecondary: '#141821',
  paperBg: '#171b22',
  paperBgStrong: '#202630',
  panelBg: 'rgba(23, 27, 34, 0.94)',
  panelBorder: 'rgba(255, 255, 255, 0.08)',
  frameDivider: 'rgba(255, 255, 255, 0.06)',
  frameDividerStrong: 'rgba(255, 255, 255, 0.1)',
  frameSurfaceSubtle: 'rgba(255, 255, 255, 0.02)',
  frameSurfaceElevated: 'rgba(255, 255, 255, 0.04)',
  textPrimary: '#edf2fb',
  textSecondary: '#a7b0bf',
  textTertiary: '#7d8796',
  textOnDark: 'rgba(237, 242, 251, 0.94)',
  textOnDarkSecondary: 'rgba(237, 242, 251, 0.58)',
  sidebarBg: '#101319',
  sidebarSurface: 'rgba(255, 255, 255, 0.04)',
  sidebarText: 'rgba(237, 242, 251, 0.94)',
  sidebarTextSecondary: 'rgba(237, 242, 251, 0.58)',
  sidebarHoverBg: 'rgba(255, 255, 255, 0.06)',
  sidebarActiveBg: 'linear-gradient(135deg, rgba(199, 155, 101, 0.18), rgba(123, 145, 255, 0.2))',
  sidebarActiveText: '#ffffff',
  sidebarBorder: 'rgba(255, 255, 255, 0.08)',
  userBubbleBg: 'linear-gradient(135deg, #2c3340 0%, #262d39 100%)',
  userBubbleText: '#f6f8fb',
  assistantBubbleBg: 'rgba(255, 255, 255, 0.03)',
  assistantBubbleBorder: 'rgba(255, 255, 255, 0.06)',
  assistantBubbleShadow: 'none',
  cardBlueBg: '#172333',
  cardBlueBorder: '#2d4362',
  cardGreenBg: '#18271f',
  cardGreenBorder: '#305240',
  cardYellowBg: '#292113',
  cardYellowBorder: '#70562d',
  cardRedBg: '#2b1b1d',
  cardRedBorder: '#6e3c45',
  cardGreyBg: '#1f2228',
  cardGreyBorder: '#383d46',
  shadowSm: '0 4px 12px rgba(0, 0, 0, 0.12)',
  shadowMd: '0 10px 28px rgba(0, 0, 0, 0.2)',
  shadowLg: '0 18px 42px rgba(0, 0, 0, 0.28)',
  shadowFloat: '0 20px 48px rgba(0, 0, 0, 0.32)',
  appBackground:
    'radial-gradient(circle at top left, rgba(123, 145, 255, 0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(199, 155, 101, 0.08), transparent 22%), linear-gradient(180deg, #0a0c10 0%, #0d0f13 36%, #141821 100%)',
  appGridPrimary: 'rgba(255, 255, 255, 0.028)',
  appGridSecondary: 'rgba(255, 255, 255, 0.02)',
  appGridMask: 'linear-gradient(180deg, rgba(0, 0, 0, 0.36), transparent 88%)',
  selectionBg: 'rgba(123, 145, 255, 0.26)',
  selectionText: '#ffffff',
  scrollThumb: 'rgba(255, 255, 255, 0.14)',
  scrollThumbHover: 'rgba(255, 255, 255, 0.24)',
  sidebarScrollThumb: 'rgba(255, 255, 255, 0.12)',
  sidebarScrollThumbHover: 'rgba(255, 255, 255, 0.22)',
  focusOutline: 'rgba(123, 145, 255, 0.5)',
  focusRing: 'rgba(123, 145, 255, 0.18)',
  focusRingSoft: 'rgba(123, 145, 255, 0.12)',
  buttonPrimaryBorder: 'rgba(123, 145, 255, 0.18)',
  buttonPrimaryBg: 'rgba(123, 145, 255, 0.16)',
  buttonPrimaryHoverBorder: 'rgba(123, 145, 255, 0.28)',
  buttonPrimaryHoverBg: 'rgba(123, 145, 255, 0.24)',
  buttonPrimaryActiveBorder: 'rgba(123, 145, 255, 0.32)',
  buttonPrimaryActiveBg: 'rgba(123, 145, 255, 0.3)',
  buttonPrimaryText: '#ffffff',
  buttonDefaultBorder: 'rgba(255, 255, 255, 0.1)',
  buttonDefaultBg: 'rgba(255, 255, 255, 0.03)',
  buttonDefaultHoverBorder: 'rgba(255, 255, 255, 0.18)',
  buttonDefaultHoverBg: 'rgba(255, 255, 255, 0.05)',
  buttonDefaultActiveBorder: 'rgba(255, 255, 255, 0.22)',
  buttonDefaultActiveBg: 'rgba(255, 255, 255, 0.08)',
  buttonTextHoverBg: 'rgba(255, 255, 255, 0.05)',
  buttonTextActiveBg: 'rgba(255, 255, 255, 0.08)',
  buttonDisabledText: 'rgba(237, 242, 251, 0.44)',
  buttonDisabledBorder: 'rgba(255, 255, 255, 0.08)',
  buttonDisabledBg: 'rgba(255, 255, 255, 0.06)',
  buttonDangerText: '#f0caca',
  buttonDangerBorder: 'rgba(216, 123, 123, 0.2)',
  buttonDangerBg: 'rgba(216, 123, 123, 0.12)',
  buttonDangerHoverText: '#f6d9d9',
  buttonDangerHoverBorder: 'rgba(216, 123, 123, 0.3)',
  buttonDangerHoverBg: 'rgba(216, 123, 123, 0.18)',
  buttonDangerActiveBorder: 'rgba(216, 123, 123, 0.34)',
  buttonDangerActiveBg: 'rgba(216, 123, 123, 0.24)',
  buttonDangerPrimaryText: '#f3d3d3',
  buttonDangerPrimaryBorder: 'rgba(216, 123, 123, 0.22)',
  buttonDangerPrimaryBg: 'rgba(216, 123, 123, 0.14)',
  buttonDangerPrimaryHoverText: '#f7dcdc',
  buttonDangerPrimaryHoverBorder: 'rgba(216, 123, 123, 0.3)',
  buttonDangerPrimaryHoverBg: 'rgba(216, 123, 123, 0.2)',
  buttonDangerPrimaryActiveBorder: 'rgba(216, 123, 123, 0.34)',
  buttonDangerPrimaryActiveBg: 'rgba(216, 123, 123, 0.26)',
  controlBg: 'rgba(255, 255, 255, 0.03)',
  controlBorder: 'rgba(255, 255, 255, 0.08)',
  controlBorderHover: 'rgba(255, 255, 255, 0.14)',
  controlFocusShadow: '0 0 0 3px rgba(123, 145, 255, 0.12)',
  drawerBg: '#151922',
  modalBg: '#151922',
  tooltipBg: '#1b212b',
  messageBg: '#1a2028',
  dropdownBg: '#151922',
  navActiveBg: 'rgba(123, 145, 255, 0.1)',
  navActiveBorder: 'rgba(123, 145, 255, 0.18)',
  navActiveText: '#ffffff',
  surfaceFloating: 'rgba(19, 24, 31, 0.92)',
  surfaceFloatingStrong: 'rgba(22, 27, 34, 0.96)',
  toolbarBg: 'rgba(11, 16, 22, 0.28)',
  toolbarButtonBg: 'rgba(255, 255, 255, 0.04)',
  toolbarButtonHoverBg: 'rgba(255, 255, 255, 0.1)',
  overlayCanvas: 'rgba(11, 14, 19, 0.22)',
  overlayCanvasStrong: 'rgba(14, 17, 22, 0.9)',
  tableHeaderBg: 'rgba(123, 145, 255, 0.08)',
  tableRowBg: 'rgba(255, 255, 255, 0.03)',
  tableRowAltBg: 'rgba(255, 255, 255, 0.05)',
  tableRowHoverBg: 'rgba(123, 145, 255, 0.08)',
  tableCellBorder: 'rgba(255, 255, 255, 0.08)',
  codeInlineBg: 'rgba(123, 145, 255, 0.12)',
  codeInlineBorder: 'rgba(123, 145, 255, 0.16)',
  codeInlineText: '#d4ddff',
  blockquoteBg: 'rgba(199, 155, 101, 0.08)',
  blockquoteBorder: 'rgba(199, 155, 101, 0.55)',
  cardToneBg: 'rgba(255, 255, 255, 0.05)',
  cardToneText: '#c79b65',
  sessionItemBorder: 'rgba(255, 255, 255, 0.04)',
  sessionItemHoverBorder: 'rgba(255, 255, 255, 0.08)',
  sessionItemIconBg: 'rgba(255, 255, 255, 0.05)',
  sessionItemMenuHoverBg: 'rgba(255, 255, 255, 0.1)',
  sessionRenameBg: 'rgba(255, 255, 255, 0.08)',
  sessionRenameBorder: 'rgba(255, 255, 255, 0.16)',
  sessionRenameFocus: '0 0 0 2px rgba(123, 145, 255, 0.18)',
  sessionActiveMetaText: 'rgba(255, 244, 232, 0.75)',
  visualizeShellBg: '#11161d',
  visualizeToolbarText: '#f8f3ea',
  visualizeToolbarButtonBg: 'rgba(255, 255, 255, 0.04)',
  visualizeToolbarButtonBorder: 'rgba(255, 255, 255, 0.1)',
  visualizeToolbarButtonHoverBg: 'rgba(255, 255, 255, 0.1)',
  visualizeToolbarPrimaryBg: 'rgba(16, 22, 30, 0.56)',
  visualizeToolbarPrimaryBorder: 'rgba(255, 255, 255, 0.12)',
  visualizeToolbarPrimaryHoverBg: 'rgba(22, 29, 39, 0.8)',
  visualizeFrameBg: '#ffffff',
  emptySurfaceBg: 'rgba(22, 27, 34, 0.96)',
  emptySurfaceBorder: 'rgba(255, 255, 255, 0.08)',
  emptySurfaceShadow: '0 10px 28px rgba(0, 0, 0, 0.2)',
  feedbackInfoTagBg: 'rgba(123, 145, 255, 0.12)',
  feedbackInfoTagBorder: 'rgba(123, 145, 255, 0.22)',
  feedbackInfoTagText: '#d5ddff',
  feedbackSuccessTagBg: 'rgba(112, 179, 140, 0.12)',
  feedbackSuccessTagBorder: 'rgba(112, 179, 140, 0.22)',
  feedbackSuccessTagText: '#c9ebd4',
  feedbackWarningTagBg: 'rgba(210, 166, 92, 0.12)',
  feedbackWarningTagBorder: 'rgba(210, 166, 92, 0.22)',
  feedbackWarningTagText: '#f1d29b',
  feedbackDangerTagBg: 'rgba(216, 123, 123, 0.12)',
  feedbackDangerTagBorder: 'rgba(216, 123, 123, 0.22)',
  feedbackDangerTagText: '#f0c2c2',
};

/**
 * Light 主题沿用相同结构语义，但转为暖白纸面工作台。
 * 重点是保持同一产品家族，而不是退回默认蓝白后台。
 */
export const lightPalette: ThemePalette = {
  mode: 'light',
  colorScheme: 'light',
  primary: '#5067c9',
  primaryHover: '#4157b5',
  primaryActive: '#394b9b',
  primarySoft: 'rgba(80, 103, 201, 0.12)',
  accentColor: '#9a7045',
  accentSoft: 'rgba(154, 112, 69, 0.12)',
  successColor: '#47795e',
  warningColor: '#a47632',
  dangerColor: '#b15f67',
  contentBg: '#f5f1e8',
  contentBgSecondary: '#ece5d8',
  paperBg: '#fffdf7',
  paperBgStrong: '#f4ede2',
  panelBg: 'rgba(255, 252, 245, 0.9)',
  panelBorder: 'rgba(98, 82, 58, 0.16)',
  frameDivider: 'rgba(98, 82, 58, 0.1)',
  frameDividerStrong: 'rgba(98, 82, 58, 0.16)',
  frameSurfaceSubtle: 'rgba(115, 93, 64, 0.04)',
  frameSurfaceElevated: 'rgba(115, 93, 64, 0.08)',
  textPrimary: '#2f2a23',
  textSecondary: '#645a4e',
  textTertiary: '#8a7f72',
  textOnDark: '#2f2a23',
  textOnDarkSecondary: '#645a4e',
  sidebarBg: '#f1eadf',
  sidebarSurface: 'rgba(115, 93, 64, 0.05)',
  sidebarText: '#2f2a23',
  sidebarTextSecondary: '#6a6054',
  sidebarHoverBg: 'rgba(80, 103, 201, 0.06)',
  sidebarActiveBg: 'linear-gradient(135deg, rgba(154, 112, 69, 0.12), rgba(80, 103, 201, 0.14))',
  sidebarActiveText: '#24304f',
  sidebarBorder: 'rgba(98, 82, 58, 0.12)',
  userBubbleBg: 'linear-gradient(135deg, #dfe6fb 0%, #d7def7 100%)',
  userBubbleText: '#24304f',
  assistantBubbleBg: 'rgba(255, 255, 255, 0.72)',
  assistantBubbleBorder: 'rgba(98, 82, 58, 0.12)',
  assistantBubbleShadow: 'none',
  cardBlueBg: '#edf2ff',
  cardBlueBorder: '#c6d2f7',
  cardGreenBg: '#edf6f0',
  cardGreenBorder: '#bed8c6',
  cardYellowBg: '#f9f1e0',
  cardYellowBorder: '#dcc38d',
  cardRedBg: '#fbedef',
  cardRedBorder: '#e0bcc2',
  cardGreyBg: '#f3eee5',
  cardGreyBorder: '#d3c7b8',
  shadowSm: '0 6px 18px rgba(72, 54, 27, 0.06)',
  shadowMd: '0 10px 28px rgba(72, 54, 27, 0.08)',
  shadowLg: '0 18px 42px rgba(72, 54, 27, 0.1)',
  shadowFloat: '0 24px 52px rgba(72, 54, 27, 0.12)',
  appBackground:
    'radial-gradient(circle at top left, rgba(80, 103, 201, 0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(154, 112, 69, 0.08), transparent 22%), linear-gradient(180deg, #f7f3eb 0%, #f5f1e8 38%, #ece5d8 100%)',
  appGridPrimary: 'rgba(98, 82, 58, 0.06)',
  appGridSecondary: 'rgba(98, 82, 58, 0.04)',
  appGridMask: 'linear-gradient(180deg, rgba(255, 255, 255, 0.38), transparent 88%)',
  selectionBg: 'rgba(80, 103, 201, 0.18)',
  selectionText: '#1f2430',
  scrollThumb: 'rgba(98, 82, 58, 0.18)',
  scrollThumbHover: 'rgba(98, 82, 58, 0.28)',
  sidebarScrollThumb: 'rgba(98, 82, 58, 0.16)',
  sidebarScrollThumbHover: 'rgba(98, 82, 58, 0.24)',
  focusOutline: 'rgba(80, 103, 201, 0.38)',
  focusRing: 'rgba(80, 103, 201, 0.18)',
  focusRingSoft: 'rgba(80, 103, 201, 0.1)',
  buttonPrimaryBorder: 'rgba(80, 103, 201, 0.2)',
  buttonPrimaryBg: 'rgba(80, 103, 201, 0.12)',
  buttonPrimaryHoverBorder: 'rgba(80, 103, 201, 0.28)',
  buttonPrimaryHoverBg: 'rgba(80, 103, 201, 0.18)',
  buttonPrimaryActiveBorder: 'rgba(80, 103, 201, 0.34)',
  buttonPrimaryActiveBg: 'rgba(80, 103, 201, 0.24)',
  buttonPrimaryText: '#24304f',
  buttonDefaultBorder: 'rgba(98, 82, 58, 0.14)',
  buttonDefaultBg: 'rgba(255, 255, 255, 0.68)',
  buttonDefaultHoverBorder: 'rgba(98, 82, 58, 0.22)',
  buttonDefaultHoverBg: 'rgba(255, 255, 255, 0.9)',
  buttonDefaultActiveBorder: 'rgba(98, 82, 58, 0.24)',
  buttonDefaultActiveBg: 'rgba(246, 238, 225, 0.96)',
  buttonTextHoverBg: 'rgba(98, 82, 58, 0.06)',
  buttonTextActiveBg: 'rgba(98, 82, 58, 0.1)',
  buttonDisabledText: 'rgba(100, 90, 78, 0.46)',
  buttonDisabledBorder: 'rgba(98, 82, 58, 0.1)',
  buttonDisabledBg: 'rgba(98, 82, 58, 0.05)',
  buttonDangerText: '#8e4650',
  buttonDangerBorder: 'rgba(177, 95, 103, 0.18)',
  buttonDangerBg: 'rgba(177, 95, 103, 0.1)',
  buttonDangerHoverText: '#7b3640',
  buttonDangerHoverBorder: 'rgba(177, 95, 103, 0.24)',
  buttonDangerHoverBg: 'rgba(177, 95, 103, 0.14)',
  buttonDangerActiveBorder: 'rgba(177, 95, 103, 0.28)',
  buttonDangerActiveBg: 'rgba(177, 95, 103, 0.18)',
  buttonDangerPrimaryText: '#8e4650',
  buttonDangerPrimaryBorder: 'rgba(177, 95, 103, 0.18)',
  buttonDangerPrimaryBg: 'rgba(177, 95, 103, 0.1)',
  buttonDangerPrimaryHoverText: '#7b3640',
  buttonDangerPrimaryHoverBorder: 'rgba(177, 95, 103, 0.24)',
  buttonDangerPrimaryHoverBg: 'rgba(177, 95, 103, 0.14)',
  buttonDangerPrimaryActiveBorder: 'rgba(177, 95, 103, 0.28)',
  buttonDangerPrimaryActiveBg: 'rgba(177, 95, 103, 0.18)',
  controlBg: 'rgba(255, 255, 255, 0.72)',
  controlBorder: 'rgba(98, 82, 58, 0.14)',
  controlBorderHover: 'rgba(98, 82, 58, 0.22)',
  controlFocusShadow: '0 0 0 3px rgba(80, 103, 201, 0.14)',
  drawerBg: '#fffbf4',
  modalBg: '#fffbf4',
  tooltipBg: '#f6efe3',
  messageBg: '#fffaf2',
  dropdownBg: '#fffbf4',
  navActiveBg: 'rgba(80, 103, 201, 0.08)',
  navActiveBorder: 'rgba(80, 103, 201, 0.18)',
  navActiveText: '#24304f',
  surfaceFloating: 'rgba(255, 251, 244, 0.94)',
  surfaceFloatingStrong: 'rgba(255, 249, 239, 0.98)',
  toolbarBg: 'rgba(250, 244, 236, 0.78)',
  toolbarButtonBg: 'rgba(255, 255, 255, 0.72)',
  toolbarButtonHoverBg: 'rgba(255, 255, 255, 0.94)',
  overlayCanvas: 'rgba(255, 255, 255, 0.44)',
  overlayCanvasStrong: 'rgba(255, 252, 245, 0.92)',
  tableHeaderBg: 'rgba(80, 103, 201, 0.08)',
  tableRowBg: 'rgba(255, 255, 255, 0.76)',
  tableRowAltBg: 'rgba(245, 238, 228, 0.76)',
  tableRowHoverBg: 'rgba(80, 103, 201, 0.1)',
  tableCellBorder: 'rgba(98, 82, 58, 0.12)',
  codeInlineBg: 'rgba(80, 103, 201, 0.08)',
  codeInlineBorder: 'rgba(80, 103, 201, 0.14)',
  codeInlineText: '#3a4a89',
  blockquoteBg: 'rgba(154, 112, 69, 0.08)',
  blockquoteBorder: 'rgba(154, 112, 69, 0.42)',
  cardToneBg: 'rgba(98, 82, 58, 0.06)',
  cardToneText: '#8d6943',
  sessionItemBorder: 'rgba(98, 82, 58, 0.08)',
  sessionItemHoverBorder: 'rgba(98, 82, 58, 0.14)',
  sessionItemIconBg: 'rgba(98, 82, 58, 0.08)',
  sessionItemMenuHoverBg: 'rgba(98, 82, 58, 0.1)',
  sessionRenameBg: 'rgba(255, 255, 255, 0.9)',
  sessionRenameBorder: 'rgba(98, 82, 58, 0.18)',
  sessionRenameFocus: '0 0 0 2px rgba(80, 103, 201, 0.16)',
  sessionActiveMetaText: 'rgba(52, 60, 88, 0.76)',
  visualizeShellBg: '#f3ecdf',
  visualizeToolbarText: '#2f2a23',
  visualizeToolbarButtonBg: 'rgba(255, 255, 255, 0.82)',
  visualizeToolbarButtonBorder: 'rgba(98, 82, 58, 0.14)',
  visualizeToolbarButtonHoverBg: 'rgba(255, 255, 255, 0.96)',
  visualizeToolbarPrimaryBg: 'rgba(255, 251, 244, 0.9)',
  visualizeToolbarPrimaryBorder: 'rgba(98, 82, 58, 0.16)',
  visualizeToolbarPrimaryHoverBg: 'rgba(255, 255, 255, 0.98)',
  visualizeFrameBg: '#ffffff',
  emptySurfaceBg: 'rgba(255, 250, 241, 0.96)',
  emptySurfaceBorder: 'rgba(98, 82, 58, 0.14)',
  emptySurfaceShadow: '0 10px 28px rgba(72, 54, 27, 0.08)',
  feedbackInfoTagBg: 'rgba(80, 103, 201, 0.1)',
  feedbackInfoTagBorder: 'rgba(80, 103, 201, 0.16)',
  feedbackInfoTagText: '#4356a5',
  feedbackSuccessTagBg: 'rgba(71, 121, 94, 0.1)',
  feedbackSuccessTagBorder: 'rgba(71, 121, 94, 0.18)',
  feedbackSuccessTagText: '#3f684f',
  feedbackWarningTagBg: 'rgba(164, 118, 50, 0.1)',
  feedbackWarningTagBorder: 'rgba(164, 118, 50, 0.18)',
  feedbackWarningTagText: '#8d621f',
  feedbackDangerTagBg: 'rgba(177, 95, 103, 0.1)',
  feedbackDangerTagBorder: 'rgba(177, 95, 103, 0.18)',
  feedbackDangerTagText: '#904854',
};

/**
 * 主题字典。
 * 所有上层逻辑只通过 mode 访问，避免模块直接依赖具体 palette 常量。
 */
export const themePalettes: Record<ThemeMode, ThemePalette> = {
  dark: darkPalette,
  light: lightPalette,
};

/**
 * 把 palette 中的语义字段映射为 CSS 变量。
 * 使用 kebab-case 是为了让全局 less 与原生 DOM style 都能稳定消费。
 */
export function paletteToCssVariables(palette: ThemePalette): Record<string, string> {
  return {
    '--primary-color': palette.primary,
    '--primary-hover': palette.primaryHover,
    '--primary-active': palette.primaryActive,
    '--primary-soft': palette.primarySoft,
    '--accent-color': palette.accentColor,
    '--accent-soft': palette.accentSoft,
    '--success-color': palette.successColor,
    '--warning-color': palette.warningColor,
    '--danger-color': palette.dangerColor,
    '--content-bg': palette.contentBg,
    '--content-bg-secondary': palette.contentBgSecondary,
    '--paper-bg': palette.paperBg,
    '--paper-bg-strong': palette.paperBgStrong,
    '--panel-bg': palette.panelBg,
    '--panel-border': palette.panelBorder,
    '--frame-divider': palette.frameDivider,
    '--frame-divider-strong': palette.frameDividerStrong,
    '--frame-surface-subtle': palette.frameSurfaceSubtle,
    '--frame-surface-elevated': palette.frameSurfaceElevated,
    '--text-primary': palette.textPrimary,
    '--text-secondary': palette.textSecondary,
    '--text-tertiary': palette.textTertiary,
    '--text-on-dark': palette.textOnDark,
    '--text-on-dark-secondary': palette.textOnDarkSecondary,
    '--sidebar-bg': palette.sidebarBg,
    '--sidebar-surface': palette.sidebarSurface,
    '--sidebar-text': palette.sidebarText,
    '--sidebar-text-secondary': palette.sidebarTextSecondary,
    '--sidebar-hover-bg': palette.sidebarHoverBg,
    '--sidebar-active-bg': palette.sidebarActiveBg,
    '--sidebar-active-text': palette.sidebarActiveText,
    '--sidebar-border': palette.sidebarBorder,
    '--user-bubble-bg': palette.userBubbleBg,
    '--user-bubble-text': palette.userBubbleText,
    '--assistant-bubble-bg': palette.assistantBubbleBg,
    '--assistant-bubble-border': palette.assistantBubbleBorder,
    '--assistant-bubble-shadow': palette.assistantBubbleShadow,
    '--card-blue-bg': palette.cardBlueBg,
    '--card-blue-border': palette.cardBlueBorder,
    '--card-green-bg': palette.cardGreenBg,
    '--card-green-border': palette.cardGreenBorder,
    '--card-yellow-bg': palette.cardYellowBg,
    '--card-yellow-border': palette.cardYellowBorder,
    '--card-red-bg': palette.cardRedBg,
    '--card-red-border': palette.cardRedBorder,
    '--card-grey-bg': palette.cardGreyBg,
    '--card-grey-border': palette.cardGreyBorder,
    '--shadow-sm': palette.shadowSm,
    '--shadow-md': palette.shadowMd,
    '--shadow-lg': palette.shadowLg,
    '--shadow-float': palette.shadowFloat,
    '--app-background': palette.appBackground,
    '--app-grid-primary': palette.appGridPrimary,
    '--app-grid-secondary': palette.appGridSecondary,
    '--app-grid-mask': palette.appGridMask,
    '--selection-bg': palette.selectionBg,
    '--selection-text': palette.selectionText,
    '--scrollbar-thumb': palette.scrollThumb,
    '--scrollbar-thumb-hover': palette.scrollThumbHover,
    '--sidebar-scrollbar-thumb': palette.sidebarScrollThumb,
    '--sidebar-scrollbar-thumb-hover': palette.sidebarScrollThumbHover,
    '--focus-outline': palette.focusOutline,
    '--focus-ring': palette.focusRing,
    '--focus-ring-soft': palette.focusRingSoft,
    '--button-primary-border': palette.buttonPrimaryBorder,
    '--button-primary-bg': palette.buttonPrimaryBg,
    '--button-primary-hover-border': palette.buttonPrimaryHoverBorder,
    '--button-primary-hover-bg': palette.buttonPrimaryHoverBg,
    '--button-primary-active-border': palette.buttonPrimaryActiveBorder,
    '--button-primary-active-bg': palette.buttonPrimaryActiveBg,
    '--button-primary-text': palette.buttonPrimaryText,
    '--button-default-border': palette.buttonDefaultBorder,
    '--button-default-bg': palette.buttonDefaultBg,
    '--button-default-hover-border': palette.buttonDefaultHoverBorder,
    '--button-default-hover-bg': palette.buttonDefaultHoverBg,
    '--button-default-active-border': palette.buttonDefaultActiveBorder,
    '--button-default-active-bg': palette.buttonDefaultActiveBg,
    '--button-text-hover-bg': palette.buttonTextHoverBg,
    '--button-text-active-bg': palette.buttonTextActiveBg,
    '--button-disabled-text': palette.buttonDisabledText,
    '--button-disabled-border': palette.buttonDisabledBorder,
    '--button-disabled-bg': palette.buttonDisabledBg,
    '--button-danger-text': palette.buttonDangerText,
    '--button-danger-border': palette.buttonDangerBorder,
    '--button-danger-bg': palette.buttonDangerBg,
    '--button-danger-hover-text': palette.buttonDangerHoverText,
    '--button-danger-hover-border': palette.buttonDangerHoverBorder,
    '--button-danger-hover-bg': palette.buttonDangerHoverBg,
    '--button-danger-active-border': palette.buttonDangerActiveBorder,
    '--button-danger-active-bg': palette.buttonDangerActiveBg,
    '--button-danger-primary-text': palette.buttonDangerPrimaryText,
    '--button-danger-primary-border': palette.buttonDangerPrimaryBorder,
    '--button-danger-primary-bg': palette.buttonDangerPrimaryBg,
    '--button-danger-primary-hover-text': palette.buttonDangerPrimaryHoverText,
    '--button-danger-primary-hover-border': palette.buttonDangerPrimaryHoverBorder,
    '--button-danger-primary-hover-bg': palette.buttonDangerPrimaryHoverBg,
    '--button-danger-primary-active-border': palette.buttonDangerPrimaryActiveBorder,
    '--button-danger-primary-active-bg': palette.buttonDangerPrimaryActiveBg,
    '--control-bg': palette.controlBg,
    '--control-border': palette.controlBorder,
    '--control-border-hover': palette.controlBorderHover,
    '--control-focus-shadow': palette.controlFocusShadow,
    '--drawer-bg': palette.drawerBg,
    '--modal-bg': palette.modalBg,
    '--tooltip-bg': palette.tooltipBg,
    '--message-bg': palette.messageBg,
    '--dropdown-bg': palette.dropdownBg,
    '--nav-active-bg': palette.navActiveBg,
    '--nav-active-border': palette.navActiveBorder,
    '--nav-active-text': palette.navActiveText,
    '--surface-floating': palette.surfaceFloating,
    '--surface-floating-strong': palette.surfaceFloatingStrong,
    '--toolbar-bg': palette.toolbarBg,
    '--toolbar-button-bg': palette.toolbarButtonBg,
    '--toolbar-button-hover-bg': palette.toolbarButtonHoverBg,
    '--overlay-canvas': palette.overlayCanvas,
    '--overlay-canvas-strong': palette.overlayCanvasStrong,
    '--table-header-bg': palette.tableHeaderBg,
    '--table-row-bg': palette.tableRowBg,
    '--table-row-alt-bg': palette.tableRowAltBg,
    '--table-row-hover-bg': palette.tableRowHoverBg,
    '--table-cell-border': palette.tableCellBorder,
    '--code-inline-bg': palette.codeInlineBg,
    '--code-inline-border': palette.codeInlineBorder,
    '--code-inline-text': palette.codeInlineText,
    '--blockquote-bg': palette.blockquoteBg,
    '--blockquote-border': palette.blockquoteBorder,
    '--card-tone-bg': palette.cardToneBg,
    '--card-tone-text': palette.cardToneText,
    '--session-item-border': palette.sessionItemBorder,
    '--session-item-hover-border': palette.sessionItemHoverBorder,
    '--session-item-icon-bg': palette.sessionItemIconBg,
    '--session-item-menu-hover-bg': palette.sessionItemMenuHoverBg,
    '--session-rename-bg': palette.sessionRenameBg,
    '--session-rename-border': palette.sessionRenameBorder,
    '--session-rename-focus': palette.sessionRenameFocus,
    '--session-active-meta-text': palette.sessionActiveMetaText,
    '--visualize-shell-bg': palette.visualizeShellBg,
    '--visualize-toolbar-text': palette.visualizeToolbarText,
    '--visualize-toolbar-button-bg': palette.visualizeToolbarButtonBg,
    '--visualize-toolbar-button-border': palette.visualizeToolbarButtonBorder,
    '--visualize-toolbar-button-hover-bg': palette.visualizeToolbarButtonHoverBg,
    '--visualize-toolbar-primary-bg': palette.visualizeToolbarPrimaryBg,
    '--visualize-toolbar-primary-border': palette.visualizeToolbarPrimaryBorder,
    '--visualize-toolbar-primary-hover-bg': palette.visualizeToolbarPrimaryHoverBg,
    '--visualize-frame-bg': palette.visualizeFrameBg,
    '--empty-surface-bg': palette.emptySurfaceBg,
    '--empty-surface-border': palette.emptySurfaceBorder,
    '--empty-surface-shadow': palette.emptySurfaceShadow,
    '--feedback-info-tag-bg': palette.feedbackInfoTagBg,
    '--feedback-info-tag-border': palette.feedbackInfoTagBorder,
    '--feedback-info-tag-text': palette.feedbackInfoTagText,
    '--feedback-success-tag-bg': palette.feedbackSuccessTagBg,
    '--feedback-success-tag-border': palette.feedbackSuccessTagBorder,
    '--feedback-success-tag-text': palette.feedbackSuccessTagText,
    '--feedback-warning-tag-bg': palette.feedbackWarningTagBg,
    '--feedback-warning-tag-border': palette.feedbackWarningTagBorder,
    '--feedback-warning-tag-text': palette.feedbackWarningTagText,
    '--feedback-danger-tag-bg': palette.feedbackDangerTagBg,
    '--feedback-danger-tag-border': palette.feedbackDangerTagBorder,
    '--feedback-danger-tag-text': palette.feedbackDangerTagText,
  };
}
