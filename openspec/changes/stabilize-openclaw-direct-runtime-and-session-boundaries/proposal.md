# 变更提案：稳定本地直连 OpenClaw 运行时与会话边界

> Change ID: `stabilize-openclaw-direct-runtime-and-session-boundaries`
> 状态：提案中
> 创建日期：2026-03-26

## Why

当前仓库已经完成了 `add-openclaw-direct-dev-runtime`，可以通过浏览器直连本机 OpenClaw Gateway，并且已经具备基础的消息发送、历史读取与工作台入口能力。这说明第二阶段的大方向是正确的，但在真实联调过程中已经暴露出一批集中问题：

- 浏览器刷新后偶发 `device signature invalid`，说明当前握手签名与缓存的 `device token` 组合没有完全对齐 OpenClaw 当前协议
- 左侧会话列表会混入非当前前端创建或接管的历史会话，说明当前会话边界仍然过宽
- 直连模式下像素风办公室工作台没有正确收到当前会话的执行状态，说明 direct runtime 与本地 Star-Office 承接层之间仍有桥接缺口
- 用户发送消息后，在首个 streaming delta 返回之前没有任何明确的“正在处理”视觉反馈，当前交互空窗过长
- 消息级复制按钮视觉层级偏高，不符合当前主界面“克制专业、信息密度较高”的工作台风格

这些问题虽然大多不属于“从 0 到 1 的新功能”，但它们共同决定了本地直连模式是否真正可用。如果此时不做一次集中收敛，后续进入“本地真实 OpenClaw 深度联调”与“公司网关/BFF 接入”阶段时，会继续叠加以下风险：

1. 协议问题与 UI 问题交织，定位成本持续升高
2. 会话语义不清，导致多会话产品设计与 OpenClaw 真实 session 模型持续错位
3. 工作台入口虽然存在，但执行状态事实来源仍不稳定，无法作为后续 Star-Office 接入基座

因此需要新增一个独立 change，对本地直连运行时做一次“协议稳定化 + 会话边界收敛 + 工作台联动补齐 + 发送态体验补齐”的集中修复。

## What Changes

- 修正 `openclaw-direct` 握手中的 device signature 计算规则，使其与当前 OpenClaw Gateway 的 `auth.token / auth.deviceToken / auth.bootstrapToken` 选择逻辑保持一致
- 为 `device signature invalid / expired` 增加受控恢复路径，减少刷新后偶发失效导致的联调中断
- 收敛 direct 模式下的会话列表展示范围，默认只展示当前前端负责的 dashboard 会话命名空间
- 将 direct 模式的新建会话从“纯前端伪造 sessionKey”收敛为“优先请求 Gateway 创建或确认权威 session”
- 补齐 direct runtime 到本地 Star-Office 承接层的会话级 runtime 桥接，让工作台能继续感知真实执行状态
- 为发送流程增加“首个 delta 到来前”的 pending 视觉承接，减少处理空窗
- 将消息复制操作改为更克制的次级 icon-only 形态
- 明确会话级执行状态入口继续采用“微型像素显示器”视觉语义，不引入龙虾或其他会分散主界面语义的图标

## What This Change Will Not Do

- 不在本 change 中引入公司正式网关、BFF 或 trusted proxy
- 不在本 change 中把浏览器直连方案扩展到非 localhost / 非 loopback 场景
- 不在本 change 中完成真实文件上传、真实附件协议与所有 OpenClaw 方法的全量覆盖
- 不在本 change 中重做当前聊天页主框架布局或重新定义工作台交互形态
- 不在本 change 中替换当前 Star-Office 真实 sidecar 方案文档，只补足本地直连阶段与工作台联动的衔接说明

## Impact

- Affected specs:
  - `chat-openclaw-protocol`
  - `chat-runtime-host`
- Affected docs:
  - `docs/本地OpenClaw联调操作手册.md`
  - `docs/阶段七-本地直连OpenClaw开发联调方案.md`
  - `docs/07-阶段七-Mock转真实接口.md`
  - `docs/06-阶段六-可视化集成与优化.md`
- Affected code (implementation stage):
  - `src/services/directOpenClawTransport.ts`
  - `src/services/openclawBrowserDeviceAuth.ts`
  - `src/services/chatAdapter.ts`
  - `src/pages/Chat/index.tsx`
  - `src/components/Chat/ChatRuntimeHost.tsx`
  - `src/components/Chat/MessageList.tsx`
  - `src/components/Chat/MessageActions.tsx`
  - `scripts/dev-openclaw-direct.mjs`
  - 与会话过滤、工作台 bridge、测试相关的 store / utils / tests

## Success Criteria

- 本地直连模式下，页面刷新后不再高频出现 `device signature invalid`
- 若浏览器缓存的 device token 失效，系统能提供可恢复的诊断或自动恢复，而不是陷入反复失败
- direct 模式下左侧会话列表默认只展示当前 dashboard 会话，不再混入历史调试会话
- direct 模式下工作台能接收到当前会话的真实 runtime，并在本地 mock/承接层中正确展示
- 用户发送消息后，在首个 delta 返回前就能看到明确的 pending 反馈
- 消息复制操作区视觉层级明显降低，但复制能力不退化

## Related Documents

- [../../../docs/本地OpenClaw联调操作手册.md](../../../docs/本地OpenClaw联调操作手册.md)
- [../../../docs/阶段七-本地直连OpenClaw开发联调方案.md](../../../docs/阶段七-本地直连OpenClaw开发联调方案.md)
- [../../../docs/07-阶段七-Mock转真实接口.md](../../../docs/07-阶段七-Mock转真实接口.md)
- [../add-openclaw-direct-dev-runtime/proposal.md](../add-openclaw-direct-dev-runtime/proposal.md)
