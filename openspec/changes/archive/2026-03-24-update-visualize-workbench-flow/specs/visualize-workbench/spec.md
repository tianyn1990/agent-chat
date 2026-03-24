## ADDED Requirements

### Requirement: 聊天页执行状态入口必须默认打开摘要侧栏

系统 MUST 在聊天页中默认通过摘要侧栏承接执行状态入口，而不是在右侧直接加载完整真实 `Star-Office-UI` iframe。

#### Scenario: 从消息操作打开执行状态

- **Given** 用户当前位于某个聊天会话
- **When** 用户点击“查看执行状态”
- **Then** 系统必须打开执行状态摘要侧栏
- **And** 摘要侧栏必须显示当前会话的状态摘要
- **And** 摘要侧栏不得默认直接承载完整真实像素办公室 iframe

### Requirement: 系统必须提供沉浸式执行状态工作台

系统 MUST 提供独立的沉浸式执行状态工作台，用于完整承载真实 `Star-Office-UI` 页面。

#### Scenario: 从摘要侧栏进入沉浸式工作台

- **Given** 用户已打开某会话的执行状态摘要侧栏
- **When** 用户点击“进入沉浸式执行状态”
- **Then** 系统必须进入该会话的沉浸式工作台
- **And** 工作台必须承载该会话对应的真实执行状态 iframe

#### Scenario: 直接访问工作台路由

- **Given** 用户直接访问 `/visualize/:sessionId`
- **When** 页面加载完成
- **Then** 系统必须展示该会话的沉浸式执行状态工作台

### Requirement: 沉浸式工作台关闭时必须保活 iframe

系统 MUST 在关闭沉浸式工作台时隐藏而不是销毁当前 iframe，以避免真实 `Star-Office-UI` 每次重新初始化。

#### Scenario: 关闭后再次打开同一会话工作台

- **Given** 用户已经打开过 `session-A` 的沉浸式工作台
- **And** 对应 iframe 已完成初始化
- **When** 用户关闭工作台后再次打开 `session-A` 的工作台
- **Then** 系统必须复用已有 iframe
- **And** 不得重新创建新的同会话 iframe 实例

#### Scenario: 收起工作台

- **Given** 用户正在查看沉浸式工作台
- **When** 用户执行“收起工作台”
- **Then** 工作台可以从视图中隐藏
- **And** 当前 iframe 实例必须继续保留在前端运行时中

### Requirement: 摘要侧栏与工作台必须共享同一会话上下文

系统 MUST 保证执行状态摘要侧栏和沉浸式工作台始终绑定同一 `sessionId`，不得出现上下文错位。

#### Scenario: 当前会话摘要与工作台一致

- **Given** 摘要侧栏当前绑定 `session-A`
- **When** 用户从该摘要侧栏进入沉浸式工作台
- **Then** 工作台必须展示 `session-A`
- **And** 不得切换到其他会话的执行状态
