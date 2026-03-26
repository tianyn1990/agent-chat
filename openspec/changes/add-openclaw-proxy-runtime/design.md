## Context

当前项目已经具备三类关键基础：

1. 页面层已稳定依赖 `ChatAdapter` 领域边界，而不是直接消费原始协议帧
2. `mock-openclaw` 已可稳定承接本地开发与自动化测试
3. `openclaw-direct` 已证明真实 OpenClaw Gateway 的握手、历史、发送、runtime 事件都能跑通

但真实联调也明确暴露出 `openclaw-direct` 的边界：

- 其核心价值是“协议直连验证”
- 而不是“浏览器可直接承担正式业务管理能力”

最近日志已经给出强证据：

- `webchat clients cannot delete sessions; use chat.send for session-scoped updates`
- `webchat clients cannot patch sessions; use chat.send for session-scoped updates`

这说明公司正式环境如果继续采用“浏览器直连 OpenClaw”的模式，将至少在以下方面受限：

- 会话重命名
- 会话删除
- 未来更细粒度的管理能力与权限治理

因此第三阶段必须引入“公司网关 / BFF”层，而不是继续强化浏览器直连。

## Goals

- 新增 `openclaw-proxy` runtime，使本地也能模拟未来正式环境的接入拓扑
- 保持页面层、store 层继续只依赖统一 adapter 输出
- 让本地联调可以真实验证“会话管理通过服务端承接层落地”的路径
- 让 `openclaw-proxy` 成为后续本地主联调模式，`openclaw-direct` 退回到底层诊断模式
- 保持像素风办公室 runtime 语义继续以“会话级执行状态”为中心

## Non-Goals

- 不设计完整企业 SSO / RBAC / 审计系统
- 不定义最终生产部署的所有网关细节
- 不试图在本 change 中把所有 OpenClaw 原生能力都映射到 company gateway
- 不移除已有 `mock-openclaw` 或 `openclaw-direct`

## Proposed Architecture

### 1. 运行时分层

后续本地与生产将形成三个清晰模式：

1. `mock-openclaw`
   - 纯前端开发与稳定兜底
2. `openclaw-direct`
   - 本地直连真实 OpenClaw
   - 用于底层协议诊断与能力边界验证
3. `openclaw-proxy`
   - 浏览器连接本地或公司提供的 gateway proxy / BFF
   - 用于最贴近未来正式环境的主联调模式

### 2. 推荐调用拓扑

本地开发：

`Browser -> Local Company Gateway Dev -> Local OpenClaw Gateway`

未来正式环境：

`Browser -> Company Gateway / BFF -> Containerized OpenClaw Gateway`

关键点：

- 浏览器不再直接面对 OpenClaw 原生管理边界
- Proxy 负责把前端需要的“业务能力”翻译为后端可执行的 OpenClaw 调用
- 前端无需知道后端最终是否仍然使用原生 Gateway WS、HTTP facade，或更复杂的服务端编排

## Decisions

### Decision 1：新增 `openclaw-proxy` runtime，而不是复用 `legacy-websocket`

原因：

- `legacy-websocket` 承担的是历史兼容，不适合继续承载新阶段能力
- `openclaw-proxy` 需要被明确视为 OpenClaw 接入路线的第三阶段，而不是历史协议的回潮
- 独立 runtime 更利于诊断、测试与文档维护

### Decision 2：前端仍复用 `ChatAdapter`，不让页面感知 proxy 细节

原因：

- 现有 UI 与 store 已经投资在稳定领域模型上
- 若页面层直接转而消费 company gateway 返回的专用协议，会再次让协议边界泄漏到 UI
- 继续以 adapter 作为统一入口，mock / direct / proxy 才能真正形成并行可维护的三种模式

### Decision 3：本地先做“最小可跑的 company gateway dev”，而不是等待正式公司网关

原因：

- 当前问题已经阻塞到真实会话管理联调
- 如果必须等待正式公司网关，前端将长期处于“知道 direct 不够，但又无法验证 proxy”的真空期
- 本地 company gateway dev 的价值不在于模拟所有正式能力，而在于先跑通关键行为与边界

### Decision 4：`openclaw-direct` 继续保留，但定位下降为诊断模式

原因：

- Direct 模式仍是确认 OpenClaw 原生能力边界的唯一直接手段
- 当 `openclaw-proxy` 出现问题时，需要能快速判断问题出在：
  - 浏览器
  - company gateway 适配层
  - 真实 OpenClaw 原生行为

## Runtime and Transport Design

### 1. 前端运行时配置

新增：

- `VITE_CHAT_RUNTIME=openclaw-proxy`
- `VITE_OPENCLAW_PROXY_URL`
- 可选：`VITE_OPENCLAW_PROXY_WS_URL`
- 可选：本地 proxy dev 专用诊断配置项

保留：

- `mock-openclaw`
- `openclaw-direct`
- `legacy-websocket`

### 2. 前端 transport 抽象

当前抽象：

- `OpenClawGatewayTransport`

第三阶段应新增：

- `OpenClawProxyTransport`

是否共用同一接口，可在实现阶段评估两种方案：

方案 A：继续共用 `OpenClawGatewayTransport`
- 优点：复用度高
- 缺点：proxy 未必天然是 Gateway WS 帧协议

方案 B：新增更高一层 transport / client 抽象
- 优点：可适配 HTTP + SSE / WS hybrid
- 缺点：重构成本更高

当前推荐：

- 先实现最小 proxy transport，继续满足现有 adapter 所需能力
- 若后续发现 company gateway 返回协议明显偏离，再向上抽象一层 client interface

## Proxy Capability Boundary

### 1. 最小闭环能力

本 change 建议至少覆盖：

- `sessions.list`
- `sessions.patch`
- `sessions.delete`
- `chat.history`
- `chat.send`
- `chat.abort`
- 会话级 runtime / 执行状态订阅

### 2. 前端与 proxy 的契约原则

前端不要求 proxy 100% 透传 OpenClaw 原生方法名，但要求：

- 对前端保持稳定、可文档化的契约
- 能映射回现有 adapter 领域模型
- 错误语义清晰，不制造“看起来成功但并未真实成功”的假象

### 3. 删除与重命名语义

这是本阶段的关键差异点。

在 `openclaw-proxy` 模式下：

- 删除成功，必须表示后端真实成功
- 重命名成功，必须表示后端真实成功
- 不再允许本地前端做“伪隐藏 / 伪改名”兜底

原因：

- `openclaw-proxy` 的核心目标就是贴近未来真实部署路径
- 若继续允许前端本地兜底，会掩盖服务端适配层是否真正完成

## Local Development Topology

### 1. 本地推荐模式

开发者本地建议优先使用：

`npm run dev:openclaw-proxy`

该命令未来建议负责：

1. 启动本地 OpenClaw Gateway（或探测已存在实例）
2. 启动本地 company gateway dev
3. 启动 Vite
4. 为当前前端进程注入 `openclaw-proxy` 所需环境变量

### 2. 角色分工

本地调试时：

- `mock-openclaw`
  - UI / 回归 / 快速开发
- `openclaw-direct`
  - 底层协议边界确认
- `openclaw-proxy`
  - 主联调路径

## Visualize / Star-Office Boundary

`openclaw-proxy` 引入后，像素风办公室不应重新绑回浏览器本地推测，而应继续消费统一的会话级 runtime。

推荐策略：

- Proxy 负责把与会话相关的执行状态整理为前端可消费的 runtime 事件
- 前端的 visualize store 继续只消费统一 runtime
- 后续公司正式环境中的像素风办公室服务端适配层，也沿用同一 runtime 语义

## Risks / Trade-offs

### 风险 1：本地 company gateway dev 与未来正式公司网关可能不完全一致

缓解：

- 明确其目标是“最小闭环与契约验证”，不是提前复制全部生产实现
- 契约文档优先沉淀在本 change 中

### 风险 2：如果 proxy 契约设计得过于贴近当前前端，未来正式网关会被前端绑死

缓解：

- 保持前端依赖统一 adapter 领域边界
- 在 proxy 层记录清楚哪些字段属于临时 dev 契约，哪些字段属于长期稳定契约

### 风险 3：三种 runtime 并存，容易让文档和开发路径混乱

缓解：

- 明确角色：
  - mock = 稳定兜底
  - direct = 底层诊断
  - proxy = 主联调
- 在运行手册与 README 中统一描述

## Implementation Notes

实现阶段建议按以下顺序推进：

1. 运行时配置与环境变量
2. `openclaw-proxy` transport / adapter 骨架
3. 本地 company gateway dev 最小 server
4. 会话管理真实闭环
5. chat 发送 / 历史 / 中断闭环
6. runtime / visualize 联动
7. 本地开发脚本、测试与文档

## Open Questions

1. 本地 company gateway dev 是否直接使用 Node HTTP + SSE/WS，还是直接复用某个已有 server 容器？
2. 前端到 proxy 的协议是否完全对齐 OpenClaw method naming，还是改为更业务化的接口后再由 adapter 收口？
3. 像素风办公室 runtime 在 proxy 模式下，是否优先走后端汇总事件，而不是前端逐条 chat 事件推导？
