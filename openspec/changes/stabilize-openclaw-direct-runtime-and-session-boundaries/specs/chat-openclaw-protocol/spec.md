## MODIFIED Requirements

### Requirement: Chat 层必须通过 OpenClaw-compatible 协议抽象接入

系统 SHALL 将 chat 传输层改造为面向 OpenClaw 协议骨架的抽象，并通过独立 adapter 向 UI 输出稳定领域对象，而不是让页面直接消费原始协议帧。

在本地直连真实 OpenClaw Gateway 的 `openclaw-direct` 模式下，系统还 SHALL：

- 使 device auth 握手与当前 Gateway 的真实 `auth` 选择逻辑保持一致
- 在可恢复的 device signature 异常下提供受控恢复路径
- 将真实 session 列表继续翻译为当前 UI 可消费的会话模型，但默认只暴露当前 dashboard 会话命名空间

#### Scenario: 页面通过 adapter 消费消息与会话

- **WHEN** 聊天页初始化并建立本地 mock 连接
- **THEN** 页面应通过统一 adapter 获取会话、消息与执行状态
- **AND** 页面不应继续把旧自定义业务帧类型作为唯一协议边界

#### Scenario: direct 模式刷新后继续稳定握手

- **WHEN** 开发者在 `openclaw-direct` 模式下刷新页面，浏览器已缓存当前 role 对应的 device token
- **THEN** transport 应按与真实 `connect.auth` 一致的 token 语义生成 device signature
- **AND** 页面不应因为错误的签名 payload 长期陷入 `device signature invalid`

#### Scenario: device signature 异常触发受控恢复

- **WHEN** direct 握手失败且失败原因属于 `device signature invalid` 或 `device signature expired`
- **THEN** 系统应至多执行一次受控恢复
- **AND** 恢复过程应保留稳定 device identity、清理冲突的缓存 token 并重新握手
- **AND** 若恢复后仍失败，应向页面暴露明确诊断而不是静默重试

### Requirement: 现有结构化消息与像素风办公室联动不得退化

系统 SHALL 在协议层改造后继续支持当前结构化消息渲染与会话级执行状态联动。

在 `openclaw-direct` 模式下，系统还 SHALL：

- 让本地工作台承接层继续消费真实 Gateway runtime，而不是只在 mock 聊天模式下工作
- 保持会话级执行状态入口的“微型像素显示器”视觉语义
- 为消息发送提供首个 delta 到来前的 pending 视觉承接

#### Scenario: 测试指令继续返回结构化结果

- **WHEN** 用户发送 `test card`、`test line`、`test table` 或类似测试指令
- **THEN** 系统应继续显示对应的卡片、图表或附件结果
- **AND** 这些结果应由 adapter 从 mock Gateway 事件翻译得到

#### Scenario: 执行状态继续驱动像素风办公室

- **WHEN** 当前会话进入发送、流式生成、完成或异常状态
- **THEN** 系统应继续更新该会话的 runtime
- **AND** 现有 visualize store 与本地 Star-Office bridge 应继续可消费该 runtime

#### Scenario: direct 模式下工作台继续消费真实 runtime

- **WHEN** 开发者使用 `openclaw-direct` 模式发送消息并打开当前会话工作台
- **THEN** 本地 Star-Office 承接层应继续收到当前会话的 runtime 更新
- **AND** 工作台不应因为聊天 runtime 已切到 direct 模式而失去执行状态

#### Scenario: 发送后立即可见 pending 承接

- **WHEN** 用户在当前会话发送消息且 assistant 尚未返回首个 delta
- **THEN** 消息区应立即展示一个轻量 pending 承接行
- **AND** 待首个 delta 到来后，该承接行应平滑切换到真实 streaming 消息

#### Scenario: 消息级复制操作收敛为次级动作

- **WHEN** 用户 hover 或聚焦到某条可复制消息
- **THEN** 系统应继续提供复制能力
- **AND** 复制操作区应表现为 icon-only 的次级动作，不应继续抢占主消息视觉层级
