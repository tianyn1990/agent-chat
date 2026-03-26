## 1. 文档与方案

- [x] 1.1 在阶段七总体方案与本地联调文档中登记 `openclaw-proxy / company-gateway` 的定位
- [x] 1.2 明确三种 runtime 的职责边界：`mock-openclaw`、`openclaw-direct`、`openclaw-proxy`
- [x] 1.3 明确 `openclaw-proxy` 将成为本地主联调路径，`openclaw-direct` 退回底层诊断路径

## 2. 运行时与配置

- [x] 2.1 为前端新增 `openclaw-proxy` runtime
- [x] 2.2 新增所需环境变量与默认诊断提示
- [x] 2.3 确保运行时切换不会破坏现有 `mock-openclaw` 与 `openclaw-direct`

## 3. Proxy 传输与适配层

- [x] 3.1 设计并实现 proxy transport 骨架
- [x] 3.2 设计并实现 `ChatAdapter` 对应的 proxy adapter
- [x] 3.3 保持页面层继续只消费统一 adapter 输出

## 4. 本地 company gateway dev

- [x] 4.1 新增本地 company gateway dev 最小 server
- [x] 4.2 打通本地 `Browser -> Company Gateway Dev -> Local OpenClaw` 链路
- [x] 4.3 新增一键开发脚本，用于本地 proxy 模式联调

## 5. 最小能力闭环

- [x] 5.1 打通 `sessions.list`
- [x] 5.2 打通 `sessions.patch`
- [x] 5.3 打通 `sessions.delete`
- [x] 5.4 打通 `chat.history`
- [x] 5.5 打通 `chat.send`
- [x] 5.6 打通 `chat.abort`

## 6. Runtime 与像素风办公室

- [x] 6.1 在 `openclaw-proxy` 模式下继续输出统一会话级 runtime
- [x] 6.2 确保像素风办公室入口与工作台可以复用该 runtime
- [x] 6.3 明确 proxy 模式下 runtime 诊断与错误提示

## 7. 测试与验证

- [x] 7.1 补充 runtime 配置与模式切换测试
- [x] 7.2 补充 proxy transport / adapter 测试
- [x] 7.3 补充会话管理真实闭环测试
- [x] 7.4 补充本地 company gateway dev 联调说明与验证步骤

## 8. 收口与文档更新

- [x] 8.1 更新阶段七相关文档、README 与总览引用
- [x] 8.2 明确 `openclaw-direct` 在会话管理上的边界说明
- [x] 8.3 形成后续接入公司正式网关时可直接复用的契约与约束说明
