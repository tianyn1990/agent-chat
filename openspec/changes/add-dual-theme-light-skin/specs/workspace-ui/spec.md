## MODIFIED Requirements

### Requirement: 主应用界面 SHALL 在双主题下保持统一的产品壳层体验

主应用界面 SHALL 在聊天页、技能页、登录页及相关核心页面中，同时支持 `dark` 与 `light` 两种主题，并在两种主题下都保持统一的产品壳层体验、布局秩序与信息层级。

#### Scenario: 用户在 dark 主题访问核心页面

- **WHEN** 用户访问聊天页、技能页或登录页且当前主题为 `dark`
- **THEN** 页面应继续保持当前 `Paper Ops / Graphite Console` 视觉主轴
- **AND** 不得因双主题改造导致 dark 页面回退为默认样式或出现明显视觉漂移

#### Scenario: 用户在 light 主题访问核心页面

- **WHEN** 用户访问聊天页、技能页或登录页且当前主题为 `light`
- **THEN** 页面应呈现统一的 `Ivory Editorial / Paper Console` 视觉主轴
- **AND** 不得退化为通用蓝白后台风或零散浅色补丁

### Requirement: 聊天页 SHALL 在不同主题下保持一致的舞台结构

聊天页 SHALL 无论在 `dark` 还是 `light` 主题下，都保持主舞台优先、底部 dock composer 稳定、欢迎态与对话态结构连续的工作台体验。

#### Scenario: 用户切换主题后继续聊天

- **GIVEN** 用户当前位于聊天页并已存在会话内容
- **WHEN** 用户切换主题
- **THEN** 消息阅读轨道、输入区与会话结构不得发生破坏性跳变
- **AND** 仅允许视觉表面层、文本对比和交互反馈随主题变化

### Requirement: Light 主题 SHALL 以纸面工作台而非默认后台风呈现

`light` 主题 SHALL 使用暖白纸面背景、石墨文本、低饱和靛蓝交互色和细分隔线建立工作台语义，而不是使用高饱和蓝白后台配色或厚卡片展示风格。

#### Scenario: 用户在 light 主题浏览主工作台

- **WHEN** 用户查看 light 主题下的聊天页或技能页
- **THEN** 页面应优先通过纸面底色、弱表面层和轻分隔建立结构
- **AND** 主 CTA 应保持克制、低饱和
- **AND** 不得出现大面积高亮蓝按钮、纯白厚卡片或强阴影主导的后台观感

### Requirement: 页面级加载态与错误态 SHALL 跟随当前主题

系统 SHALL 使页面级加载态、错误边界、空状态与过渡反馈跟随当前主题，避免在路由切换或异常场景中暴露错误主题。

#### Scenario: light 主题路由懒加载

- **GIVEN** 当前主题为 `light`
- **WHEN** 用户进入懒加载页面并触发加载占位
- **THEN** loading 背景、spinner 容器和文本应符合 `light` 主题
- **AND** 不得闪现 dark 背景
