# 设计文档：OpenClaw-compatible 本地 mock 协议层

> 对应 Change: `add-openclaw-compatible-local-mock`

## 1. 设计结论

本次 change 的设计结论如下：

1. 不直接把页面切换成消费 OpenClaw 原始帧
2. 先引入 OpenClaw 协议抽象层，再通过 adapter 输出 UI 领域对象
3. 本地 mock 优先升级成“协议兼容 mock Gateway”
4. 像素风办公室继续复用当前会话级 runtime 结构，不在第一阶段重写 visualize 体系

## 2. 当前架构问题

当前 chat 页面直接承担了过多协议职责：

- 自己感知 `message_chunk`、`card`、`chart`、`session_created`
- 自己拼接 streaming 消息
- 自己决定何时更新 session sending 状态
- 自己把运行态同步给 visualize store

这导致以下问题：

1. 协议变化会直接冲击页面容器
2. mock 与真实接入没有统一边界
3. 页面与 store 无法天然复用到本地直连和公司网关模式

## 3. 推荐分层

### 3.1 UI 领域层

继续保留：

- `Session`
- `Message`
- `SessionVisualizeRuntime`
- `InteractiveCard`
- `ChartMessage`

说明：

- 这些类型服务的是组件和 store
- 不应继续混入协议帧定义

### 3.2 OpenClaw 协议层

新增单独的类型文件定义：

- connect / challenge / hello
- req / res / event
- chat 相关 payload
- session 相关 payload
- agent 相关 payload
- health 相关 payload

说明：

- 第一阶段只定义本地 mock 和 adapter 需要的最小子集
- 对于文档中未稳定公开的字段，优先在类型中做可扩展结构，而不是假设完整固定 schema

### 3.3 Transport 层

新增统一 transport 接口，典型能力包括：

- `connect()`
- `disconnect()`
- `request(method, params)`
- `subscribe(eventType, handler)`
- `onStatus(handler)`

第一阶段实现：

- `MockOpenClawTransport`

后续阶段预留：

- `DirectOpenClawTransport`
- `ProxyOpenClawTransport`

### 3.4 Domain Adapter 层

新增 `OpenClawChatAdapter`，负责：

- 会话列表读取
- 历史消息读取
- 发送消息
- 中断消息
- 订阅 chat / agent 事件
- 翻译为 `useChatStore` 与 `useVisualizeStore` 所需的数据结构

## 4. 第一阶段建议覆盖的方法与事件

### 4.1 mock request 方法

建议第一阶段 mock 至少支持：

- `sessions.list`
- `chat.history`
- `chat.send`
- `chat.abort`
- `chat.inject`

说明：

- `chat.inject` 用于保留当前欢迎态快捷建议、技能跳转等“预填草稿/注入消息”的扩展余地
- 如果实现时发现当前 UI 暂时不需要真正调用，可先保留 transport 能力和 mock stub

### 4.2 mock 事件

建议第一阶段 mock 至少支持：

- `chat`
- `agent`
- `health`

说明：

- `tick` 若当前 adapter 不需要，可先不做
- `presence` 不是第一阶段主目标

## 5. 会话模型策略

第一阶段不强制把前端所有会话主键都迁移成真实 OpenClaw session 标识，但要满足两点：

1. adapter 内部要能维护“当前前端会话”和“协议层会话”的稳定绑定
2. 绑定逻辑不能散落在页面组件中

推荐做法：

- 在 mock Gateway 内部维护稳定的会话表
- adapter 通过统一方法读取、创建和绑定会话
- 页面只处理 `Session` 领域对象

## 6. streaming 与结果消息的处理策略

当前 UI 已经有稳定的 streaming 展示、卡片渲染、图表渲染和附件消息体验。  
第一阶段不应重写这些能力，而应通过 adapter 兼容现有渲染模型。

建议做法：

1. 协议层接收 chat / agent 事件
2. adapter 将其中的文本增量归并为当前 UI 的 `streamingBuffer`
3. adapter 将结构化结果翻译为 `card` / `chart` / `file` 对应的 `Message`
4. adapter 统一维护 sending、done、error、abort 等状态更新

## 7. 像素风办公室联动策略

当前像素风办公室依赖：

- `useVisualizeStore` 中按会话维护的 runtime
- `localStarOfficeBridge` 将 runtime 推送给本地 adapter

第一阶段建议保持这个边界不变。

也就是说：

- Chat adapter 内部负责把协议事件映射为 runtime
- `Visualize` 相关页面与 iframe 承接层无需感知 OpenClaw 协议细节

这样做的原因：

- 先稳定 chat 协议抽象
- 避免同时在第一阶段重构 chat 和 visualize 两条主链路

## 8. 文档与测试策略

### 8.1 文档

需要补齐：

- 第一阶段 change proposal / design / tasks / spec
- 总体方案文档中的第一阶段引用
- 阶段七真实接入文档中的阶段拆分说明

### 8.2 测试

需要补齐：

- mock transport 单元测试
- adapter 核心映射测试
- Chat 页面关键流程回归测试
- 像素风办公室 runtime 桥接回归测试

## 9. 风险控制

### 9.1 范围失控风险

第一阶段最大风险是把“本地 mock”“本地直连”“公司网关”混成一次改造。  
因此本 change 明确只做第一阶段，不提前实现后两阶段。

### 9.2 真实协议不完全确定风险

官方文档对部分 payload 细节可能会继续演进。  
第一阶段应优先：

- 对齐协议骨架
- 对齐方法和事件层级
- 保持类型与 adapter 的扩展性

而不是在没有真实联调的情况下假设全部字段都最终固定。

### 9.3 回归风险

Chat 页面当前已具备较多行为细节。  
因此迁移时必须优先保证：

- 首次引导 mock 仍可用
- 欢迎页快捷入口仍可创建会话并注入草稿
- streaming、附件、卡片、图表不退化
- 像素风办公室 runtime 不串线
