# 变更提案：收敛执行状态入口为会话级，并优化工作台首开加载体验

> Change ID: `update-session-workbench-entry-and-loading`
> 状态：提案中
> 创建日期：2026-03-25

## Why

当前执行状态体验虽然已经具备真实 `iframe-first` 的沉浸式工作台、路由桥接和同会话保活能力，但结合最新实际使用反馈，仍有两个结构性问题没有收紧：

- “查看执行状态”入口仍挂在每条 assistant 消息动作区，容易让用户误以为它对应的是“这条回复的执行过程”，而当前实际绑定对象一直都是 `sessionId`
- 某个会话第一次进入沉浸式工作台时，仍会经历一段明显的白屏或空壳阶段，原因是路由切换、宿主显隐、iframe 请求、Star-Office 页面初始化与资源加载叠在一起，但外层没有提供足够自然的承接

这两个问题不是彼此独立的局部瑕疵，而是同一条体验链路中的语义与过渡问题：

- 执行状态本质上是“会话级工作台”
- 入口应该固定在“当前会话上下文”里，而不是散落在消息级操作里
- 首次进入工作台时，用户不应看到裸白 iframe，而应感知到“正在进入当前会话的沉浸式工作台”

另外，用户已经明确提出两项方向要求：

- 执行状态入口改为会话级能力
- 为了避免反复初始化像素办公室，工作台缓存需要采用受控保活，并暂定 `LRU=2`

因此，本次 change 的目标不是改服务端适配层路线，也不是重新设计 Star-Office-UI 集成方式，而是把当前前端入口语义与冷启动体验收敛到正确形态。

## What Changes

- 将聊天页“查看执行状态”主入口从消息动作区迁移到会话头部，明确为当前会话的固定能力入口
- 为该入口设计“像素工位徽章”样式，借用像素办公室的识别记忆点，但继续遵守主应用 `Graphite Console / Paper Console` 视觉系统
- 弱化或移除消息级“查看执行状态”入口，避免把会话级能力误导成消息级能力
- 为沉浸式工作台补充分阶段进入体验：首开时展示会话级加载封面，待 iframe 真正 ready 后再淡入真实办公室
- 增加当前会话的静默预热能力，并将工作台保活策略升级为 `LRU=2`
- 保留 `/visualize/:sessionId` 路由作为深链接与状态同步层，但不再让用户感知为“先跳到空白页面，再等待 iframe”
- 继续保留从沉浸式工作台返回后的轻量恢复提示，但其职责降级为辅助恢复入口，而不是主入口

## Impact

- Affected specs:
  - `workspace-ui`
  - `visualize-workbench`
- Affected code:
  - `src/pages/Chat/index.tsx`
  - `src/components/Chat/MessageActions.tsx`
  - `src/components/Visualize/*`
  - `src/stores/useVisualizeStore.ts`
  - `src/router/index.tsx`
  - `tests/components/*`
  - `tests/pages/*`
  - `docs/UI-视觉系统指南.md`
  - `docs/06-阶段六-可视化集成与优化.md`

