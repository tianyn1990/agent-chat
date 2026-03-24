# Star-Office-UI 部署指南

> 本文档提供推荐示例，不要求照搬。重点是说明 `agent-chat + OpenClaw + Star-Office-UI` 的职责边界与部署前提。
>
> 如果你关注的是“为什么需要真实 sidecar、为什么本地 mock 不够、为什么不建议直接把上游工程硬拷贝进主前端”，请先阅读 [阶段六-真实Star-Office-UI侧车接入方案.md](./阶段六-真实Star-Office-UI侧车接入方案.md)。

## 1. 推荐部署拓扑

```text
Browser
  └─ agent-chat
      └─ iframe -> Star-Office-UI

Gateway / Adapter Layer
  ├─ OpenClaw
  └─ 将 session 事件翻译为 Star-Office-UI 状态
```

推荐目标：

- `agent-chat` 与 `Star-Office-UI` 使用相同主域名
- 可选同域子路径，如 `/star-office/`
- 或单独子域名，如 `office.example.com`

## 2. 环境变量

前端：

```env
VITE_STAR_OFFICE_URL=/star-office/
```

如果你使用子域名：

```env
VITE_STAR_OFFICE_URL=https://office.example.com/
```

## 3. Docker Compose 示例

```yaml
version: "3.9"

services:
  agent-chat:
    build: ./agent-chat
    restart: unless-stopped

  openclaw:
    image: openclaw/openclaw:latest
    restart: unless-stopped

  star-office-ui:
    build: ./Star-Office-UI
    working_dir: /app/backend
    command: python3 app.py
    environment:
      FLASK_SECRET_KEY: replace-with-random-secret
      ASSET_DRAWER_PASS: replace-with-strong-pass
    restart: unless-stopped

  visualize-adapter:
    image: your-company/openclaw-visualize-adapter:latest
    environment:
      OPENCLAW_URL: http://openclaw:18789
      STAR_OFFICE_URL: http://star-office-ui:19000
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "80:80"
    depends_on:
      - agent-chat
      - star-office-ui
```

## 4. Nginx 示例

### 4.1 子路径方案

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://agent-chat:3000;
    }

    location /star-office/ {
        proxy_pass http://star-office-ui:19000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

注意：

- 这个方案只解决“同域访问”
- Star-Office-UI 目前默认请求根路径 `/status` `/agents`
- 如果前端代码未适配 base path，仍然可能需要 patch 上游项目

### 4.2 子域名方案

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://agent-chat:3000;
    }
}

server {
    listen 80;
    server_name office.example.com;

    location / {
        proxy_pass http://star-office-ui:19000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

这个方案更稳，因为不要求 Star-Office-UI 支持路径前缀。

## 5. OpenClaw 状态同步说明

### 5.1 为什么需要适配层

Star-Office-UI 原生接口只理解：

- `/status`
- `/agents`
- `POST /set_state`
- `POST /agent-push`

它不理解：

- `sessionId`
- OpenClaw 的 sessionKey
- workflow trace

因此必须有适配层把 OpenClaw 事件翻译为：

```json
{
  "state": "researching",
  "detail": "正在分析用户请求"
}
```

### 5.2 推荐映射

| OpenClaw 事件 | Star-Office-UI 状态 |
|---|---|
| 用户消息刚进入 | `researching` |
| LLM 正在生成回复 | `writing` |
| 执行工具 / 命令 / 任务 | `executing` |
| 同步外部系统 | `syncing` |
| 当前轮完成 | `idle` |
| 发生错误 | `error` |

### 5.3 会话级绑定

适配层还要解决一个核心问题：

- 用户在 `agent-chat` 中点开的是哪个会话
- 当前 iframe 里显示的是哪个会话的状态

推荐做法：

- 维护 `agent-chat sessionId -> OpenClaw sessionKey`
- 维护 `sessionId -> latest visualize state`
- 当用户打开 `/visualize/:sessionId` 或右侧面板时，按该会话上下文读取状态

如果做不到这一点，那么页面展示的就只是“Agent 全局状态”，不能声称是会话级执行状态。

## 6. 发布前检查

- [ ] `VITE_STAR_OFFICE_URL` 已配置
- [ ] Star-Office-UI 可在目标环境访问
- [ ] 明确采用子路径还是子域名
- [ ] 如果使用子路径，已验证 base path 行为
- [ ] OpenClaw session 映射规则已确定
- [ ] 状态适配层已实现并压测
