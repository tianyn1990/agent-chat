# 阶段七：OpenClaw 协议接入总体方案

> 最后更新：2026-03-26
>
> 本文档用于统一说明 `agent-chat` 从“当前自定义 chat mock 协议”演进到“可接入真实 OpenClaw 协议体系”的总体路线。本文不直接等同于某一个实现 change，而是作为后续多个 change 的上位方案文档。

## 1. 背景与目标

当前项目的对话能力已经稳定，但底层仍主要依赖仓库内自定义的 WebSocket 业务消息协议：

- 前端直接发送 `user_message`、`card_action`、`create_session`
- mock 直接回推 `message_chunk`、`card`、`chart`、`session_created`
- 页面与 store 在多个位置默认这些业务消息类型就是“真实后端协议”

这套方式适合前期快速开发，但会带来三个问题：

1. 无法直接对接公司后续部署的 OpenClaw 实例
2. mock 与真实协议差距过大，越往后联调改动越大
3. 像素风办公室的执行状态目前更多依赖前端 fallback 推测，而不是真实 Gateway 事件

因此，下一阶段需要完成的不是“简单替换一个 WebSocket 地址”，而是把 chat 层逐步演进为：

- 外部协议边界兼容 OpenClaw
- 内部 UI 仍保持稳定的领域模型
- 本地开发继续支持 mock
- 后续可逐步增加本地真实 OpenClaw 联调和公司网关接入

## 2. 当前问题分析

### 2.1 当前协议层过于贴近页面业务

当前仓库中：

- [src/types/message.ts](../src/types/message.ts)
- [src/services/websocket.ts](../src/services/websocket.ts)
- [src/mocks/websocket.ts](../src/mocks/websocket.ts)

同时承担了两种职责：

1. UI 消息领域模型
2. WebSocket 传输协议模型

这会导致后续只要后端协议变化，页面与 store 也要跟着大改。

### 2.2 OpenClaw 协议层级与当前实现不同

根据 OpenClaw 官方文档，Gateway 协议不是“直接发业务消息 type”的模式，而是统一的 WS RPC / event 协议体系。核心特点包括：

- 连接建立需要握手
- 客户端通过统一请求格式调用方法
- 服务端以 `res` 和 `event` 形式返回结果与流式状态
- chat、session、agent、health 等能力共享同一协议骨架

这说明后续若直接让页面组件消费 OpenClaw 原始帧，会让 UI 与协议强耦合，不利于维护。

### 2.3 多会话与执行状态需要统一事实来源

当前前端已经形成多会话产品语义，像素风办公室也已经演进到“会话级入口”。  
但如果 chat 层继续使用本地自定义 session 与本地推测状态，后面接 OpenClaw 时会出现两个事实来源：

- 前端自己的 `sessionId`
- OpenClaw 的 `sessionKey / sessionId`

这会直接影响：

- 会话列表
- 历史消息加载
- 中断当前轮回复
- 像素风办公室显示哪个会话

## 3. 总体设计原则

### 3.1 协议向 OpenClaw 对齐，UI 不直接绑定 OpenClaw 原始帧

推荐采用双层模型：

1. `Wire Protocol Layer`
   - 面向 OpenClaw Gateway 的请求、响应、事件
2. `Domain Adapter Layer`
   - 面向 `agent-chat` 页面、store 与组件的统一领域模型

这样做的原因是：

- 对外可以兼容 OpenClaw
- 对内可以保护现有 UI 投资
- mock、直连、公司网关都能复用同一适配层

### 3.2 mock 必须保留，而且要升级为协议兼容 mock

mock 不应被删除，而应从“自定义业务消息 mock”升级为“OpenClaw-compatible mock gateway”。

保留 mock 的原因：

- 本地开发不能强依赖真实 OpenClaw
- 自动化测试需要稳定、可控、可复现的数据源
- 联调前需要快速验证 UI、卡片、图表、像素办公室与异常路径

### 3.3 执行状态应逐步从前端 fallback 迁移到 Gateway 事件

当前像素风办公室已具备会话级承接能力。后续应逐步改为：

- 优先用 OpenClaw 的 chat / agent 事件驱动执行状态
- 前端 fallback 只作为兜底，而不是主事实来源

## 4. 三阶段实施路线

本阶段建议拆为三个阶段推进，避免一次性把 mock、直连、生产接入混在一起。

---

## 4.1 第一阶段：本地 mock（包含像素风办公室）

### 4.1.1 目标

在不依赖真实 OpenClaw 服务的情况下，让 `agent-chat`：

- 使用 OpenClaw-compatible 的传输协议与适配层
- 保持现有 UI、卡片、图表、附件与多会话体验
- 像素风办公室继续可用
- 本地测试和开发依然稳定

### 4.1.2 这阶段要解决什么

1. 将当前自定义 `mockWsService` 升级为“Mock OpenClaw Gateway”
2. 将当前 `message.ts` 中混合的 UI 类型和协议类型拆开
3. 新增 OpenClaw 协议 transport 与 adapter
4. 让 Chat 页面不再直接依赖 `user_message` / `message_chunk` 这类旧业务帧
5. 将像素风办公室状态桥接到新的 adapter 输出

### 4.1.3 推荐实现边界

本阶段建议只覆盖以下能力：

- 连接握手
- 会话列表读取
- 会话历史读取
- 发送消息
- 中断消息
- chat 事件
- agent 事件
- health 事件
- 与像素风办公室 runtime 的最小联动

本阶段不做：

- 真实 OpenClaw 连接
- 生产安全策略
- 公司网关认证

### 4.1.4 本阶段交付形态

交付后，开发者在本地 `npm run dev` 下应该看到：

- chat 页面仍可正常使用
- 首次普通对话仍可得到固定引导 mock
- `test card`、`test line`、`test table` 等调试指令仍可用
- 像素风办公室仍可显示并根据会话执行状态变化
- 底层代码结构已经切换为 OpenClaw-compatible 架构

### 4.1.5 为什么第一阶段先做它

因为它是风险最低、收益最高的起点：

- 先把协议骨架和领域边界理顺
- 再接真实 OpenClaw 时不用推翻页面层
- 后续本地直连和公司网关都基于同一套抽象继续演进

---

## 4.2 第二阶段：本地直连

### 4.2.1 目标

在开发者本机已启动真实 OpenClaw 的前提下，让 `agent-chat` 能直接连接本地 OpenClaw，用于更高保真的联调验证。

### 4.2.2 典型适用场景

- 联调前验证真实 Gateway 协议
- 验证真实 session 模型
- 验证真实 chat / agent 事件流
- 验证像素风办公室是否能由真实事件驱动

### 4.2.3 这阶段应新增什么

1. `openclaw-direct` runtime
2. 真实 Gateway 握手、重连与 resync
3. `sessions.list` / `chat.history` / `chat.send` / `chat.abort` 真实接入
4. 本地环境变量与运行说明
5. 面向像素风办公室的真实事件驱动状态桥接

### 4.2.4 这阶段的边界

本阶段主要服务于本地研发与联调，不代表最终生产拓扑。  
即使本地支持 direct，也不意味着公司正式环境应让浏览器直连 OpenClaw。

---

## 4.3 第三阶段：公司网关

### 4.3.1 目标

在公司正式部署环境中，以受控的业务网关或 BFF 作为浏览器接入 OpenClaw 的统一入口。

### 4.3.2 推荐原则

生产环境不建议浏览器直接暴露 OpenClaw Gateway 原生接入细节，而应采用：

`Browser -> Company Gateway / BFF -> OpenClaw Gateway`

原因：

- 更容易处理认证、审计、权限与流量控制
- 可以屏蔽 pairing、trusted proxy、origin 限制等细节
- 可以对外收敛为更稳定的业务边界
- 更适合集成公司自己的会话、组织与日志系统

### 4.3.3 这阶段应新增什么

1. `openclaw-proxy` runtime
2. 公司网关协议约定
3. 鉴权策略
4. 错误码和可观测性
5. 像素风办公室服务端适配层与 session facade 的真实落地

---

## 5. 推荐的代码分层

建议后续按以下分层演进：

### 5.1 UI 领域模型层

保留并继续服务现有组件：

- `Session`
- `Message`
- `Attachment`
- `InteractiveCard`
- `ChartMessage`
- `SessionVisualizeRuntime`

### 5.2 OpenClaw 协议模型层

单独定义：

- 握手帧
- 请求帧
- 响应帧
- 事件帧
- chat / session / agent / health 相关 payload

### 5.3 传输层

抽象统一 transport：

- `mock-openclaw`
- `openclaw-direct`
- `openclaw-proxy`

### 5.4 适配层

负责把 OpenClaw 协议翻译为 UI 领域对象，避免页面直接处理原始协议。

## 6. 会话与像素风办公室的关系

### 6.1 会话主键策略

后续建议尽量让前端会话与 OpenClaw session 形成稳定绑定，而不是长期维护两套平行主键。  
在真实接入阶段，优先以 OpenClaw 的真实 session 标识作为事实来源，再由前端路由与 UI 做展示适配。

### 6.2 像素风办公室状态来源

后续执行状态应按以下优先级获取：

1. OpenClaw `chat` / `agent` 真实事件
2. 公司网关或 visualize adapter 输出的会话级 runtime
3. 前端 fallback 推测状态

### 6.3 本地 mock 阶段的目标

第一阶段不要求把像素风办公室改成真实 OpenClaw 驱动，但要求：

- 像素风办公室入口与会话绑定保持稳定
- runtime 结构与未来 OpenClaw adapter 输出一致
- 后续替换为真实事件时不需要推翻 iframe 承接层

## 7. 风险与注意事项

### 7.1 不要让组件层直接消费 OpenClaw 原始帧

否则：

- 页面会被协议细节污染
- mock、直连、公司网关三种模式会分叉
- 后续调整会导致大面积回归

### 7.2 不要把“本地直连”误当成“生产方案”

本地直连适合研发调试，但生产更适合公司网关。

### 7.3 第一阶段要控制范围

第一阶段的成功标准不是“接通真实服务”，而是：

- 协议骨架切换完成
- mock 仍可工作
- 像素风办公室仍可工作
- UI 与测试体系稳定

## 8. 阶段拆分建议

建议按以下顺序推进：

1. `add-openclaw-compatible-local-mock`
   - 仅做第一阶段
2. `add-openclaw-direct-dev-runtime`
   - 本地直连真实 OpenClaw
3. `add-company-openclaw-gateway`
   - 公司网关接入

这样每个 change 的目标都清晰，评审和回归压力也更可控。

## 9. 相关文档

- [07-阶段七-Mock转真实接口.md](./07-阶段七-Mock转真实接口.md)
- [06-阶段六-可视化集成与优化.md](./06-阶段六-可视化集成与优化.md)
- [阶段六-服务端适配层设计.md](./阶段六-服务端适配层设计.md)
- [阶段六-真实Star-Office-UI侧车接入方案.md](./阶段六-真实Star-Office-UI侧车接入方案.md)
- [Star-Office-UI-部署指南.md](./Star-Office-UI-部署指南.md)

## 10. 参考资料

以下资料用于确认 OpenClaw 的协议层级、会话语义与 Web 侧接入边界：

- OpenClaw Gateway Protocol: https://docs.openclaw.ai/gateway/protocol
- OpenClaw WebChat: https://docs.openclaw.ai/web/webchat
- OpenClaw Control UI: https://docs.openclaw.ai/web/control-ui
- OpenClaw Session Concepts: https://docs.openclaw.ai/concepts/session
- OpenClaw Trusted Proxy Auth: https://docs.openclaw.ai/gateway/trusted-proxy-auth

> 说明：
> - 上述资料中关于“浏览器直连”和“trusted proxy”的判断，主要用于指导第二、第三阶段边界。
> - 关于“前端应避免直接消费原始协议帧、应增加 domain adapter”属于结合本项目现状作出的工程推断，不是 OpenClaw 文档原文表述。
