# real-star-office-sidecar 规范增量

## ADDED Requirements

### Requirement: 系统必须支持真实 Star-Office-UI 以独立 sidecar 方式接入

当用户需要查看真实 Star-Office-UI 的像素办公室效果时，系统 MUST 支持运行真实上游应用，并以独立服务形式被 `agent-chat` 嵌入，而不是以假 mock 页面或 React 重写组件替代。

#### Scenario: 真实 sidecar 可用时嵌入执行状态面板

- **Given** 真实 Star-Office-UI sidecar 已启动
- **And** 前端已配置真实可访问的 Star-Office 地址
- **When** 用户在某个会话中打开执行状态面板
- **Then** 面板必须加载真实 Star-Office-UI 页面
- **And** 用户必须能够看到真实像素办公室效果

#### Scenario: 无真实 sidecar 时允许回退

- **Given** 当前环境未启动真实 Star-Office-UI sidecar
- **And** 未配置真实 Star-Office 地址
- **And** 本地 mock 已启用
- **When** 用户打开执行状态面板
- **Then** 系统必须回退到本地 mock 模式
- **And** 不得把本地 mock 误标记为真实 Star-Office-UI

#### Scenario: 已配置真实地址但 sidecar 不可用

- **Given** 前端已配置真实 Star-Office 地址
- **And** 当前真实 Star-Office-UI sidecar 不可用
- **When** 用户打开执行状态面板
- **Then** 系统必须显示明确的不可用提示
- **And** 不得静默切回本地 mock 模式
- **And** 不得把错误状态误标记为真实 Star-Office-UI 已成功接入

### Requirement: 会话级执行状态语义必须由适配层保证

系统在嵌入真实 Star-Office-UI 时，MUST 通过适配层或 facade 机制保证当前 iframe 展示的是目标会话的执行状态，而不是模糊的全局状态。

#### Scenario: 通过会话级 facade 入口访问

- **Given** 系统已接入真实 Star-Office-UI sidecar
- **When** 前端为某个会话生成执行状态 iframe 地址
- **Then** 该地址必须是可按 `sessionId` 直接寻址的会话级入口
- **And** 当前 change 的默认入口契约必须采用 `/star-office/session/:sessionId/`

#### Scenario: 打开指定会话的执行状态面板

- **Given** 用户当前选择的聊天会话为 `session-A`
- **When** 用户打开执行状态面板
- **Then** 系统必须能将该面板绑定到 `session-A`
- **And** Star-Office-UI 必须读取 `session-A` 对应的执行状态

#### Scenario: 多会话切换

- **Given** `session-A` 与 `session-B` 都存在运行态
- **When** 用户分别打开两个会话的执行状态视图
- **Then** 每个视图必须展示其绑定会话的状态
- **And** 不得发生跨会话状态串线

#### Scenario: 两个会话并发查看

- **Given** `session-A` 与 `session-B` 同时被两个独立视图查看
- **When** 两个视图并发拉取执行状态
- **Then** 系统必须按各自入口绑定的 `sessionId` 返回状态
- **And** 不得依赖单一全局“当前会话”来决定返回结果

### Requirement: 真实 sidecar 的引入方式必须具备可升级边界

系统在工程层引入真实 Star-Office-UI 时，MUST 使用可追踪、可升级、可回滚的方式管理上游来源，不能采用不可维护的散拷贝方式。

#### Scenario: 固定上游来源

- **Given** 团队决定引入真实 Star-Office-UI
- **When** 进入实现阶段
- **Then** 必须明确上游来源策略
- **And** 必须固定 commit、fork 或等价版本边界

#### Scenario: 上游升级

- **Given** 未来需要升级 Star-Office-UI 版本
- **When** 团队执行升级
- **Then** 必须可以识别本地 patch 与上游差异
- **And** 必须具备明确回滚路径

### Requirement: 真实视觉资源的许可证边界必须被显式记录

系统在接入真实 Star-Office-UI 时，MUST 把代码与素材的许可证边界清晰记录在案，并在可能存在商业交付风险时阻止默认直接商用。

#### Scenario: 存在商用交付风险

- **Given** 当前项目或目标部署环境可能存在商业用途
- **When** 团队计划把真实 Star-Office-UI 资源用于正式交付
- **Then** 必须先完成许可证核查、授权确认或素材替换方案
- **And** 不得仅凭开发验证结果默认视为可商用

#### Scenario: 文档审查

- **Given** 团队评审真实 sidecar 接入方案
- **When** 阅读相关文档
- **Then** 文档中必须明确说明许可证边界
- **And** 文档中必须说明这一约束对实现方式的影响

### Requirement: 本地开发必须支持真实 sidecar 的同域联调模式

系统在本地开发阶段 MUST 支持通过同域代理方式接入真实 Star-Office-UI sidecar，以便开发者在 `agent-chat` 中看到真实像素办公室效果。

#### Scenario: 本地真实 sidecar 联调

- **Given** 开发者已在本地启动真实 Star-Office-UI sidecar
- **And** 本地开发服务通过同域代理暴露该 sidecar
- **When** 开发者在本地打开某个会话的执行状态面板
- **Then** iframe 必须通过同域地址访问真实 sidecar
- **And** 开发者必须能够在本地看到真实像素办公室效果
