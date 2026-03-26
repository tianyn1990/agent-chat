# 设计文档：本地直连真实 OpenClaw 开发运行时

> 对应 Change: `add-openclaw-direct-dev-runtime`

## 1. Context

当前仓库状态已经具备以下基础：

- 第一阶段 `OpenClaw-compatible mock` 已完成
- 页面层通过统一 `ChatAdapter` 消费消息、会话与执行状态
- `ChatRuntimeHost` 已常驻到宿主层，避免路由切换导致流式事件丢失
- 像素风办公室继续消费 `SessionVisualizeRuntime`

这意味着第二阶段不应再去重构 UI 组件，而应直接在传输层与适配层补真实运行时能力。

与此同时，OpenClaw 官方资料明确了几个关键边界：

- Gateway 采用统一的握手 + `req / res / event` 协议，而不是旧业务型 WebSocket 帧
- Web 客户端存在 device identity / pairing / secure context 等浏览器接入约束
- session 的事实来源应是 Gateway，而不是前端本地生成的一套伪 session

因此，本地直连阶段要解决的，不是“换一个 WS 地址”，而是“在浏览器开发环境中，以受控方式接入真实 Gateway，并把真实会话和事件翻译回现有 UI 领域模型”。

## 2. Goals / Non-Goals

### 2.1 Goals

- 新增 `openclaw-direct` 本地开发运行时
- 保持页面继续消费统一 `ChatAdapterEvent`
- 对接真实 `sessions.list / chat.history / chat.send / chat.abort`
- 对接真实 `chat / agent / health` 事件，并映射到现有 UI 领域事件
- 把真实 Gateway 事件继续桥接给像素风办公室 runtime
- 在本地开发场景下提供明确的连接配置、诊断与回退策略

### 2.2 Non-Goals

- 不做公司生产网关 / BFF 方案
- 不做最终鉴权、审计和组织权限模型
- 不把本地直连推广为正式环境推荐架构
- 不在本阶段一次性接通所有业务接口
- 不为了真实 Gateway 而推翻当前 UI 层与路由层设计

## 3. Decisions

### 3.1 引入显式运行时，而不是继续复用 `VITE_MOCK_ENABLED`

#### Decision

新增显式 `chat runtime` 概念，建议至少支持：

- `mock-openclaw`
- `openclaw-direct`
- `legacy-websocket`（仅兼容保留，后续逐步退出）

#### Why

当前 `VITE_MOCK_ENABLED=true/false` 只能表达“是否走 mock”，无法表达：

- 是否已经切入 OpenClaw 协议骨架
- 是否正在直连真实 Gateway
- 是否仍在兼容旧业务型 websocket

如果继续使用单个布尔开关，第二阶段会导致多条链路纠缠，后续公司网关阶段也会继续扩散条件分支。

### 3.2 本阶段仅支持 `localhost / 127.0.0.1` 的浏览器直连

#### Decision

`openclaw-direct` 运行时只面向开发者本机回环地址：

- `http://localhost:*`
- `http://127.0.0.1:*`

不把局域网 IP、测试域名或远程开发机列入本阶段支持范围。

#### Why

本地直连的目标是验证真实协议与真实 session，而不是提前解决生产安全边界。  
浏览器接入真实 Gateway 会涉及：

- secure context
- device identity
- pairing / approval
- 连接来源约束

若一开始就把 LAN 或非本地场景纳入，会把本阶段膨胀成“半个生产接入工程”。

### 3.3 页面层继续只消费 adapter 输出

#### Decision

继续保留 `Wire Protocol Layer -> Domain Adapter Layer -> UI` 结构，不允许页面直接解析 OpenClaw 原始帧。

#### Why

这样才能保证：

- mock / direct / proxy 三种模式共用同一 UI
- 第三阶段公司网关可以复用同一适配层
- 页面无需关心握手、协议细节和错误帧

### 3.4 多会话采用“先验证再定型”的策略

#### Decision

本阶段先把“真实 Gateway session 能否稳定承载当前前端多会话语义”作为显式验证项，而不是先写死最终产品策略。

推荐分两层处理：

1. **事实层**
   - 页面展示的真实会话列表与历史，应以 Gateway 返回为准
2. **产品层**
   - “新建对话”是否可以映射到 app-owned `sessionKey`
   - 若不可行，direct 模式下需要收敛交互并给出明确说明

#### Why

OpenClaw session 文档能证明 Gateway 存在稳定 session 语义，但并不能直接推出：

- 浏览器可以无约束创建任意新 sessionKey
- 当前前端的“空白会话草稿”一定与真实 Gateway 行为一一对应

这类假设若未验证就落到实现，会把第二阶段做成“表面直连，实际仍靠本地推测”。

### 3.5 真实执行状态优先来自 Gateway 事件，前端 fallback 退居兜底

#### Decision

`openclaw-direct` 模式下：

- 优先使用真实 `chat / agent / health` 事件驱动 `SessionVisualizeRuntime`
- 前端 fallback 仅保留为防御性收敛手段

#### Why

像素风办公室已经是会话级入口，继续依赖前端推测会弱化第二阶段的意义。  
第二阶段必须回答“真实 Gateway 事件能否驱动当前工作台”的问题。

## 4. Runtime Architecture

### 4.1 逻辑拓扑

```text
Browser (localhost / 127.0.0.1)
  └─ agent-chat
      ├─ runtime selector
      ├─ DirectOpenClawTransport
      ├─ OpenClawChatAdapter
      ├─ ChatRuntimeHost
      └─ Visualize runtime / Star-Office bridge

Local OpenClaw Gateway
  ├─ handshake
  ├─ sessions.list
  ├─ chat.history
  ├─ chat.send
  ├─ chat.abort
  └─ chat / agent / health events
```

### 4.2 分层职责

`DirectOpenClawTransport`：

- 建立真实 WebSocket
- 处理握手与连接状态
- 统一 request / response 生命周期
- 订阅并分发 Gateway event
- 输出明确的错误码与诊断上下文

`OpenClawChatAdapter`：

- 读取真实 session 列表与消息历史
- 将真实 Gateway event 翻译成 `ChatAdapterEvent`
- 把真实 agent 事件翻译成 `SessionVisualizeRuntime`
- 对 UI 隐藏协议层差异

`ChatRuntimeHost`：

- 常驻消费 adapter 事件
- 继续更新 `useChatStore` 与 `useVisualizeStore`
- 保持工作台与聊天页路由切换期间的运行时连续性

## 5. Session Strategy

### 5.1 真实事实来源

`sessionKey` 与 `sessionId` 的事实来源必须是 OpenClaw Gateway。  
在 `openclaw-direct` 模式下，前端不应继续假设本地生成的 `sessionId` 就是最终事实来源。

### 5.2 页面主键策略

推荐策略：

- UI 路由层继续使用 `sessionId` 这个命名，以减少页面大改
- 但在 direct 模式下，这个字段实际承载真实 `sessionKey`
- 如确有必要，再由 adapter 内部维护 `sessionKey -> routeSessionId` 的最小映射

这样能减少第二阶段的 UI 改动面。

### 5.3 “新建对话”的处理

本阶段要显式验证以下问题：

1. Gateway 是否接受应用分配的稳定 `sessionKey`
2. Gateway 是否允许用新的 key 自然物化为新会话
3. 若不允许，当前“新建空白会话草稿”要如何退化

建议实施顺序：

1. 先打通读取真实 session 与发送消息
2. 再验证新建策略
3. 根据验证结果决定：
   - 保留现有多会话 UX
   - 或 direct 模式下临时收敛为“已有会话 + 重置当前会话”

## 6. Diagnostics and Failure Modes

本阶段必须提供可见、可诊断的失败反馈，至少覆盖：

- Gateway URL 缺失
- 当前 origin 非 localhost / 127.0.0.1
- 握手失败
- device identity / pairing 失败
- 请求超时
- 方法不存在或版本不兼容
- 会话读取失败

失败时不应：

- 静默切回 mock
- 继续显示“已连接”假状态
- 让工作台继续消费过期 runtime

## 7. Star-Office Integration Boundary

本阶段不新增新的工作台交互模式。  
工作台继续沿用当前会话级 runtime 消费方式，但 runtime 的事实来源要改为真实 Gateway 事件。

也就是说：

- 工作台入口与页面交互保持不变
- `SessionVisualizeRuntime` 结构尽量保持稳定
- 只替换其数据来源

这样可以把协议接入与 UI 交互拆开治理。

## 8. Risks / Trade-offs

### 8.1 浏览器安全约束风险

风险：

- 真实 Gateway 的浏览器接入可能要求更严格的 secure context / pairing 流程

缓解：

- 本阶段明确限定 localhost
- 在设计和实现中加入显式诊断，不做隐式猜测

### 8.2 多会话产品语义风险

风险：

- 当前“新建对话”与真实 Gateway session 语义可能存在偏差

缓解：

- 把新建策略列为单独验证项
- 若验证未通过，direct 模式下先收敛交互而不是伪造事实来源

### 8.3 协议演进风险

风险：

- 真实 Gateway schema 可能与 mock 最小子集存在差异

缓解：

- 保持协议模型层与 adapter 解耦
- 先覆盖真实联调所需最小闭环，再逐步扩展

## 9. Migration Plan

1. 新增 direct runtime 配置与连接诊断入口
2. 新增 `DirectOpenClawTransport`
3. 让 `getActiveChatAdapter()` 按 runtime 选择 transport / adapter
4. 打通真实 `sessions.list / chat.history / chat.send / chat.abort`
5. 打通 `chat / agent / health` 事件映射
6. 将真实 runtime 映射接入当前工作台桥接
7. 验证新建对话策略
8. 补齐测试、文档与回退说明

## 10. Open Questions

- 真实 Gateway 在浏览器直连场景下，device identity 的最小实现边界是什么
- 当前开发环境是否需要一个本地配置页或调试面板来录入 direct runtime 参数
- direct 模式下，“新建对话”是否需要阶段性地展示为受限能力
- 是否需要将 direct 运行时状态显式展示在 UI 顶部或开发诊断区

## 11. References

- OpenClaw Gateway Protocol: https://docs.openclaw.ai/gateway/protocol
- OpenClaw Session Concepts: https://docs.openclaw.ai/concepts/session
- OpenClaw WebChat: https://docs.openclaw.ai/web/webchat
- OpenClaw Control UI: https://docs.openclaw.ai/web/control-ui
- OpenClaw Trusted Proxy Auth: https://docs.openclaw.ai/gateway/trusted-proxy-auth
