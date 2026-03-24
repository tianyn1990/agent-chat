# 变更提案：收紧主应用视觉密度并优化沉浸式工作台控件

> Change ID: `update-ui-flat-density-pass`
> 状态：提案中
> 创建日期：2026-03-24

## Why

上一轮 `Paper Ops / 智能工作台` 视觉升级已经完成全局统一，但从当前真实页面效果来看，系统仍然存在一组影响长期使用体验的结构性问题：

- 主应用大量依赖阴影、暖色渐变和大圆角建立层级，整体偏“柔和展示型”，不够利落
- 聊天页、技能页、登录页的间距较大、标题偏大、卡片偏厚，导致信息密度不足
- 消息区、输入区、统计卡、欢迎态建议卡等都存在较强的“卡片化”倾向，不够像高频使用的工作台
- 沉浸式 `Star-Office-UI` 工作台虽然已实现 `iframe-first`，但上层工具条的位置、尺寸与交互层级仍不理想，容易遗漏，也可能与像素办公室原生控件争夺注意力
- 图标体系仍偏混杂，部分图标的视觉重量和风格与当前页面语言不完全一致

用户已经明确提出，希望在保留当前产品主轴的前提下，继续完成一轮“扁平化、提高信息密度、优化控件边界”的精修。这一轮不是推翻现有方向，而是将当前 UI 从“完成度较高的展示型工作台”收紧为“更适合持续使用的操作型工作台”。

## What Changes

- 收紧全局设计 token，减少对大阴影、大圆角和大块渐变的依赖
- 将主应用视觉方向从“柔和卡片化”进一步调整为“扁平、紧凑、操作优先”的 `Paper Ops / Flat Console`
- 优化聊天页标题区、消息舞台、欢迎态和输入区，提高信息密度，减少不必要留白
- 优化技能页的统计区、搜索筛选区、技能卡与空状态，使其更像能力工作面而不是展示型卡片页
- 优化登录页的品牌区与 CTA 区比例，降低宣传感，增强“入口页”属性
- 重新设计沉浸式工作台上层控件的布局与交互，降低遮挡并提高可发现性
- 统一或替换关键页面与关键操作中的图标风格，使导航、状态、动作图标更协调
- 补充相应的测试与视觉系统文档，确保后续新增模块继续遵循新的收紧方向

## Impact

- Affected specs:
  - `workspace-ui`
  - `visualize-workbench`
- Affected code:
  - `src/styles/variables.less`
  - `src/styles/global.less`
  - `src/components/Layout/*`
  - `src/components/Chat/*`
  - `src/components/Card/*`
  - `src/components/Chart/*`
  - `src/components/Skills/*`
  - `src/components/Visualize/*`
  - `src/pages/Chat/*`
  - `src/pages/Skills/*`
  - `src/pages/Login/*`
  - `tests/components/*`
  - `tests/pages/*`
  - `docs/UI-视觉系统指南.md`
