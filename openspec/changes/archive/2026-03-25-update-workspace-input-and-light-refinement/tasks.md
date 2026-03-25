## 1. OpenSpec 与方案确认

- [x] 1.1 创建 `update-workspace-input-and-light-refinement` change 文档
- [x] 1.2 补齐 `workspace-ui`、`theme-system`、`visualize-workbench` spec delta
- [x] 1.3 运行 `openspec validate update-workspace-input-and-light-refinement --strict`

## 2. 聊天页结构与输入交互

- [x] 2.1 将“会话档案”收起/展开入口迁移到 rail 与 panel 之间的分隔边界
- [x] 2.2 重构 `MessageInput` 状态机，支持“可编辑但不可发送”的处理中状态
- [x] 2.3 增加条件化自动 focus 策略，减少切会话、发送后和回复结束后的额外点击
- [x] 2.4 修复多行输入发送后、切换会话后和草稿注入后的高度归一问题

## 3. 沉浸式工作台返回提示

- [x] 3.1 延长轻量执行状态提示的默认驻留时间
- [x] 3.2 为轻量提示增加 hover 暂停自动关闭的交互
- [x] 3.3 校准轻量提示的层级、文案与恢复入口表现

## 4. 明亮皮肤与图标节奏精修

- [x] 4.1 调整 `light` palette，使其更接近文档化纸面工作台语义
- [x] 4.2 校准输入区、按钮、meta chip、分隔线和浅表面层的明亮主题表现
- [x] 4.3 统一关键 icon-only 控件的垂直节奏、尺寸与视觉重心

## 5. 回归验证与文档沉淀

- [x] 5.1 更新或新增相关单元测试与交互测试
- [x] 5.2 运行 `npm run lint`
- [x] 5.3 运行 `npm run test`
- [x] 5.4 运行 `npm run build`
- [x] 5.5 视需要更新 `docs/UI-视觉系统指南.md` 与 `AGENTS.md`
