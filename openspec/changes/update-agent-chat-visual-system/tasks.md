## 1. OpenSpec 与方案确认

- [x] 1.1 创建“全局 UI 视觉系统升级” change 文档
- [x] 1.2 确认本次变更覆盖聊天、技能、登录、执行状态工作台与全局布局
- [x] 1.3 校验 change 文档格式与 spec delta 有效性

## 2. 全局主题与应用骨架

- [x] 2.1 重构 `src/styles/variables.less` 的视觉 token
- [x] 2.2 调整 `src/App.tsx` 的 Ant Design theme token 与字体配置
- [x] 2.3 更新 `src/styles/global.less`，统一背景、滚动条、焦点态和基础排版
- [x] 2.4 调整 `src/components/Layout/*`，收敛主布局与左侧导航脊柱

## 3. 聊天主舞台

- [x] 3.1 重构 `src/pages/Chat/*` 的主舞台布局与层次
- [x] 3.2 升级 `src/components/Chat/WelcomeScreen*` 为工作台式欢迎态
- [x] 3.3 升级 `src/components/Chat/SessionList*` 与 `SessionItem*` 的档案式会话区
- [x] 3.4 升级 `src/components/Chat/MessageList*`、`MessageBubble*`、`MessageActions*`
- [x] 3.5 升级 `src/components/Chat/MessageInput*`、`FileUploadButton*`、`TypingIndicator*`

## 4. 非文本结果与共享组件

- [x] 4.1 统一 `src/components/Card/*` 的容器语言与头部样式
- [x] 4.2 统一 `src/components/Chart/*` 的图表容器、iframe 容器与图片容器样式
- [x] 4.3 补齐空状态、加载态等共享组件的视觉一致性

## 5. 技能页与登录页

- [x] 5.1 重构 `src/pages/Skills/*` 的页面层级与版式
- [x] 5.2 升级 `src/components/Skills/*` 的搜索、筛选、卡片与详情样式
- [x] 5.3 重构 `src/pages/Login/*` 与回调页的品牌化视觉承接

## 6. 执行状态工作台体验

- [x] 6.1 保持当前“单击直达沉浸式工作台”的交互收敛结果
- [x] 6.2 统一 `src/components/Visualize/*` 与 `src/pages/Visualize/*` 的外层视觉语言
- [x] 6.3 确保 `iframe-first` 布局、极简悬浮控件和保活策略不回退

## 7. 响应式、性能与可访问性

- [x] 7.1 校验主要页面在常见桌面与中等宽度视口下的可用性
- [x] 7.2 控制视觉增强不破坏现有懒加载与性能优化结果
- [x] 7.3 补充焦点态、对比度和关键交互反馈

## 8. 测试与文档

- [x] 8.1 为关键组件与页面补充或更新单元测试
- [x] 8.2 运行 `npm run lint`
- [x] 8.3 运行 `npm run test`
- [x] 8.4 运行 `npm run build`
- [x] 8.5 按需要更新阶段六文档、总览文档与相关引用
