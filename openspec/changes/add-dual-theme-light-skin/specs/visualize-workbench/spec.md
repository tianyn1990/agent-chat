## MODIFIED Requirements

### Requirement: 沉浸式执行状态工作台 SHALL 与主应用主题保持一致的外层承载体验

沉浸式执行状态工作台 SHALL 使其外层承载页、遮罩、悬浮控制条和返回控件跟随主应用当前主题变化，同时继续保持 `iframe-first` 原则。

#### Scenario: 用户在 light 主题打开沉浸式工作台

- **GIVEN** 当前主应用处于 `light` 主题
- **WHEN** 用户打开沉浸式执行状态工作台
- **THEN** 工作台外层背景、悬浮按钮和边缘控件应适配 `light` 主题
- **AND** iframe 真实画面仍应占据主视口绝大部分面积

### Requirement: 真实 Star-Office iframe 内容 SHALL 保持独立视觉边界

系统 SHALL 将真实 `Star-Office-UI` iframe 视为独立沉浸层，不要求其内部像素办公室内容跟随主应用主题重绘，但必须让外层承载边界清晰且不冲突。

#### Scenario: 主应用主题切换时工作台已打开

- **GIVEN** 用户已打开沉浸式工作台
- **WHEN** 用户切换主应用主题
- **THEN** 外层承载 chrome 应同步主题
- **AND** iframe 内真实像素办公室内容不得被主应用主题样式强行覆盖
- **AND** 返回与刷新等必要控件仍应保持清晰可用
