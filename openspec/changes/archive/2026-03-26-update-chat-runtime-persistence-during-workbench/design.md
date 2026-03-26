# 设计文档：工作台切换下的 Chat Runtime 常驻化

> 对应 Change: `update-chat-runtime-persistence-during-workbench`

## 1. 设计结论

本次修复的核心不是工作台 iframe，也不是 mock transport 本身，而是：

> chat runtime 的领域事件消费不应绑定在 `ChatPage` 生命周期上。

因此本次采用的设计结论是：

1. 新增全局常驻 `ChatRuntimeHost`
2. 将 adapter 事件消费提升到 `AppShell` 层
3. `ChatPage` 只保留用户操作与视图渲染职责
4. 增加运行态到发送态的兜底收敛逻辑

## 2. 根因分析

### 2.1 当前现象

当用户在 assistant 流式回复尚未结束时跳转到 `/visualize/:sessionId`：

- 工作台继续存在
- mock transport 仍在持续输出事件
- 但 `ChatPage` 已被路由切换卸载

于是出现：

- `message.delta` / `message.completed` / `runtime.changed` 无消费方
- store 保留在中间态
- 返回聊天页后出现永久 loading

### 2.2 为什么这是结构性问题

当前 `VisualizeWorkbenchHost` 已经被放到 `AppShell` 常驻层，说明“工作台保活”已经采用了正确的架构方向。  
但 chat runtime 仍放在 `ChatPage` 中，导致：

- 工作台常驻
- chat runtime 却不常驻

两者的生命周期不一致，是这次问题的根本原因。

## 3. 新架构

### 3.1 目标结构

```text
AppShell
  ├─ Outlet
  ├─ ChatRuntimeHost
  └─ VisualizeWorkbenchHost
```

### 3.2 职责划分

`ChatRuntimeHost`：

- 建立 adapter 连接
- 消费 `message.delta / completed / card / chart / error / runtime.changed`
- 更新 chat store / visualize store
- 负责发送态与 runtime 的一致性收敛

`ChatPage`：

- 创建会话
- 发送消息
- 发送卡片动作
- 读取 store 并渲染 UI

## 4. 事件处理策略

### 4.1 宿主层接管消息事件

以下逻辑统一迁移到 `ChatRuntimeHost`：

- 创建 streaming message 占位
- 追加 streamingBuffer
- finalizeStream
- 结构化卡片 / 图表消息入库
- 错误提示与运行态同步

### 4.2 发送态清理策略

除了原本在 `message.completed / card / chart / error` 事件里清理发送态之外，再增加一层兜底：

- 当 runtime 状态变为 `idle` 或 `error`
- 自动清理该 session 的 `sendingSessionIds`

这样即使未来某个 transport 实现偶发缺少完成事件，也不容易留下永久卡死状态。

## 5. 为什么不采用“返回聊天页后 history 回补”作为主方案

因为那只是事后补救，不解决核心问题：

- 工作台期间仍然没有消费者
- 中途状态仍可能错乱
- 真实 OpenClaw 阶段会有更多 agent/tool 事件，history 无法完整恢复

因此 history 回补最多只能作为后续增强项，不适合作为本次主修复方案。

## 6. 测试策略

本次至少补三类验证：

1. `ChatRuntimeHost` 自身事件消费测试
2. 路由切到 `/visualize/:sessionId` 后 runtime 仍持续推进的测试
3. 返回聊天页后发送态恢复正常的回归测试

## 7. 兼容性与风险

### 7.1 对现有 UI 的影响

较小。

因为：

- 消息列表
- 输入框
- 卡片与图表渲染
- 工作台 iframe

都不需要重写，只是 runtime 消费位置发生提升。

### 7.2 对后续阶段的帮助

这是后续本地直连真实 OpenClaw 的必要前置：

- 真实 Gateway 事件不会因为页面切换而停掉
- runtime 常驻层可以继续接 `agent` 事件
- 页面层保持更薄，后续联调更稳
