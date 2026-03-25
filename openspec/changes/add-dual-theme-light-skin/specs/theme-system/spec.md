## ADDED Requirements

### Requirement: 系统 MUST 提供运行时双主题能力

系统 MUST 支持在不刷新页面的情况下于 `dark` 与 `light` 两种主题之间切换，并使当前主题即时作用于全局样式、页面壳层与组件层。

#### Scenario: 用户在应用内切换主题

- **WHEN** 用户触发主题切换操作
- **THEN** 当前页面应立即切换到目标主题
- **AND** 不得要求用户手动刷新页面
- **AND** 已挂载路由与常驻宿主组件应同步更新主题表现

### Requirement: 系统 MUST 使用统一的语义 token 来源驱动主题

系统 MUST 以统一的语义 token / palette 作为主题真源，用于驱动 CSS、LESS、Ant Design 组件 token 与图表主题，避免不同层各自维护颜色值。

#### Scenario: 组件消费主题值

- **WHEN** 任意页面组件、全局样式或 Ant Design 组件需要使用主题颜色与表面层
- **THEN** 它们必须来自统一的主题真源
- **AND** 不得分别维护互相漂移的 dark / light 颜色常量

### Requirement: 系统 MUST 持久化并恢复用户的主题偏好

系统 MUST 在本地持久化用户选定的主题模式，并在应用启动时优先恢复该偏好，减少首屏主题闪烁。

#### Scenario: 用户刷新页面

- **GIVEN** 用户此前已选择 `light` 主题
- **WHEN** 用户刷新页面或重新打开应用
- **THEN** 系统必须恢复 `light` 主题
- **AND** 应在主界面出现前完成根节点主题同步

### Requirement: 主题系统 MUST 覆盖全局反馈层与 portal 组件

主题系统 MUST 覆盖通过 portal 渲染的反馈与承载组件，包括但不限于 `Toast`、`Modal`、`Drawer`、`Tooltip`、`Popover` 与 `Notification`，避免主题切换后这些组件残留旧主题。

#### Scenario: light 主题下弹出反馈组件

- **GIVEN** 当前应用处于 `light` 主题
- **WHEN** 系统展示 Toast、Modal 或 Tooltip
- **THEN** 这些组件必须使用 `light` 主题的背景、边框与文本对比
- **AND** 不得回退到 dark 或默认 Ant Design 样式

### Requirement: 图表与数据展示层 MUST 跟随当前主题

系统 MUST 使图表、表格、分页、代码块与富文本结果容器跟随当前主题调整背景、边框、文本、网格线和交互反馈。

#### Scenario: 用户在 light 主题查看图表结果

- **WHEN** 用户在 `light` 主题下查看图表或表格结果
- **THEN** 图表坐标文字、网格线、容器背景与表格头体样式必须与 `light` 主题一致
- **AND** 不得继续使用仅适用于 dark 的 `classicDark` 或等价表现
