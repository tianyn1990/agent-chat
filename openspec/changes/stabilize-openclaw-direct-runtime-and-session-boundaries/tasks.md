# 实施任务：稳定本地直连 OpenClaw 运行时与会话边界

> 对应 Change: `stabilize-openclaw-direct-runtime-and-session-boundaries`

## 1. 文档与方案

- [x] 1.1 补充本次稳定化 change 文档，并在阶段七联调文档中登记它与 `add-openclaw-direct-dev-runtime` 的衔接关系
- [x] 1.2 更新本地 OpenClaw 联调操作手册，加入 `device signature invalid` 的原因、恢复策略与 direct + 工作台联调说明
- [x] 1.3 更新阶段六/阶段七相关文档，明确 direct 模式下工作台可以继续依赖本地 Star-Office mock 承接真实 runtime

## 2. 协议握手稳定化

- [x] 2.1 修正 `DirectOpenClawTransport` 的 signature token 选择逻辑，使其与真实 `connect.auth` 一致
- [x] 2.2 为握手失败补充更细的 reason 解析，避免页面只拿到泛化错误
- [x] 2.3 为 `device signature invalid / expired` 增加一次性受控恢复路径
- [x] 2.4 为浏览器侧 device auth 工具补充对应的缓存读写与恢复测试

## 3. 会话边界与新建策略

- [x] 3.1 在 direct 模式下为 session 列表增加 dashboard 命名空间过滤
- [x] 3.2 保留对路由直达非 dashboard session 的兼容读取能力
- [x] 3.3 将 direct 模式的新建会话改为优先通过 Gateway 生成或确认权威 session
- [x] 3.4 修正 direct 模式下会话列表与本地草稿会话并存时的合并策略

## 4. 工作台直连联动

- [x] 4.1 将 runtime -> 本地 Star-Office bridge 的启用条件从 `IS_MOCK_ENABLED` 收敛为“存在本地 Star-Office 承载能力”
- [x] 4.2 让 `npm run dev:openclaw-direct` 默认同时打开本地 Star-Office mock 承接
- [x] 4.3 验证 direct 模式下当前会话 runtime 能继续驱动工作台

## 5. 发送态与消息操作区体验

- [x] 5.1 为“发送后、首个 delta 前”增加 pending 占位视觉
- [x] 5.2 确保 pending -> streaming 的切换不会引入新的滚动抖动
- [x] 5.3 将消息复制按钮调整为 icon-only 次级动作
- [x] 5.4 确保会话级执行状态入口继续采用“微型像素显示器”图标语义

## 6. 测试与验收

- [x] 6.1 补充 direct transport 的握手恢复与异常路径单元测试
- [x] 6.2 补充 direct adapter 的 session 过滤与权威创建测试
- [x] 6.3 补充工作台 bridge 在 direct 模式下仍能工作的测试
- [x] 6.4 补充 pending 发送态与复制按钮微调的组件测试
- [x] 6.5 完成验证后统一回填文档与勾选状态
