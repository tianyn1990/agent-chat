## 1. OpenSpec 与设计文档

- [x] 1.1 创建 `add-dual-theme-light-skin` change 文档
- [x] 1.2 补齐 `theme-system`、`workspace-ui`、`visualize-workbench` spec delta
- [x] 1.3 运行 `openspec validate add-dual-theme-light-skin --strict`

## 2. 主题系统基础设施

- [x] 2.1 建立全局主题 store / provider，支持 dark 与 light 运行时切换
- [x] 2.2 抽象统一 palette，并为 CSS vars、LESS token 与 Ant Design token 提供单一来源
- [x] 2.3 接入主题偏好持久化、首屏恢复与 `data-theme` / `color-scheme` 同步

## 3. 全局样式与壳层适配

- [x] 3.1 改造 `global.less`，移除只适用于 dark 的全局写死值
- [x] 3.2 适配主布局、侧栏、用户区和通用分隔结构的双主题表现
- [x] 3.3 为主题切换入口提供稳定、可发现且不打断工作流的交互位置

## 4. 页面与组件覆盖

- [x] 4.1 适配聊天页、欢迎态、消息区、输入 dock 与消息结果容器
- [x] 4.2 适配技能页、登录页、错误页、加载态与通用空状态
- [x] 4.3 适配图表、表格、Markdown、代码块与富文本结果容器
- [x] 4.4 适配 Toast、Modal、Drawer、Tooltip、Popover 等反馈层
- [x] 4.5 适配沉浸式工作台外层 chrome，并保持真实 iframe 内容边界清晰

## 5. 文档与验证

- [x] 5.1 更新 `docs/UI-视觉系统指南.md`，补充双主题规则与 light skin 原则
- [x] 5.2 更新 `AGENTS.md` 中与前端长期风格相关的引用说明
- [x] 5.3 新增或更新主题切换、主题持久化与关键页面渲染测试
- [x] 5.4 运行 `npm run lint`
- [x] 5.5 运行 `npm run test`
- [x] 5.6 运行 `npm run build`
