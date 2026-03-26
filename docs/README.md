# OpenClaw Web 客户端 - 文档目录

> 最后更新：2026-03-27

## 📚 文档导航

### 总体设计
- [00-总体设计方案.md](./00-总体设计方案.md) - 项目整体架构和技术选型

### 阶段文档
- [01-阶段一-项目初始化.md](./01-阶段一-项目初始化.md) - ✅ 已完成
- [02-阶段二-登录模块.md](./02-阶段二-登录模块.md) - ✅ 已完成
- [03-阶段三-对话模块.md](./03-阶段三-对话模块.md) - ✅ 已完成
- [04-阶段四-卡片与图表.md](./04-阶段四-卡片与图表.md) - ✅ 已完成
- [05-阶段五-技能市场.md](./05-阶段五-技能市场.md) - ✅ 已完成
- [06-阶段六-可视化集成与优化.md](./06-阶段六-可视化集成与优化.md) - 🚧 进行中
- [阶段六-真实Star-Office-UI侧车接入方案.md](./阶段六-真实Star-Office-UI侧车接入方案.md) - 真实上游 sidecar 接入与本地高保真方案
- [阶段六-服务端适配层设计.md](./阶段六-服务端适配层设计.md) - 服务端会话适配层详细方案
- [07-阶段七-Mock转真实接口.md](./07-阶段七-Mock转真实接口.md) - ⏳ 待开始
- [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md) - OpenClaw 协议接入三阶段总方案（本地 mock / 本地直连 / 公司网关）
- [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md) - 第二阶段：浏览器直连本机真实 OpenClaw Gateway 的详细方案
- [本地OpenClaw联调操作手册.md](./本地OpenClaw联调操作手册.md) - 本地 mock / direct / proxy 三种模式的启动、切换、工作台承接与排障手册

### 阶段五专项文档
- [05-阶段五-开发总结.md](./05-阶段五-开发总结.md) - 开发过程总结
- [阶段五-完整交付报告.md](./阶段五-完整交付报告.md) - 详细交付报告
- [阶段五-快速总结.md](./阶段五-快速总结.md) - 快速总结
- [技能市场使用指南.md](./技能市场使用指南.md) - 用户使用手册
- [Star-Office-UI-部署指南.md](./Star-Office-UI-部署指南.md) - Star-Office-UI 同域/子域部署与适配说明

### 项目管理
- [项目进度总览.md](./项目进度总览.md) - 项目整体进度和里程碑

### OpenSpec 变更
- [../openspec/README.md](../openspec/README.md) - OpenSpec 变更索引
- [../openspec/changes/add-real-star-office-sidecar/proposal.md](../openspec/changes/add-real-star-office-sidecar/proposal.md) - 真实 Star-Office-UI 侧车接入变更提案
- [../openspec/changes/add-openclaw-direct-dev-runtime/proposal.md](../openspec/changes/add-openclaw-direct-dev-runtime/proposal.md) - 本地直连真实 OpenClaw 开发运行时变更提案
- [../openspec/changes/add-openclaw-proxy-runtime/proposal.md](../openspec/changes/add-openclaw-proxy-runtime/proposal.md) - 本地 company-gateway / proxy 运行时变更提案
- [../openspec/changes/stabilize-openclaw-direct-runtime-and-session-boundaries/proposal.md](../openspec/changes/stabilize-openclaw-direct-runtime-and-session-boundaries/proposal.md) - 本地直连稳定化：握手恢复、会话边界与工作台桥接
- [../openspec/changes/update-visualize-workbench-flow/proposal.md](../openspec/changes/update-visualize-workbench-flow/proposal.md) - 摘要侧栏与沉浸式工作台流程变更提案
- [../openspec/changes/update-visualize-immersive-entry-flow/proposal.md](../openspec/changes/update-visualize-immersive-entry-flow/proposal.md) - 一键直达沉浸式工作台与 iframe-first 交互变更提案

## 🎯 当前状态

**项目进度**：78% (阶段六进行中)

**最新完成**：阶段五 - 技能市场 ✅

**下一步**：阶段七第三阶段 - 对接公司正式网关 / BFF

**协议接入路线**：参考 [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)

## 📊 项目统计

- **总代码行数**：约 8,000+ 行
- **单元测试**：322 个测试用例
- **测试通过率**：100%
- **文档数量**：17 个

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动本地 company-gateway 主联调模式
npm run dev:openclaw-proxy

# 启动本地直连诊断模式
npm run dev:openclaw-direct

# 运行测试
npm run test

# 仅运行纯逻辑测试（node）
npm run test:logic

# 仅运行组件/页面测试（jsdom）
npm run test:ui

# 代码检查
npm run lint

# 生产构建
npm run build
```

## 📖 阅读建议

### 新手入门
1. 先阅读 [00-总体设计方案.md](./00-总体设计方案.md) 了解项目整体架构
2. 按顺序阅读各阶段文档，了解功能实现细节
3. 查看 [项目进度总览.md](./项目进度总览.md) 了解当前进度

### 开发人员
1. 阅读对应阶段的技术设计文档
2. 查看代码实现和单元测试
3. 参考开发总结文档了解技术细节
4. 如需本地看到真实 Star-Office 像素办公室效果，优先阅读 [阶段六-真实Star-Office-UI侧车接入方案.md](./阶段六-真实Star-Office-UI侧车接入方案.md)
5. 如需推进真实 OpenClaw 联调，先读 [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)，再根据需要选择：
6. 主联调路径：阅读 [本地OpenClaw联调操作手册.md](./本地OpenClaw联调操作手册.md) 中的 `openclaw-proxy`
7. 底层诊断路径：阅读 [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md)

### 用户
1. 阅读 [技能市场使用指南.md](./技能市场使用指南.md)
2. 了解如何使用各项功能

## 🔗 相关链接

- 项目仓库：`/Users/hetao/Documents/github/agent-chat`
- 源代码：`../src`
- 测试代码：`../tests` 和 `../src/**/__tests__`

## 📝 文档维护

如需更新文档，请遵循以下规范：
- 使用 Markdown 格式
- 保持文档结构清晰
- 及时更新状态标识（✅ ⏳ ❌）
- 添加必要的代码示例和截图

---

**维护者**：开发团队
**最后更新**：2026-03-27
