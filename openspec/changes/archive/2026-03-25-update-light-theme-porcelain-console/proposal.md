# 变更提案：将明亮皮肤收敛为 Porcelain Console

> Change ID: `update-light-theme-porcelain-console`
> 状态：提案中
> 创建日期：2026-03-25

## Why

当前项目已经完成双主题基础设施，`dark` 主题的 `Paper Ops / Graphite Console` 也已经相对稳定；但 `light` 主题虽然可用，整体仍明显偏向暖黄纸面与浅米色后台，和用户期望的“更白、更灰、更像文档型工作台”的方向存在偏差。

结合最近一轮真实使用反馈与参考界面，可以确认当前 `light` 主题存在以下问题：

- 页面主背景、侧栏底色、浮层和 toolbar 普遍偏暖，整体观感更像 `parchment / beige console`
- 分隔线与边框也带有棕灰倾向，导致框架层在明亮主题下不够清爽
- 一些 portal 组件虽然已经接入主题 token，但仍继承偏暖底色，和用户期待的白灰工作台不一致
- 可视化工作台外壳、空状态容器、图表与结果容器在 `light` 主题下仍残留较强暖纸面语义
- 当前主题命名虽然是 `Ivory Editorial / Paper Console`，但实际色温比目标更暖，尚未达到“冷静、文档化、编辑台化”的成熟状态

这不是简单的“改一组颜色值”，而是一次对 `light` 主题基调的系统性收紧：

> 保留产品既有的靛蓝与克制铜棕识别，但将大面积底色、结构层与反馈层统一收敛到更中性的 `Porcelain / Slate / Editorial White` 语义。

## What Changes

- 将 `light` 主题从当前偏暖的 `paper / parchment` 方向，收敛为更中性的 `Porcelain Console`
- 调整 `palette` 中明亮主题的大面积背景、侧栏、浮层、边框、overlay、toolbar 与工作台壳层 token
- 同步收敛 Ant Design portal 组件在 `light` 主题下的背景、mask、文字与容器色温
- 校准聊天工作台、技能页、图表容器、空状态容器与可视化宿主在明亮主题下的白灰化表现
- 保留 `dark` 主题既有结果，不对深色主题做行为或视觉回退
- 补充测试，确保 `light` 主题关键 token 与 AntD 主题配置保持一致
- 视需要更新 UI 视觉系统文档，明确 `light` 主题的后续演进方向

## Impact

- Affected specs:
  - `theme-system`
  - `workspace-ui`
  - `visualize-workbench`
- Affected code:
  - `src/theme/palette.ts`
  - `src/theme/antdTheme.ts`
  - `src/styles/variables.less`
  - `src/pages/Chat/*`
  - `src/pages/Skills/*`
  - `src/components/Visualize/*`
  - `src/components/Chart/*`
  - `src/styles/*`
  - `tests/theme/*`
  - `docs/UI-视觉系统指南.md`
