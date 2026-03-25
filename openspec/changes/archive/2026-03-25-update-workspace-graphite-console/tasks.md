## 1. OpenSpec 与文档

- [x] 1.1 创建 `update-workspace-graphite-console` change 文档
- [x] 1.2 补齐 `workspace-ui` 与 `visualize-workbench` spec delta
- [x] 1.3 运行 `openspec validate update-workspace-graphite-console --strict`

## 2. 全局壳层与导航

- [x] 2.1 调整全局 token，建立 `Graphite Console` 色彩与表面层体系
- [x] 2.2 重构主布局与左侧 rail，减少传统宽侧栏观感
- [x] 2.3 确保新的壳层语言在聊天页、技能页、登录页保持一致

## 3. 聊天页主舞台

- [x] 3.1 收紧聊天页头部摘要与上下文信息
- [x] 3.2 重构欢迎态为中心舞台结构
- [x] 3.3 重构对话态消息画布与底部 dock composer
- [x] 3.4 弱化普通文本消息容器，保留结果型内容的清晰层级

## 4. 技能页与沉浸式工作台

- [x] 4.1 重构技能页顶部工具栏、筛选区与卡片密度
- [x] 4.2 同步登录页壳层与主视觉语言
- [x] 4.3 继续收敛沉浸式工作台外层控件，减少对 iframe 的干扰

## 5. 测试与沉淀

- [x] 5.1 更新或新增受影响组件与页面测试
- [x] 5.2 运行 `npm run lint`
- [x] 5.3 运行 `npm run test`
- [x] 5.4 运行 `npm run build`
- [x] 5.5 更新 `docs/UI-视觉系统指南.md` 与必要引用文档
