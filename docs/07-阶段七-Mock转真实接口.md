# 阶段七：Mock 替换为真实后端接口

> **当前状态**：⏳ 待实现。本阶段在所有 Mock 功能验证完成后执行，将 Mock 替换为真实的后端调用。

## 0. 当前阶段说明

在进入真实接口联调之前，chat 层已经新增了一轮“协议侧预重构”：

- 本地 mock 已从旧业务型 WebSocket mock 升级为 **OpenClaw-compatible mock**
- 页面层已通过统一 chat adapter 消费会话、消息与执行状态
- 像素风办公室继续沿用会话级 runtime，并保留本地 mock / real-dev 承接能力

这意味着当前阶段七不再是“直接从旧 mock 跳到真实接口”，而是继续按以下路线推进：

1. 已完成：本地 mock 协议抽象阶段
2. 待完成：本地直连真实 OpenClaw
3. 待完成：公司网关 / BFF 接入

详细总体路线请先阅读：

- [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)
- [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md)
- [本地OpenClaw联调操作手册.md](./本地OpenClaw联调操作手册.md)

## 0.1 当前文档边界说明

本文件保留“从 mock 逐步替换为真实后端”的阶段入口作用，但其中较旧的“直接替换旧 websocket”为真实后端的表述，已经不再适合作为第二阶段的直接实施依据。

目前推荐阅读顺序为：

1. [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)
2. [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md)
3. [本地OpenClaw联调操作手册.md](./本地OpenClaw联调操作手册.md)
4. 对应 OpenSpec change 文档

也就是说：

- 本地 mock：已完成
- 本地直连：应按新的 direct runtime 方案推进
- 公司网关：后续独立推进

补充说明：

- 本地直连阶段当前已新增稳定化 change：`stabilize-openclaw-direct-runtime-and-session-boundaries`
- 该 change 负责解决 `device signature invalid / expired`、dashboard 会话边界、权威 session 创建与工作台 bridge 等真实联调问题
- 因此在进入公司网关阶段前，应先以该稳定化结果为基线，而不是回退到更早的 direct 方案

## 1. 目标
- 将飞书 OAuth 登录的 Mock 替换为真实后端接口
- 将 Mock WebSocket 服务替换为真实 WebSocket 连接
- 将 Mock 文件上传替换为真实 `POST /api/upload` 接口
- 将 Mock Skills 数据替换为真实 `GET /api/skills` 接口
- 完善错误处理与边界情况

## 2. 替换清单

### 2.1 登录模块（阶段二）

| Mock 位置 | 真实接口 | 说明 |
|-----------|---------|------|
| `src/mocks/auth.ts → mockLogin()` | `POST /api/auth/feishu/callback` | 飞书 code 换 JWT |
| `src/services/auth.ts → getMe()` | `GET /api/auth/me` | 获取当前用户信息 |
| `src/services/auth.ts → refreshToken()` | `POST /api/auth/refresh` | 刷新 JWT |
| `src/services/auth.ts → logout()` | `POST /api/auth/logout` | 登出（清除服务端 session） |

**替换步骤**：
1. 修改 `src/pages/Login/index.tsx`：将 Mock 模式下的 `mockLogin()` 改为跳转真实飞书 OAuth URL
2. 修改 `src/pages/Login/Callback.tsx`：调用真实 `authApi.feishuCallback(code)` 并保存 token

### 2.2 WebSocket 服务（阶段三）

| Mock 位置 | 真实替换 | 说明 |
|-----------|---------|------|
| `src/mocks/websocket.ts → MockWebSocketService` | `src/services/websocket.ts → WebSocketService` | 真实 WS 连接 |
| `VITE_CHAT_RUNTIME` 环境变量 | `.env.local` 中改为 `openclaw-direct` | 切换到本地直连运行时 |

**替换步骤**：
1. 修改 `.env.local`：

   ```env
   VITE_CHAT_RUNTIME=openclaw-direct
   VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
   ```

2. 如需鉴权，再补充 `VITE_OPENCLAW_GATEWAY_TOKEN` 或 `VITE_OPENCLAW_GATEWAY_PASSWORD`
3. 建议优先使用 `npm run dev:openclaw-direct`，让脚本自动托管 Gateway 生命周期与本地工作台 mock
4. 验证真实 Gateway 握手、`sessions.list / sessions.create / chat.history / chat.send / chat.abort` 是否正常

### 2.3 文件上传（阶段三）

| Mock 位置 | 真实接口 | 说明 |
|-----------|---------|------|
| `src/components/Chat/FileUploadButton.tsx` 中本地生成 fileId | `POST /api/upload` | 真实文件上传，返回 fileId |

**替换步骤**：
1. 在 `src/services/upload.ts` 中实现 `uploadFile(file: File): Promise<string>` 接口
2. 在 `FileUploadButton.tsx` 中调用该接口，添加上传进度展示
3. 上传失败时提示用户并从待发列表移除

**接口规范**：
```typescript
// POST /api/upload
// Content-Type: multipart/form-data
// Authorization: Bearer {token}
// Response:
{
  "fileId": "string",   // 服务端文件 ID
  "url": "string",      // 预览 URL（可选）
  "size": number,
  "name": "string"
}
```

### 2.4 Skills 数据（阶段五）

| Mock 位置 | 真实接口 | 说明 |
|-----------|---------|------|
| `src/mocks/skills.ts → MOCK_SKILLS` | `GET /api/skills` | 技能列表 |
| 本地状态更新 | `POST /api/skills/{id}/install` | 安装技能 |
| 本地状态更新 | `DELETE /api/skills/{id}/install` | 卸载技能 |

## 3. 环境变量配置

```env
# .env.production（生产环境）
VITE_CHAT_RUNTIME=legacy-websocket
VITE_API_BASE_URL=https://api.your-domain.com
VITE_FEISHU_APP_ID=your_feishu_app_id
VITE_FEISHU_REDIRECT_URI=https://your-domain.com/auth/callback
VITE_STAR_OFFICE_URL=https://star-office.your-domain.com

# .env.local（本地开发，默认 Mock）
VITE_CHAT_RUNTIME=mock-openclaw

# .env.local（本地直连真实 OpenClaw）
VITE_CHAT_RUNTIME=openclaw-direct
VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
VITE_OPENCLAW_GATEWAY_TOKEN=
VITE_OPENCLAW_GATEWAY_PASSWORD=
VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN=
VITE_OPENCLAW_GATEWAY_ROLE=operator
VITE_OPENCLAW_GATEWAY_SCOPES=operator.read,operator.write
VITE_STAR_OFFICE_MOCK_ENABLED=true
```

## 4. 接口联调测试清单

| 功能 | 测试步骤 | 预期结果 |
|------|---------|---------|
| 飞书登录 | 点击登录跳转飞书授权页 | 授权后回调，显示用户信息 |
| WebSocket 连接 | 打开对话页面 | 状态栏显示"已连接" |
| 发送消息 | 输入消息并发送 | AI 流式回复出现 |
| 文件上传 | 选择图片文件 | 文件上传后 fileId 返回，发送成功 |
| Token 刷新 | 等待 token 即将过期 | 自动静默刷新，无感知 |
| 断线重连 | 断开网络再恢复 | 自动重连并恢复正常 |

## 5. 验收标准

- [ ] 飞书 OAuth 完整流程可用
- [ ] WebSocket 真实连接，AI 回复正常
- [ ] 文件上传到服务端，fileId 真实有效
- [ ] Skills 数据从服务端加载
- [ ] 本地直连模式可运行（`VITE_CHAT_RUNTIME=openclaw-direct`）
- [ ] 生产构建正常

## 6. 注意事项

- Mock 代码不需要删除，保留用于本地开发（通过环境变量控制）
- 替换时采用增量方式，每替换一个接口就进行一次集成测试
- 后端接口格式如有偏差，优先修改前端适配层（`src/services/`），不改核心组件
