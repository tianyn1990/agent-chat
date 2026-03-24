# local-star-office-mock 规范增量

## ADDED Requirements

### Requirement: 开发模式必须提供可嵌入的本地执行状态页面

系统在开发模式下 MUST 支持一个无需额外外部服务的本地执行状态页面，以便 `agent-chat` 的 iframe 面板可以在 `npm run dev` 场景下完成自洽验证。

#### Scenario: 本地 mock 模式下打开执行状态面板

- **Given** `VITE_MOCK_ENABLED=true`
- **And** 本地执行状态 mock 已启用
- **And** 未配置外部 `VITE_STAR_OFFICE_URL`
- **When** 用户在某个会话中点击“查看执行状态”
- **Then** 面板必须加载本地 mock iframe 页面
- **And** 用户不需要再手动启动独立的 Star-Office-UI 服务

#### Scenario: 未启用本地 mock 且未配置外部地址

- **Given** 未配置外部 `VITE_STAR_OFFICE_URL`
- **And** 本地执行状态 mock 未启用
- **When** 用户打开执行状态面板
- **Then** 系统必须显示明确的配置提示
- **And** 不得静默显示空白 iframe

### Requirement: 本地 mock 状态必须按会话隔离

本地 mock adapter MUST 以 `sessionId` 作为状态查询和存储的主键，确保多会话场景下不会发生状态串线。

#### Scenario: 读取当前会话状态

- **Given** 会话 `session-A` 与 `session-B` 都存在本地 mock 状态
- **When** iframe 页面以 `sessionId=session-A` 打开
- **Then** 页面只能读取并展示 `session-A` 的状态
- **And** 不得展示 `session-B` 的状态

#### Scenario: 多会话并发更新

- **Given** 会话 `session-A` 正在 `writing`
- **And** 会话 `session-B` 正在 `executing`
- **When** 用户分别打开两个会话的执行状态入口
- **Then** 两个页面必须各自展示对应会话状态
- **And** 任一会话状态更新不得覆盖另一会话状态

#### Scenario: 缺少 sessionId

- **Given** iframe 页面在没有 `sessionId` 的情况下被访问
- **When** 页面初始化
- **Then** 页面必须显示“缺少会话 ID”错误
- **And** 不得回退到任意默认会话

### Requirement: 本地 mock adapter 必须提供贴近真实系统的状态接口

本地 mock adapter MUST 提供与执行状态页面解耦的状态接口，接口职责应贴近真实 Star-Office-UI 所依赖的状态接口，而不是依赖主应用内部私有对象。

#### Scenario: 查询主状态

- **Given** 某会话存在执行状态
- **When** 页面请求该会话的主状态接口
- **Then** 响应必须包含 `sessionId`
- **And** 响应必须包含 `state`
- **And** 响应必须包含 `detail`
- **And** 响应必须包含 `updatedAt`

#### Scenario: 查询多 Agent 状态

- **Given** 某会话存在执行状态
- **When** 页面请求该会话的 Agent 列表接口
- **Then** 响应必须返回该会话对应的 Agent 状态集合
- **And** 初始实现至少应包含一个主 Agent

#### Scenario: 主应用推送状态

- **Given** 前端会话运行态发生变化
- **When** 主应用向本地 mock adapter 推送状态
- **Then** adapter 必须按 `sessionId` 写入或更新状态
- **And** 后续查询必须能读取到最新状态

### Requirement: 本地 mock 页面必须反映当前会话上下文

本地 mock 页面 MUST 清晰表达其展示的是哪个会话、当前状态是什么，以及当前状态是否来自有效的 mock adapter 响应。

#### Scenario: 正常展示

- **Given** 页面已获取某会话的有效状态
- **When** 页面渲染完成
- **Then** 页面必须显示当前 `sessionId`
- **And** 页面必须显示当前状态标签
- **And** 页面必须显示状态详情
- **And** 页面必须显示最近更新时间

#### Scenario: 会话暂无状态

- **Given** 页面带有合法 `sessionId`
- **And** 当前 adapter 中尚无该会话状态
- **When** 页面初始化
- **Then** 页面必须显示“等待该会话的执行状态”之类的明确空态

#### Scenario: adapter 不可用

- **Given** 页面无法访问本地 mock adapter
- **When** 页面发起状态请求
- **Then** 页面必须显示 adapter 不可用提示
- **And** 页面不得误报为会话空闲

### Requirement: 本地 mock 能力必须只在开发或测试场景生效

本地 mock 能力 MUST 只作为开发和测试辅助能力存在，不得作为生产环境对最终用户暴露的正式功能入口。

#### Scenario: 生产环境不暴露本地 mock 能力

- **Given** 当前不是开发或测试模式
- **When** 系统进行构建或对外提供正式环境能力
- **Then** 系统不得要求最终用户依赖本地 mock 页面或 adapter 才能使用执行状态面板
- **And** 本地 mock 路由不得作为正式产品契约对外宣传

### Requirement: 本地 mock adapter 必须支持状态重置以服务测试与联调

本地 mock adapter MUST 提供受控的状态重置能力，以便在测试和联调场景中清理多会话脏状态。

#### Scenario: 重置本地 mock 状态

- **Given** adapter 中已经存在多个会话状态
- **When** 测试或开发工具调用状态重置能力
- **Then** adapter 必须清空当前保存的会话状态
- **And** 后续查询必须返回重置后的空态结果
