## ADDED Requirements

### Requirement: 系统必须支持面向公司网关的 `openclaw-proxy` 运行时

系统 SHALL 在保留 `mock-openclaw` 与 `openclaw-direct` 的前提下，新增一个以公司网关 / BFF 为浏览器统一入口的 `openclaw-proxy` 运行时，并继续通过统一 adapter 向页面层输出会话、消息与执行状态。

#### Scenario: 开发者切换到 company gateway 模式

- **WHEN** 开发者在本地开发环境中显式启用 `openclaw-proxy`
- **THEN** 浏览器应连接本地或公司提供的 proxy / BFF，而不是继续直连 OpenClaw 原生 Gateway
- **AND** 页面层不应因为运行时切换而直接依赖新的原始协议帧

### Requirement: 会话管理能力必须通过 proxy 路径真实落地

系统 SHALL 在 `openclaw-proxy` 模式下，通过服务端承接层提供真实的会话管理能力，而不是继续依赖浏览器 `webchat` 客户端对 OpenClaw 原生 `sessions.patch` / `sessions.delete` 的直接调用。

#### Scenario: 通过 proxy 真实重命名与删除会话

- **WHEN** 用户在 `openclaw-proxy` 模式下对某个会话执行重命名或删除
- **THEN** 系统应由 proxy 以受控方式调用后端能力并真实生效
- **AND** 前端不得再以“本地隐藏 / 本地覆盖标题”伪装成成功

### Requirement: 三种 OpenClaw 运行时必须保持清晰边界并可独立诊断

系统 SHALL 让 `mock-openclaw`、`openclaw-direct`、`openclaw-proxy` 三种模式并存，并向开发者清楚表达它们各自的职责边界与诊断语义。

#### Scenario: 开发者在不同模式下排查问题

- **WHEN** 开发者分别使用 `mock-openclaw`、`openclaw-direct` 与 `openclaw-proxy`
- **THEN** 系统应能清晰说明当前是否走 mock、原生直连或 company gateway 路径
- **AND** 文档应明确 `openclaw-direct` 属于底层协议诊断模式，`openclaw-proxy` 属于更贴近真实环境的主联调模式
