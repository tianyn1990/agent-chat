## ADDED Requirements

### Requirement: 系统必须支持本地直连真实 OpenClaw 的开发运行时

系统 SHALL 在保留 `OpenClaw-compatible mock` 的前提下，提供一个面向开发者本机真实 OpenClaw Gateway 的 `openclaw-direct` 运行时，并继续通过统一 adapter 向页面层输出会话、消息与执行状态。

#### Scenario: 开发者切换到 direct 运行时

- **WHEN** 开发者在本地开发环境中显式启用 `openclaw-direct`
- **THEN** 系统应建立真实 Gateway 连接并通过统一 adapter 输出会话、消息与执行状态
- **AND** 页面层不应直接消费 OpenClaw 原始协议帧

### Requirement: 本地直连运行时必须提供明确的边界与诊断

系统 SHALL 将本地直连能力限定在受控的开发环境范围内，并在配置缺失、当前 origin 不受支持或真实 Gateway 不可用时提供明确诊断，而不是静默回退或维持错误状态。

#### Scenario: 当前环境不满足本地直连前提

- **WHEN** 开发者启用 `openclaw-direct`，但缺少必要配置、当前页面 origin 不属于 localhost / 127.0.0.1，或真实 Gateway 不可连接
- **THEN** 系统应显示明确的 direct 模式不可用原因
- **AND** 系统不应伪装为已成功连接真实 OpenClaw

### Requirement: 本地直连运行时不得破坏当前会话级执行状态承接

系统 SHALL 在 `openclaw-direct` 模式下，继续让真实 Gateway 事件驱动当前的会话级执行状态 runtime，并保持像素风办公室承接链路可复用。

#### Scenario: 真实事件驱动执行状态变化

- **WHEN** 当前会话在真实 OpenClaw Gateway 中进入发送、生成、完成或异常状态
- **THEN** adapter 应将相关事件翻译为统一 runtime 更新
- **AND** 当前 visualize store 与工作台桥接应继续消费该 runtime
