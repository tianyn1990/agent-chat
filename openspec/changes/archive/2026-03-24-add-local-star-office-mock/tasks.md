# 实施任务：Star-Office-UI 本地 Mock

> 对应 Change: `add-local-star-office-mock`

## 1. 文档与配置

- [x] 明确并补充本地 mock 相关环境变量说明
- [x] 在阶段六文档中引用本次 OpenSpec change
- [x] 在开发说明中补充本地 mock 的启动与切换方式

## 2. iframe 地址选择逻辑

- [x] 增加本地 mock 开关判断
- [x] 定义真实地址与本地 mock 地址的优先级
- [x] 确保 iframe URL 始终携带当前 `sessionId`

## 3. 本地 mock adapter

- [x] 实现 dev-only 的状态内存存储
- [x] 实现 `GET /__mock/star-office/status`
- [x] 实现 `GET /__mock/star-office/agents`
- [x] 实现 `POST /__mock/star-office/adapter/push`
- [x] 实现 `POST /__mock/star-office/reset`

## 4. 本地 mock 页面

- [x] 实现 iframe 承接页面
- [x] 读取并校验 `sessionId`
- [x] 轮询本地 mock adapter
- [x] 展示会话 ID、状态、detail、更新时间
- [x] 补充空态、错误态与等待态

## 5. 前端状态桥接

- [x] 复用 `useVisualizeStore` 或等价运行态来源
- [x] 将会话运行态映射为 mock 执行状态
- [x] 增加节流与去重，避免高频无效推送
- [x] 确保多会话状态互不覆盖

## 6. 测试

- [x] 增加 iframe URL 生成逻辑测试
- [x] 增加 mock adapter 会话隔离测试
- [x] 增加 mock 页面缺少 `sessionId` 的错误测试
- [x] 增加多会话切换不串状态测试

## 7. 验收

- [x] `npm run dev` 下无需额外服务即可看到执行状态 iframe
- [x] 任意会话打开面板时都只展示本会话状态
- [x] 未开启本地 mock 时仍保持现有降级提示
- [x] 文档与实现保持一致
