# 变更提案：将主应用重构为 Graphite Console 工作台

> Change ID: `update-workspace-graphite-console`
> 状态：提案中
> 创建日期：2026-03-24

## Why

上一轮 `Paper Ops / Flat Console` 已经完成了第一阶段的收紧，但结合最新一轮真实截图和新的参考样式，可以确认当前主应用仍然存在一组更上层的结构性问题：

- 主界面虽然更扁平，但整体仍偏“有设计语言的业务后台”，与目标中的“原生 AI 工作台 / 桌面应用壳层”气质存在明显差距
- 左侧仍以传统宽侧栏为核心，聊天主舞台没有真正成为页面第一主角
- 欢迎态、聊天态、技能页之间的壳层语言还不够统一，缺少参考图中那种统一的深色 console shell
- 聊天页仍然保留较多标题区、说明区和容器化包裹，导致主舞台不够干净，输入条也没有真正成为底部 dock
- 助手文本、建议区、技能卡和工作台控制条依然带有较多“组件感”，而参考图更强调“文本优先、操作优先、壳层先于卡片”

用户已明确允许本次不仅调整样式，也可以调整布局和交互。因此本次 change 的目标不再是局部 polish，而是将当前 UI 从 `Paper Ops / Flat Console` 进一步推进为：

> `Paper Ops / Graphite Console`

也就是：保留产品现有的专业、克制与工作台气质，但把视觉重心切换到更深色、更薄 chrome、更强主舞台、更像原生客户端的壳层与交互秩序。

## What Changes

- 重构全局壳层与导航结构，将主应用推进为更接近原生控制台的 `Graphite Console`
- 调整聊天页信息架构，弱化头部说明区，强化中心舞台与底部 dock composer
- 重新定义欢迎态与对话态的页面结构，使两者形成不同但连续的舞台体验
- 收紧消息容器语义，让普通文本消息弱容器化，仅保留结果型内容的明确容器
- 改造技能页顶部工具栏、列表密度与卡片结构，使其更像能力工作面而不是展示页
- 继续收敛沉浸式 `Star-Office-UI` 工作台外层控件，优先保证 iframe 画面完整与返回路径清晰
- 更新视觉系统文档，沉淀 `Graphite Console` 阶段的长期约束
- 更新受影响测试，确保重构后的关键交互仍稳定可用

## Impact

- Affected specs:
  - `workspace-ui`
  - `visualize-workbench`
- Affected code:
  - `src/styles/variables.less`
  - `src/styles/global.less`
  - `src/components/Layout/*`
  - `src/components/Chat/*`
  - `src/components/Skills/*`
  - `src/components/Visualize/*`
  - `src/pages/Chat/*`
  - `src/pages/Skills/*`
  - `src/pages/Login/*`
  - `tests/components/*`
  - `tests/pages/*`
  - `docs/UI-视觉系统指南.md`
