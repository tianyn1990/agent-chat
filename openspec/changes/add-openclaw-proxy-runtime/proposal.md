# 变更提案：增加公司网关代理运行时 `openclaw-proxy`

> Change ID: `add-openclaw-proxy-runtime`  
> 状态：提案中  
> 创建日期：2026-03-27

## Why

当前仓库已经完成了前两层能力：

1. `mock-openclaw`
   - 适合纯前端开发、UI 调整、自动化测试
   - 能稳定提供 OpenClaw-compatible mock 行为
2. `openclaw-direct`
   - 适合开发者本机直连真实 OpenClaw Gateway
   - 能验证真实握手、真实消息流与真实 runtime 事件

但最近的真实联调已经暴露出一个关键边界：

- 浏览器以 `webchat` 客户端身份直连 OpenClaw Gateway 时，`sessions.patch` 与 `sessions.delete` 不被允许
- 即使具备更高 scopes，这个边界仍然存在，因为它不是单纯的权限问题，而是客户端类型与协议职责边界问题

这意味着：

- `openclaw-direct` 适合作为“底层协议诊断模式”
- 但它不能承担未来正式环境中的“浏览器主接入方式”
- 如果后续公司把 OpenClaw 部署到容器或其他服务环境中，仅仅让浏览器换一个地址继续直连，并不能解决真实的会话管理问题

因此需要正式进入第三阶段，新增一个更贴近未来正式环境拓扑的运行时：

`Browser -> Company Gateway / BFF -> OpenClaw Gateway`

为了保证这条链路可以在本地先行验证，本 change 需要把“公司网关模式”设计并落地为：

- 前端新增 `openclaw-proxy` 运行时
- 本地提供一个可开发、可调试、可替代未来公司网关的最小 proxy / BFF 承接层
- 浏览器不再直接承担 OpenClaw 原生管理能力，而只消费受控的业务边界

这样做的直接收益是：

- 本地可以提前走“更贴近真实部署”的联调路径
- 会话管理能力可以由 proxy 以受控身份调用 OpenClaw，而不受 `webchat` 限制
- 后续公司正式网关接入时，前端不会再经历一次大的协议重构

## What Changes

- 新增 `openclaw-proxy` runtime，作为 `mock-openclaw` 与 `openclaw-direct` 之外的第三种 OpenClaw 接入模式
- 新增面向公司网关 / BFF 的 transport 与 adapter 设计，继续复用现有 `ChatAdapter` 领域边界
- 设计并实现本地可运行的 `company-gateway dev` 最小承接层，用于模拟未来正式环境拓扑
- 将浏览器侧的会话管理操作（如 `sessions.patch` / `sessions.delete`）从“直连 OpenClaw”改为“调用 proxy 暴露的受控接口”
- 明确 `openclaw-direct` 与 `openclaw-proxy` 的职责差异：
  - `openclaw-direct`：底层协议诊断
  - `openclaw-proxy`：更贴近真实部署的主联调模式
- 设计本地开发命令、环境变量、诊断信息与回退策略
- 明确像素风办公室在 `openclaw-proxy` 模式下继续如何接收会话级 runtime

## What This Change Will Not Do

- 不在本 change 中直接实现公司正式生产网关的完整鉴权体系
- 不在本 change 中落地公司组织、租户、审计平台等正式业务系统集成
- 不在本 change 中替换现有 `mock-openclaw` 或移除 `openclaw-direct`
- 不在本 change 中要求一次性覆盖 OpenClaw Gateway 的全部管理能力
- 不在本 change 中承诺已经完成最终生产部署脚本、容器编排与运维方案

## Scope

本 change 聚焦“本地可联调的公司网关模式最小闭环”，建议至少覆盖：

1. 运行时
   - `openclaw-proxy`
   - 环境变量、模式切换、诊断
2. 传输与适配
   - proxy transport
   - adapter 复用现有 UI 领域模型
3. 会话管理
   - `sessions.list`
   - `sessions.patch`
   - `sessions.delete`
4. 聊天能力
   - `chat.history`
   - `chat.send`
   - `chat.abort`
5. 本地开发体验
   - 启动脚本
   - 本地 proxy 与本地 OpenClaw 的联调方式
   - 失败时回退到 `mock-openclaw` 或切回 `openclaw-direct` 的明确说明

## Impact

- Affected specs:
  - `chat-openclaw-protocol`
- Affected docs:
  - `docs/阶段七-OpenClaw协议接入总体方案.md`
  - `docs/本地OpenClaw联调操作手册.md`
  - `docs/README.md`
  - `docs/项目进度总览.md`
- Affected code (implementation stage):
  - `src/config/chatRuntime.ts`
  - `src/constants/index.ts`
  - `src/services/openclawTransport.ts`
  - `src/services/chatAdapter.ts`
  - 新增 `proxy transport / proxy adapter / local company gateway dev server`
  - 与运行时切换、会话管理、工作台 runtime 相关的 tests / docs / scripts

## Success Criteria

- 开发者可以在本地显式切换到 `openclaw-proxy` 模式
- 浏览器在该模式下不再直连 OpenClaw 原生 Gateway，而是经过本地 company gateway dev 承接层
- 会话重命名与删除可以通过 proxy 路径真实生效，而不再受 `webchat clients cannot patch/delete sessions` 限制
- 当前页面层继续只消费统一 `ChatAdapter` 输出，不需要为了 company gateway 改写组件层
- 像素风办公室在该模式下仍能消费统一的会话级 runtime
- `mock-openclaw`、`openclaw-direct`、`openclaw-proxy` 三种模式职责清晰、能并存、能独立诊断

## Related Documents

- [../../../docs/阶段七-OpenClaw协议接入总体方案.md](../../../docs/阶段七-OpenClaw协议接入总体方案.md)
- [../../../docs/阶段七-本地直连OpenClaw开发联调方案.md](../../../docs/阶段七-本地直连OpenClaw开发联调方案.md)
- [../../../docs/本地OpenClaw联调操作手册.md](../../../docs/本地OpenClaw联调操作手册.md)
