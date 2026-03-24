# Change: 更新执行状态工作台交互流

## Why

当前阶段六虽然已经把真实 `Star-Office-UI` 接进来了，但默认交互仍然沿用“聊天页右侧面板直接承接完整 iframe”的思路。这带来了两个直接问题：

- 真实像素办公室页面尺寸固定，右侧面板中无法完整展示，导致内容裁切、缩放失真、交互困难
- 每次打开执行状态面板都需要重新初始化 iframe，真实 `Star-Office-UI` 首屏加载与 Phaser 初始化成本较高，重复打开体验较差

因此需要把当前交互流升级为：

- 聊天页只展示执行状态摘要侧栏
- 真实像素办公室放到独立的沉浸式工作台页面承接
- 工作台关闭时不销毁 iframe，而是保活并隐藏，再次唤起时直接复用

## What Changes

- 将聊天页右侧执行状态面板改造为“摘要侧栏”，默认不再承载真实 `Star-Office-UI` iframe
- 将 `/visualize/:sessionId` 升级为沉浸式执行状态工作台，作为真实像素办公室的默认承载页
- 增加工作台保活机制，关闭时隐藏工作台而不是销毁 iframe
- 增加从摘要侧栏进入沉浸式工作台的主入口
- 明确摘要侧栏与工作台的职责边界
- 补充对应文档、状态管理和测试

## Impact

- Affected specs: `visualize-workbench`
- Affected code:
  - `src/stores/useVisualizeStore.ts`
  - `src/components/Visualize/*`
  - `src/pages/Visualize/*`
  - `src/pages/Chat/index.tsx`
  - `src/router/index.tsx`
  - `tests/components/*`
  - `tests/pages/*`
