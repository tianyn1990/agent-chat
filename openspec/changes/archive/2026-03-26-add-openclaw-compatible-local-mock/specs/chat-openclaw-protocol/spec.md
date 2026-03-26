## ADDED Requirements

### Requirement: Chat 层必须通过 OpenClaw-compatible 协议抽象接入

系统 SHALL 将 chat 传输层改造为面向 OpenClaw 协议骨架的抽象，并通过独立 adapter 向 UI 输出稳定领域对象，而不是让页面直接消费原始协议帧。

#### Scenario: 页面通过 adapter 消费消息与会话

- **WHEN** 聊天页初始化并建立本地 mock 连接
- **THEN** 页面应通过统一 adapter 获取会话、消息与执行状态
- **AND** 页面不应继续把旧自定义业务帧类型作为唯一协议边界

### Requirement: 系统必须提供 OpenClaw-compatible 本地 mock Gateway

系统 SHALL 在本地开发模式下提供一个兼容 OpenClaw 协议层级的 mock Gateway，用于替代当前仅面向页面业务帧的 mock 服务。

#### Scenario: 开发模式发送消息

- **WHEN** 开发者在本地 mock 模式下发送一条普通消息
- **THEN** mock Gateway 应返回符合 OpenClaw-compatible 结构的请求响应与事件流
- **AND** adapter 应将其翻译为当前 UI 可展示的 streaming 回复

#### Scenario: 首轮普通对话保留引导文案

- **WHEN** 某个会话第一次发送普通文本而非测试指令
- **THEN** 系统仍应返回固定引导文案
- **AND** 该行为应建立在新的 mock Gateway 与 adapter 链路上

### Requirement: 现有结构化消息与像素风办公室联动不得退化

系统 SHALL 在协议层改造后继续支持当前结构化消息渲染与会话级执行状态联动。

#### Scenario: 测试指令继续返回结构化结果

- **WHEN** 用户发送 `test card`、`test line`、`test table` 或类似测试指令
- **THEN** 系统应继续显示对应的卡片、图表或附件结果
- **AND** 这些结果应由 adapter 从 mock Gateway 事件翻译得到

#### Scenario: 执行状态继续驱动像素风办公室

- **WHEN** 当前会话进入发送、流式生成、完成或异常状态
- **THEN** 系统应继续更新该会话的 runtime
- **AND** 现有 visualize store 与本地 Star-Office bridge 应继续可消费该 runtime
