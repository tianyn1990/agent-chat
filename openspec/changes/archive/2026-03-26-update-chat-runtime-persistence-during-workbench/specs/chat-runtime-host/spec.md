## ADDED Requirements

### Requirement: Chat Runtime 必须在工作台路由切换期间保持持续运行

系统 SHALL 将 chat runtime 的消息与运行态消费提升为全局常驻能力，确保从聊天页切换到沉浸式工作台时不会丢失流式完成事件。

#### Scenario: assistant 回复中进入工作台

- **WHEN** 用户在 assistant 仍处于流式回复过程中进入 `/visualize/:sessionId`
- **THEN** chat runtime 应继续消费该会话的消息事件与运行态事件
- **AND** 不得因为 `ChatPage` 卸载而中断消息完成处理

### Requirement: 返回聊天页后会话发送态必须恢复正确

系统 SHALL 在工作台返回聊天页后，保证当前会话不会残留错误的发送中状态。

#### Scenario: 工作台返回后恢复输入能力

- **WHEN** 用户在流式回复过程中进入工作台，等待回复完成后再返回聊天页
- **THEN** 当前会话的 `sendingSessionIds` 应已被清理
- **AND** 输入区应恢复可继续发送
- **AND** 工作台入口不应继续错误显示为处理中

### Requirement: Runtime 状态必须具备防御式收敛能力

系统 SHALL 在 runtime 已进入终态时，自动收敛会话发送态，避免偶发事件丢失导致永久卡死。

#### Scenario: runtime 回到 idle 时清理发送态

- **WHEN** 某个会话的 runtime 更新为 `idle` 或 `error`
- **THEN** 系统应保证该会话不会继续残留发送中状态
