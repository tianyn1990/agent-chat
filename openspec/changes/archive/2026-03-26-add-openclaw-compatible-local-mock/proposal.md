# 变更提案：引入 OpenClaw-compatible 本地 mock 协议层

> Change ID: `add-openclaw-compatible-local-mock`
> 状态：提案中
> 创建日期：2026-03-26

## 1. 为什么要做

当前 `agent-chat` 的 chat 层仍基于仓库内自定义的 WebSocket 业务消息协议：

- 前端发送 `user_message`、`card_action`、`create_session`
- mock 返回 `message_chunk`、`card`、`chart`、`session_created`

这套实现适合前期快速开发，但已经成为后续对接 OpenClaw 的主要阻力：

1. mock 与 OpenClaw 的真实协议层级差距过大
2. 页面和 store 在多个位置直接依赖旧业务帧
3. 后续本地直连与公司网关接入时，回归成本会急剧上升
4. 像素风办公室当前主要依赖前端 fallback 状态，而非协议兼容的 runtime 输出

因此需要先做一个独立的第一阶段 change，把本地 mock 升级为 **OpenClaw-compatible mock**，并为后续真实接入打下稳定边界。

## 2. 本次变更目标

### 2.1 产品目标

- 本地 `npm run dev` 仍可完整使用 chat 功能
- 首轮普通对话引导、卡片、图表、附件、像素风办公室联动继续可用
- 不要求真实 OpenClaw 服务存在

### 2.2 架构目标

- 将 chat 层传输协议切换为面向 OpenClaw 的抽象
- 将 UI 消息模型与协议消息模型拆开
- 新增协议 transport 与 adapter，而不是让页面直接依赖 OpenClaw 原始帧
- 为后续 `openclaw-direct` 与 `openclaw-proxy` 保留同一套扩展点

### 2.3 测试目标

- 现有 chat 页面交互回归可验证
- mock Gateway 行为可单测覆盖
- 协议适配层的关键映射逻辑可单测覆盖
- 像素风办公室 runtime 桥接不会因协议改造失效

## 3. 变更范围

### 3.1 纳入范围

- 设计并实现 OpenClaw-compatible 本地 mock Gateway
- 新增协议层类型定义与 transport 抽象
- 新增 chat domain adapter
- 将 Chat 页面从旧 `mockWsService / wsService` 直接消费模式迁移到 adapter 模式
- 保持本地像素风办公室 mock / runtime 联动继续可用
- 补充对应单元测试与开发文档

### 3.2 不纳入范围

- 真实 OpenClaw 直连
- 公司网关 / BFF 接入
- 生产鉴权、安全策略和 trusted proxy 配置
- 完整接管真实 Star-Office-UI 状态来源
- 会话主键彻底迁移到真实 OpenClaw session 标识

## 4. 核心方案

### 4.1 协议分层

将当前混合结构拆成三层：

1. `OpenClaw Wire Protocol`
   - 定义握手、请求、响应、事件等协议类型
2. `Gateway Transport`
   - 负责连接、发送请求、订阅事件
3. `Chat Domain Adapter`
   - 负责把协议层翻译为当前 UI / store 可消费的消息和会话模型

### 4.2 mock 升级

本地 mock 不再直接发旧业务帧，而是模拟 OpenClaw 风格的：

- 握手
- 请求响应
- chat 事件
- agent 事件
- health 事件

同时保留当前开发期调试体验：

- 首轮普通对话固定返回引导文案
- `test card` / `test form` / `test line` / `test table` 等关键词继续生效

### 4.3 像素风办公室兼容

本次不改变当前 iframe 承接方案，但要求：

- 执行状态 runtime 的输出结构保持稳定
- adapter 能够继续驱动本地 Star-Office mock bridge
- 为未来以真实 OpenClaw 事件驱动 runtime 预留映射点

## 5. 影响范围

- Affected docs:
  - `docs/阶段七-OpenClaw协议接入总体方案.md`
  - `docs/07-阶段七-Mock转真实接口.md`
- Affected code:
  - `src/types/*`
  - `src/services/*`
  - `src/mocks/websocket.ts`
  - `src/pages/Chat/index.tsx`
  - `src/stores/useChatStore.ts`
  - `src/mocks/starOffice/*`
  - `tests/**`

## 6. 成功标准

- 前端不再直接依赖旧的自定义 chat 业务帧作为唯一协议边界
- 本地 mock 运行时仍能完成完整对话链路
- 现有卡片、图表、附件与像素风办公室联动无功能回退
- 文档能明确说明第一阶段和后续本地直连、公司网关之间的关系
