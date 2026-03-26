# 实施任务：本地直连真实 OpenClaw 开发运行时

> 对应 Change: `add-openclaw-direct-dev-runtime`

## 1. 文档与方案

- [x] 1.1 补充本地直连阶段专用方案文档，并与阶段七总方案互相引用
- [x] 1.2 校正阶段七入口文档中仍基于旧 websocket / 单一 mock 开关的表述
- [x] 1.3 在项目总览与文档目录中登记本阶段方案与当前状态

## 2. 运行时与配置

- [x] 2.1 新增显式 chat runtime 选择机制，而不是继续只依赖 `VITE_MOCK_ENABLED`
- [x] 2.2 新增 `openclaw-direct` 所需环境变量、默认值与开发说明
- [x] 2.3 保留 `mock-openclaw` 作为默认兜底运行时
- [x] 2.4 为 direct 模式增加 localhost 限制与配置缺失诊断

## 3. 协议传输层

- [x] 3.1 设计并实现 `DirectOpenClawTransport`
- [x] 3.2 实现真实 Gateway 握手、状态订阅、请求响应与基础重连策略
- [x] 3.3 支持真实 `sessions.list / chat.history / chat.send / chat.abort`
- [x] 3.4 对真实错误帧、超时与版本不兼容场景给出明确错误类型

## 4. 适配层与会话策略

- [x] 4.1 扩展现有 adapter，使其可消费 direct transport
- [x] 4.2 将真实 `chat / agent / health` 事件翻译为统一 `ChatAdapterEvent`
- [x] 4.3 明确 direct 模式下 `route sessionId` 与真实 `sessionKey` 的承载策略
- [x] 4.4 验证“新建对话”在真实 Gateway 下的可行性，并按验证结果确定 direct 模式交互策略

## 5. 工作台与运行时桥接

- [x] 5.1 确保真实 Gateway 事件能更新 `SessionVisualizeRuntime`
- [x] 5.2 确保工作台打开期间，聊天 runtime 不因路由切换而中断
- [x] 5.3 确保 direct 模式下像素风办公室能感知真实执行状态，而不是只靠前端 fallback

## 6. 测试与验收

- [x] 6.1 为 direct transport / adapter / runtime 选择逻辑补充单元测试
- [x] 6.2 补充 localhost 限制、配置缺失、连接失败等异常路径测试
- [x] 6.3 编写本地联调清单，覆盖 mock 回退、direct 成功、direct 失败三类场景
- [x] 6.4 确认所有任务完成后，统一回填文档与勾选状态
