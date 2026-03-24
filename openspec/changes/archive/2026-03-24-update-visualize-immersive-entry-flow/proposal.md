# Change: 收敛执行状态入口并改造沉浸式工作台主视图

## Why

当前“执行状态”体验虽然已经具备真实 `Star-Office-UI` 接入、同会话保活和沉浸式工作台基础，但交互链路仍然存在三个核心问题：

- 真实主功能需要先进入摘要侧栏，再从侧栏进入工作台，形成两级跳转，主路径过长
- 摘要侧栏占用聊天主界面较大面积，但它本质只是辅助说明，不应与聊天内容争夺主要空间
- 沉浸式工作台并未真正做到 `iframe-first`，顶部与说明区仍然占据大量可视区域，挤压真实像素办公室

此外，用户明确提出不希望依赖浏览器原生返回完成退出，而希望在 `iframe` 上层提供应用内返回控件。这一建议合理，因为执行状态工作台本质上是产品内工作台，不应把“退出”体验外包给浏览器。

因此需要进行一次交互收敛：

- 将“查看执行状态”改为单击直达沉浸式工作台
- 将摘要侧栏降级为轻量状态提示，而不是大面积右侧面板
- 将工作台改造成真正的 `iframe-first` 沉浸式视图
- 提供悬浮在 `iframe` 上层的应用内返回/收起控件

## What Changes

- 将消息操作中的“查看执行状态”调整为直接打开沉浸式执行状态工作台
- 将当前右侧摘要侧栏降级为轻量状态提示组件，不再作为主入口的必经步骤
- 将沉浸式工作台布局调整为“真实 `iframe` 占满视口，工具控件悬浮覆盖”的结构
- 提供应用内悬浮返回控件与收起控件，不要求依赖浏览器返回按钮
- 保留现有同会话 `iframe` 保活能力，关闭时继续隐藏而不销毁
- 更新相应 OpenSpec 文档与后续实施任务

## Impact

- Affected specs: `visualize-workbench`
- Affected code:
  - `src/components/Chat/MessageActions.tsx`
  - `src/components/Visualize/*`
  - `src/stores/useVisualizeStore.ts`
  - `src/pages/Chat/index.tsx`
  - `src/pages/Visualize/index.tsx`
  - `src/router/index.tsx`
  - `tests/components/*`
  - `tests/pages/*`
