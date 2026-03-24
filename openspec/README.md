# OpenSpec 变更目录

> 最后更新：2026-03-24

本目录用于以 OpenSpec 方式管理跨阶段、跨模块的重要设计变更。

## 目录约定

```text
openspec/
  ├─ README.md
  └─ changes/
       └─ <change-id>/
            ├─ proposal.md
            ├─ design.md
            ├─ tasks.md
            └─ specs/
                 └─ <capability>/spec.md
```

各文件职责如下：

- `proposal.md`
  说明为什么要做这次变更、范围是什么、收益和风险是什么。
- `design.md`
  说明方案细节、接口、数据流、边界条件、替代方案与决策。
- `tasks.md`
  拆解后续实施任务，作为开发前的执行清单。
- `specs/<capability>/spec.md`
  使用 OpenSpec 的 requirement/scenario 形式定义需求增量，作为验收依据。

## 当前变更

### 1. `add-real-star-office-sidecar`

目标：

- 为 `agent-chat` 定义真实 Star-Office-UI 的侧车接入路线
- 在保留真实像素办公室效果的前提下实现同域 iframe 嵌入
- 明确 session facade、适配层、仓库管理方式与许可证边界

文档入口：

- [changes/add-real-star-office-sidecar/proposal.md](./changes/add-real-star-office-sidecar/proposal.md)
- [changes/add-real-star-office-sidecar/design.md](./changes/add-real-star-office-sidecar/design.md)
- [changes/add-real-star-office-sidecar/tasks.md](./changes/add-real-star-office-sidecar/tasks.md)
- [changes/add-real-star-office-sidecar/specs/real-star-office-sidecar/spec.md](./changes/add-real-star-office-sidecar/specs/real-star-office-sidecar/spec.md)

### 2. `update-visualize-workbench-flow`

目标：

- 将聊天页右侧从“真实 iframe 面板”收敛为“执行状态摘要侧栏”
- 将真实 Star-Office-UI 提升到沉浸式全屏工作台中展示
- 支持工作台关闭时隐藏而非销毁，再次进入同一会话直接复用已初始化页面

文档入口：

- [changes/update-visualize-workbench-flow/proposal.md](./changes/update-visualize-workbench-flow/proposal.md)
- [changes/update-visualize-workbench-flow/design.md](./changes/update-visualize-workbench-flow/design.md)
- [changes/update-visualize-workbench-flow/tasks.md](./changes/update-visualize-workbench-flow/tasks.md)
- [changes/update-visualize-workbench-flow/specs/visualize-workbench/spec.md](./changes/update-visualize-workbench-flow/specs/visualize-workbench/spec.md)

### 3. `update-visualize-immersive-entry-flow`

目标：

- 将“查看执行状态”改为一键直达沉浸式工作台
- 将聊天页摘要降级为轻量提示，不再长期占据大面积侧栏
- 将工作台改造成 `iframe-first` 视图，并在上层提供应用内悬浮返回控件

文档入口：

- [changes/update-visualize-immersive-entry-flow/proposal.md](./changes/update-visualize-immersive-entry-flow/proposal.md)
- [changes/update-visualize-immersive-entry-flow/design.md](./changes/update-visualize-immersive-entry-flow/design.md)
- [changes/update-visualize-immersive-entry-flow/tasks.md](./changes/update-visualize-immersive-entry-flow/tasks.md)
- [changes/update-visualize-immersive-entry-flow/specs/visualize-workbench/spec.md](./changes/update-visualize-immersive-entry-flow/specs/visualize-workbench/spec.md)

## 已归档变更

### 1. `add-local-star-office-mock`

目标：

- 为 `npm run dev` 场景提供可用的 Star-Office-UI 本地 mock 能力
- 保持“主应用 -> 适配层 -> 执行状态页面”的真实拓扑
- 保证多会话下按 `sessionId` 观察本会话执行状态

归档入口：

- [changes/archive/2026-03-24-add-local-star-office-mock/proposal.md](./changes/archive/2026-03-24-add-local-star-office-mock/proposal.md)
- [changes/archive/2026-03-24-add-local-star-office-mock/design.md](./changes/archive/2026-03-24-add-local-star-office-mock/design.md)
- [changes/archive/2026-03-24-add-local-star-office-mock/tasks.md](./changes/archive/2026-03-24-add-local-star-office-mock/tasks.md)

## 使用方式

1. 先阅读 `proposal.md`，确认这次变更是否值得做。
2. 再阅读 `design.md`，确认方案是否满足当前阶段目标。
3. 通过 `spec.md` 检查需求边界、验收口径与场景覆盖。
4. 用户确认后，再根据 `tasks.md` 进入实现。

## 与现有阶段文档的关系

OpenSpec 目录不替代 `docs/` 下的阶段文档，它负责：

- 记录单次重要变更的决策过程
- 给实现前评审提供统一入口
- 作为后续开发、测试、回归验收的依据

阶段文档仍负责：

- 记录项目阶段目标和整体进度
- 汇总已落地的最终实现结果
