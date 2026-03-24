# 实施任务：真实 Star-Office-UI 侧车接入

> 对应 Change: `add-real-star-office-sidecar`

## 1. 文档与评审

- [x] 评审本 change 的 proposal、design、spec 是否与阶段六目标一致
- [x] 确认真实 Star-Office-UI 的能力定位仍为“执行状态视图”，而不是 workflow DAG
- [x] 在阶段六主文档、部署指南、项目总览中引用本 change

## 2. 上游来源与许可证

- [ ] 确认采用公司 fork、git submodule 还是 git subtree
- [ ] 固定上游 commit 或 release 版本
- [ ] 明确记录像素素材许可证边界
- [ ] 在实现前完成商用场景的许可证核查

## 3. 本地开发接入

- [x] 设计并落地真实 Star-Office sidecar 的本地启动方式
- [x] 在开发环境提供同域代理入口，例如 `/star-office/`
- [x] 明确本地 `real-office-dev` 模式下的同域代理与访问链路
- [x] 保留当前本地 mock 作为 sidecar 不可用时的兜底模式
- [x] 验证本地能看到真实像素办公室效果

## 4. session facade / 适配层

- [ ] 明确 `chatSessionId -> OpenClaw session` 的绑定来源
- [x] 设计并实现基于 `/star-office/session/:sessionId/` 的 session facade
- [x] 验证一个 iframe 仅展示一个会话的状态
- [x] 验证多会话切换不会串线

## 5. 生产部署

- [ ] 在子域名和子路径之间做最终决策
- [ ] 如采用子路径，补齐上游 base path patch 或代理重写
- [ ] 输出 Docker Compose、Nginx 与运行说明
- [ ] 验证同域 iframe 嵌入效果

## 6. 回归与验收

- [x] 验证真实 sidecar 可用时，前端优先使用真实服务
- [x] 验证“未配置真实地址且开启本地 mock”时回退到本地 mock
- [ ] 验证“已配置真实地址但 sidecar 不可用”时显示明确不可用提示，而不是静默切回 mock
- [ ] 验证文档、脚本和配置项可支持团队协作
