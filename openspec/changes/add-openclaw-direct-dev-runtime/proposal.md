# 变更提案：增加本地直连真实 OpenClaw 开发运行时

> Change ID: `add-openclaw-direct-dev-runtime`
> 状态：提案中
> 创建日期：2026-03-26

## Why

当前仓库已经完成第一阶段的 `OpenClaw-compatible mock` 协议抽象，页面层也已经通过统一的 `chat adapter` 消费会话、消息与执行状态。这一步解决了“本地开发不再直接依赖旧业务帧”的问题，但还没有解决一个更关键的研发问题：

- 无法验证真实 OpenClaw Gateway 的握手、请求、响应与事件流
- 无法确认真实 `sessionKey / sessionId` 语义与当前多会话产品语义如何对齐
- 无法验证像素风办公室是否能真正由 OpenClaw 的 `chat / agent` 事件驱动

如果继续只停留在 mock 阶段，后续进入公司网关 / BFF 接入时，仍然会同时面对三类不确定性：

1. 浏览器如何与真实 Gateway 建立连接
2. 真实 session 模型与当前前端会话模型如何绑定
3. 执行状态如何从真实 Gateway 事件映射为当前可视化 runtime

因此需要新增第二阶段 change，专门解决“开发者本机直连真实 OpenClaw”的问题，并把它与“本地 mock”“公司网关”明确分层。

## What Changes

- 新增 `openclaw-direct` 本地开发运行时，用于浏览器直连本机真实 OpenClaw Gateway
- 在现有 `transport + adapter` 分层上增加真实 direct transport，而不是重写页面层
- 明确 `localhost / 127.0.0.1` 才属于本阶段支持范围，不把本地直连误用为生产方案
- 新增真实 Gateway 握手、状态管理、错误诊断与运行时切换设计
- 新增真实 `sessions.list / chat.history / chat.send / chat.abort` 接入范围说明
- 设计真实 `chat / agent / health` 事件到 `ChatAdapterEvent` 与 `SessionVisualizeRuntime` 的映射
- 明确本地直连阶段对“新建对话 / 多会话”采取“先验证真实 sessionKey 绑定能力，再决定最终产品语义”的策略
- 补充阶段文档、进度文档与阶段七入口文档的引用关系

## What This Change Will Not Do

- 不在本 change 中实现公司正式环境的网关 / BFF / trusted proxy
- 不在本 change 中把浏览器直连方案推广到生产部署
- 不在本 change 中立即替换飞书登录、技能市场、文件上传等所有真实接口
- 不在本 change 中承诺已经完全覆盖 OpenClaw 官方全部 Gateway schema
- 不在本 change 中立即落地最终的商用鉴权与审计方案

## Impact

- Affected specs:
  - `chat-openclaw-protocol`
- Affected docs:
  - `docs/阶段七-OpenClaw协议接入总体方案.md`
  - `docs/07-阶段七-Mock转真实接口.md`
  - `docs/项目进度总览.md`
  - `docs/README.md`
- Affected code (implementation stage):
  - `src/services/openclawTransport.ts`
  - `src/services/chatAdapter.ts`
  - `src/types/openclaw.ts`
  - `src/components/Chat/ChatRuntimeHost.tsx`
  - 与运行时配置、诊断、会话绑定相关的 store / utils / tests

## Success Criteria

- 开发者能在本机真实 OpenClaw 已启动的前提下，显式切换到 `openclaw-direct` 运行时
- 页面层继续只消费 adapter 输出，不直接消费 OpenClaw 原始协议帧
- 本地直连模式下可以读取真实 session、历史消息、发送消息并接收真实事件
- 当前像素风办公室 runtime 能消费真实 Gateway 事件驱动的执行状态
- 配置缺失、连接失败、非 localhost 场景都能得到明确诊断，而不是静默回退或假成功

## Related Documents

- [../../../docs/阶段七-OpenClaw协议接入总体方案.md](../../../docs/阶段七-OpenClaw协议接入总体方案.md)
- [../../../docs/阶段七-本地直连OpenClaw开发联调方案.md](../../../docs/阶段七-本地直连OpenClaw开发联调方案.md)
- [../../../docs/07-阶段七-Mock转真实接口.md](../../../docs/07-阶段七-Mock转真实接口.md)
