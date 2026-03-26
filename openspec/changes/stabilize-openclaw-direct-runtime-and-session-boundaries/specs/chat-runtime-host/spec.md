## MODIFIED Requirements

### Requirement: Chat Runtime 必须在工作台路由切换期间保持持续运行

系统 SHALL 将 chat runtime 的消息与运行态消费提升为全局常驻能力，确保从聊天页切换到沉浸式工作台时不会丢失流式完成事件。

同时，系统 SHALL 保证 runtime 到本地工作台承接层的桥接不依赖聊天是否处于 mock 模式，而依赖当前是否启用了本地 Star-Office 承载能力。

#### Scenario: assistant 回复中进入工作台

- **WHEN** 用户在 assistant 仍处于流式回复过程中进入 `/visualize/:sessionId`
- **THEN** chat runtime 应继续消费该会话的消息事件与运行态事件
- **AND** 不得因为 `ChatPage` 卸载而中断消息完成处理

#### Scenario: direct 模式下进入工作台后仍持续推送 runtime

- **WHEN** 用户使用 `openclaw-direct` 模式发送消息后进入当前会话工作台
- **THEN** 全局 runtime 宿主应继续将该会话 runtime 桥接给本地工作台承接层
- **AND** 不得因为当前聊天模式不是 mock 而停止桥接

### Requirement: 返回聊天页后会话发送态必须恢复正确

系统 SHALL 在工作台返回聊天页后，保证当前会话不会残留错误的发送中状态。

系统同时 SHALL 区分“消息已发出但首个 delta 尚未到达”的 pending 状态，与“已进入 streaming”的状态，并确保这两类状态在工作台往返后都能正确恢复。

#### Scenario: 工作台返回后恢复输入能力

- **WHEN** 用户在流式回复过程中进入工作台，等待回复完成后再返回聊天页
- **THEN** 当前会话的 `sendingSessionIds` 应已被清理
- **AND** 输入区应恢复可继续发送
- **AND** 工作台入口不应继续错误显示为处理中

#### Scenario: pending 状态在工作台往返后不残留假忙碌

- **WHEN** 用户在消息刚发送、首个 delta 尚未到达时切换到工作台并返回
- **THEN** 若会话已完成或失败，pending 状态应被正确清理
- **AND** 不得出现消息已结束但界面仍长期显示处理中
