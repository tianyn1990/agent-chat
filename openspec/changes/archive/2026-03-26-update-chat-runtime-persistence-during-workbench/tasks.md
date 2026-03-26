# 实施任务：工作台切换下的 Chat Runtime 常驻化

> 对应 Change: `update-chat-runtime-persistence-during-workbench`

## 1. 方案与评审

- [x] 1.1 创建并校验本 change 的 proposal、design、spec
- [x] 1.2 确认修复范围聚焦在 runtime 常驻化，而不是重构工作台 iframe

## 2. Chat Runtime Host

- [x] 2.1 新增全局常驻 `ChatRuntimeHost`
- [x] 2.2 将 adapter 连接与事件消费迁移到宿主层
- [x] 2.3 将消息、运行态与发送态同步逻辑迁移到宿主层
- [x] 2.4 增加 runtime 到 `sendingSessionIds` 的兜底收敛

## 3. 页面与布局调整

- [x] 3.1 在 `AppShell` 中挂载 `ChatRuntimeHost`
- [x] 3.2 让 `ChatPage` 只保留视图与用户操作逻辑
- [x] 3.3 确认工作台路由切换不再中断 chat runtime

## 4. 测试与验证

- [x] 4.1 补充 `ChatRuntimeHost` 单元测试
- [x] 4.2 补充“流式回复中进入工作台再返回”回归测试
- [x] 4.3 验证输入区与发送态恢复正常
- [x] 4.4 运行 `npm run test`、`npm run lint`、`npm run build`
