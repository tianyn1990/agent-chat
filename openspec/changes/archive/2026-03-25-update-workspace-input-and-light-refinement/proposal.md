# 变更提案：收紧工作台输入交互并精修明亮皮肤

> Change ID: `update-workspace-input-and-light-refinement`
> 状态：提案中
> 创建日期：2026-03-25

## Why

当前主应用已经完成了 `Graphite Console` 深色工作台、线性分隔框架以及双主题基础设施，整体骨架基本稳定；但结合最新一轮真实使用反馈，仍存在一组影响日常操作流畅度与整体完成度的细节问题：

- 聊天页“会话档案”面板的收起/展开按钮仍位于 rail 底部，和它实际控制的“分隔边界”不在同一位置，导致结构语义与交互触点割裂
- 输入区当前把“可编辑”和“可提交”绑在同一个 `disabled` 状态上，AI 回复期间用户既不能继续输入，也容易被浏览器强制移走焦点
- 多行输入发送后，输入框高度不会自动恢复，导致后续空输入态仍保持扩展高度
- 明亮皮肤已经可用，但当前色调仍偏暖后台 / 浅卡片语言，距离用户期望的“文档化、克制、纸面工作台”还有明显差距
- 从沉浸式像素办公室返回后，轻量恢复提示停留时间偏短，不足以承担“恢复入口”的职责
- 一些 icon-only 控件在视觉上存在上边缘留白偏大、垂直重心不稳定的问题，影响整体精密度

这些问题单看都不算“功能缺失”，但它们共同指向同一个阶段目标：

> 把当前已经成型的工作台，从“结构基本正确”推进到“交互边界清晰、输入更顺手、light 主题更成熟”的精修状态。

因此，本次 change 不引入新的大功能，也不再做框架级重构，而是聚焦：

- 输入交互状态机优化
- 档案 panel 边界触点重排
- light 主题二次调色
- 工作台返回提示与 icon 节奏统一

## What Changes

- 将聊天页“会话档案”收起/展开入口改为附着在 rail 与档案 panel 之间分隔线上的边界控制器
- 重构聊天页输入区状态机，允许在机器人回复期间继续编辑输入内容，但禁止提交下一条消息
- 为聊天页输入区补充条件化自动 focus、发送后高度归一和跨会话高度同步策略
- 调整轻量执行状态提示的驻留时长与交互策略，使其真正承担“从办公室返回后的恢复入口”职责
- 对明亮皮肤进行第二轮调色，向更克制的 `Ivory Docs / Paper Console` 方向收敛
- 统一一组关键 icon-only 控件的垂直节奏与对齐规则，减少视觉上的“上边缘空隙偏大”问题
- 补充相应测试与 UI 文档沉淀，确保后续新增模块延续同一套交互与视觉规则

## Impact

- Affected specs:
  - `workspace-ui`
  - `theme-system`
  - `visualize-workbench`
- Affected code:
  - `src/components/Layout/*`
  - `src/components/Chat/*`
  - `src/pages/Chat/*`
  - `src/components/Visualize/*`
  - `src/stores/useVisualizeStore.ts`
  - `src/theme/palette.ts`
  - `src/styles/global.less`
  - `src/styles/variables.less`
  - `tests/components/*`
  - `tests/pages/*`
  - `docs/UI-视觉系统指南.md`
  - `AGENTS.md`
