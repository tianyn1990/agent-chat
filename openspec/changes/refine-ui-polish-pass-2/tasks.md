## 1. OpenSpec

- [ ] 1.1 创建第二轮 UI 精修 change 文档
- [ ] 1.2 更新 spec delta（workspace-ui）
- [ ] 1.3 通过 `openspec validate --strict`

## 2. Chat 细节打磨

- [ ] 2.1 收敛标题区：减少 meta 卡片占比与信息噪音
- [ ] 2.2 移除原始 `sessionId` 直出，改为可读语义
- [ ] 2.3 优化欢迎态首屏密度，确保 CTA 完整可见
- [ ] 2.4 建立更稳定的消息阅读轨道

## 3. Skills 细节打磨

- [ ] 3.1 已安装与所有技能去重
- [ ] 3.2 空态文案调整，避免“空列表”误解
- [ ] 3.3 补齐搜索输入 `aria-label`

## 4. Login 细节打磨

- [ ] 4.1 修正 heading hierarchy
- [ ] 4.2 强化右侧 CTA 权重与聚焦感

## 5. 测试与校验

- [ ] 5.1 更新受影响的测试断言
- [ ] 5.2 运行 `npm run lint`
- [ ] 5.3 运行 `npm run test`
