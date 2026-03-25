## 1. OpenSpec 与方案确认

- [x] 1.1 创建 `update-light-theme-porcelain-console` change 文档
- [x] 1.2 补齐 `theme-system`、`workspace-ui`、`visualize-workbench` spec delta
- [x] 1.3 运行 `openspec validate update-light-theme-porcelain-console --strict`

## 2. 明亮主题基础调色

- [x] 2.1 调整 `lightPalette` 的背景、表面层、边框、浮层与反馈层 token
- [x] 2.2 调整 Ant Design `light` 主题 token，使 portal 组件与主界面色温一致
- [x] 2.3 保持 `dark` 主题结果稳定，不引入回退

## 3. 页面与组件回归

- [x] 3.1 回归聊天工作台在明亮主题下的主舞台、消息容器与输入区表现
- [x] 3.2 回归技能页、抽屉、空状态和图表结果容器的明亮主题表现
- [x] 3.3 回归沉浸式工作台宿主壳层与 iframe 外围的明亮主题表现

## 4. 验证与文档

- [x] 4.1 补充或更新主题相关单元测试
- [x] 4.2 运行 `npm run lint`
- [x] 4.3 运行 `npm run test`
- [x] 4.4 运行 `npm run build`
- [x] 4.5 视需要更新 `docs/UI-视觉系统指南.md`
