# 变更提案：修正工作台路由切换时的 Chat Runtime 持续性

> Change ID: `update-chat-runtime-persistence-during-workbench`
> 状态：提案中
> 创建日期：2026-03-26

## 1. 背景

当前项目已经支持：

- 会话级“查看执行状态”入口
- 跳转到 `/visualize/:sessionId` 的沉浸式工作台
- 工作台 iframe 通过全局宿主保活

但在一个关键交互链路上出现了明显问题：

1. 用户在聊天页发送消息
2. assistant 仍在流式回复
3. 用户立即进入沉浸式工作台
4. 返回聊天页后，会话仍卡在 loading / 处理中状态
5. 输入区无法继续发送，执行状态入口也持续显示运行中

这说明当前 chat runtime 的消费位置存在结构性缺陷。

## 2. 问题定义

目前 chat adapter 的领域事件消费仍放在 `ChatPage` 容器内部：

- `ChatPage` 挂载时订阅消息增量、结构化结果、错误和 runtime 事件
- `ChatPage` 卸载时取消这些订阅

而沉浸式工作台路由是独立于聊天页的：

- 进入 `/visualize/:sessionId` 时，`ChatPage` 会卸载
- 但底层 adapter / transport 仍可能继续收到流式完成事件

这会导致：

- `message.completed` 无人消费
- `sendingSessionIds` 无法清理
- runtime 停留在 `writing / executing`
- 用户返回聊天页时看到“僵尸运行态”

## 3. 变更目标

### 3.1 用户目标

- 在 assistant 回复过程中进入工作台，不应导致当前会话卡死
- 返回聊天页后，应能看到正确完成的消息与正确的运行状态
- 输入区应恢复可编辑、可继续发送

### 3.2 架构目标

- 将 chat runtime 消费从页面级生命周期提升到全局常驻层
- 让 `/chat/:sessionId` 与 `/visualize/:sessionId` 共用同一套持续运行的 chat runtime
- 为后续真实 OpenClaw 直连和公司网关接入建立正确宿主层

### 3.3 风险控制目标

- 不推翻现有工作台保活方案
- 不修改消息渲染组件行为
- 优先通过 runtime 宿主层修复，而不是增加大量页面级补丁逻辑

## 4. 核心方案

### 4.1 新增全局常驻 `ChatRuntimeHost`

在 `AppShell` 层新增一个全局常驻宿主组件，职责包括：

- 建立 chat adapter 连接
- 持续消费 adapter 输出的领域事件
- 持续写入 `useChatStore` 与 `useVisualizeStore`
- 在运行态回到 `idle / error` 时兜底清理发送态

### 4.2 聊天页退化为视图容器

`ChatPage` 不再承担：

- adapter 连接
- 消息事件订阅
- runtime 同步

`ChatPage` 只负责：

- 会话创建与发送动作
- 欢迎页、消息列表、输入区、工作台入口等界面呈现

### 4.3 增加恢复兜底

即使未来 transport 偶发出现事件缺失，也需要增加最小兜底策略：

- 当某个会话 runtime 已回到 `idle / error`
- 但 `sendingSessionIds[sessionId]` 仍为真时
- 应在宿主层做防御式清理

## 5. 影响范围

- Affected code:
  - `src/components/Layout/AppShell.tsx`
  - `src/pages/Chat/index.tsx`
  - `src/services/chatAdapter.ts`
  - `src/stores/useChatStore.ts`
  - `src/stores/useVisualizeStore.ts`
  - `tests/**`

## 6. 成功标准

- assistant 流式回复过程中切到工作台，再返回聊天页，不再出现会话永久 loading
- `sendingSessionIds` 能正确清理
- runtime 能正确回到 `idle / error`
- 输入区恢复可继续发送
- 新增回归测试覆盖该场景
