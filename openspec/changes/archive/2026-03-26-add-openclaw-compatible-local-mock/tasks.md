# 实施任务：OpenClaw-compatible 本地 mock 协议层

> 对应 Change: `add-openclaw-compatible-local-mock`

## 1. 文档与方案

- [x] 1.1 新增 OpenClaw 协议接入总体方案文档，并明确三阶段边界
- [x] 1.2 在文档索引和项目总览中引用总体方案文档
- [x] 1.3 评审本 change 的 proposal、design、spec 是否与第一阶段边界一致

## 2. 协议与抽象层

- [x] 2.1 拆分 UI 消息类型与 OpenClaw 协议类型
- [x] 2.2 新增统一 Gateway transport 抽象
- [x] 2.3 新增 OpenClaw chat domain adapter
- [x] 2.4 为后续 direct / proxy runtime 预留统一扩展点

## 3. 本地 mock Gateway

- [x] 3.1 将现有 mock WebSocket 升级为 OpenClaw-compatible mock Gateway
- [x] 3.2 支持最小请求集：`sessions.list`、`chat.history`、`chat.send`、`chat.abort`
- [x] 3.3 支持最小事件集：`chat`、`agent`、`health`
- [x] 3.4 保留当前开发调试能力：首轮引导、测试卡片、测试图表、测试附件

## 4. Chat 页面迁移

- [x] 4.1 让 Chat 页面通过 adapter 消费会话与消息，而不是直接消费旧业务帧
- [x] 4.2 保持欢迎页快捷建议、草稿注入、首次发送自动建会话体验
- [x] 4.3 保持 streaming、卡片、图表、附件消息渲染行为
- [x] 4.4 保持错误处理与发送状态逻辑不退化

## 5. 像素风办公室联动

- [x] 5.1 保持 runtime 输出结构与当前 visualize store 兼容
- [x] 5.2 保持本地 Star-Office mock / real-dev 桥接逻辑可继续工作
- [x] 5.3 验证会话级执行状态入口与 runtime 更新不串线

## 6. 测试与验证

- [x] 6.1 补充 mock Gateway 单元测试
- [x] 6.2 补充 adapter 映射单元测试
- [x] 6.3 更新 Chat 页面关键回归测试
- [x] 6.4 验证现有 visualize 相关测试通过
- [x] 6.5 运行 `npm run test`、`npm run lint`、`npm run build`
