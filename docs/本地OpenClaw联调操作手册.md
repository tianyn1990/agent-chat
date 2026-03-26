# 本地 OpenClaw 联调操作手册

> 最后更新：2026-03-27
>
> 本文档面向本仓库开发者与后续协作 Agent，提供一套可直接执行的本地 OpenClaw 联调操作说明。重点是让 `agent-chat` 在 `mock-openclaw`、`openclaw-direct` 与 `openclaw-proxy` 三种运行模式之间稳定切换，并明确本地 Gateway、company-gateway dev 与像素风工作台的启动、验证、停止与排障方式。

## 1. 文档用途

这份手册回答的是“怎么操作”：

- 如何在本机启动 OpenClaw dev Gateway
- 如何让 `agent-chat` 切换到本地直连模式或本地 company-gateway 模式
- 如何判断当前问题出在前端、Gateway 还是模型配置
- 如何切回本地 mock，避免调试被阻塞

它不替代以下文档：

- [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)
- [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md)

前两者回答“为什么这样设计”和“分阶段怎么演进”；本文只关注日常联调操作。

## 2. 当前项目的本地运行模式

### 2.1 `mock-openclaw`

适用场景：

- 日常前端开发
- UI 调整
- 自动化测试
- 本地没有真实 OpenClaw 时的兜底

典型配置：

```env
VITE_CHAT_RUNTIME=mock-openclaw
```

### 2.2 `openclaw-direct`

适用场景：

- 本地联调真实 Gateway 协议
- 验证真实会话、真实流式回复、真实执行状态
- 后续接入真实本地 Star-Office-UI / sidecar 前的前置验证

典型配置：

```env
VITE_CHAT_RUNTIME=openclaw-direct
VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
VITE_OPENCLAW_GATEWAY_ROLE=operator
VITE_OPENCLAW_GATEWAY_SCOPES=operator.read,operator.write,operator.admin
```

### 2.3 `openclaw-proxy`

适用场景：

- 作为本地主联调路径，模拟未来 `Browser -> Company Gateway / BFF -> OpenClaw` 拓扑
- 验证真实会话管理能力，而不是继续让浏览器承担受限的 `webchat` 管理职责
- 继续联动像素风办公室，同时避免 `openclaw-direct` 的 `sessions.patch / sessions.delete` 能力边界

典型配置：

```env
VITE_CHAT_RUNTIME=openclaw-proxy
VITE_OPENCLAW_PROXY_URL=/__openclaw_proxy
VITE_OPENCLAW_PROXY_DEV_TARGET=http://127.0.0.1:19002
OPENCLAW_PROXY_GATEWAY_URL=ws://127.0.0.1:19001
```

边界说明：

- `openclaw-proxy` 是当前推荐的本地主联调模式
- `openclaw-direct` 保留，但已经退回到底层协议诊断模式
- 后续接公司正式网关时，前端优先沿用 `openclaw-proxy` 这条路径

## 3. 前置条件

开始本地直连前，应至少满足以下条件：

1. 本机已安装 `openclaw`
2. Node 版本满足 OpenClaw 当前版本要求
3. 已完成至少一种可用模型 Provider 配置，例如 `MiniMax`
4. 前端以 `localhost` 或 `127.0.0.1` 访问，而不是局域网 IP

验证命令：

```bash
openclaw --version
node --version
```

说明：

- 当前仓库的 direct 模式明确限制在 loopback 场景
- 若你通过 `http://192.168.x.x:3000` 打开前端，浏览器直连本地 Gateway 的行为不保证可用

## 4. 启动方式

## 4.0 推荐方式：使用仓库一键 company-gateway 脚本

当前仓库已经提供推荐命令：

```bash
npm run dev:openclaw-proxy
```

该命令会自动完成以下动作：

1. 先尝试停止当前已加载的 OpenClaw dev Gateway
2. 以前台子进程方式启动 `openclaw --dev gateway run`
3. 启动本地 `company-gateway dev`，默认监听 `http://127.0.0.1:19002`
4. 仅对当前前端子进程注入 `openclaw-proxy` 运行时环境变量
5. 自动以 `localhost` 启动 Vite，并将 `/__openclaw_proxy` 代理到本地 `company-gateway dev`
6. 当你 `Ctrl+C` 停止命令时，同时停止 Vite、本次拉起的 proxy dev server 与 Gateway
7. 若未显式配置 `VITE_STAR_OFFICE_REAL_DEV_ENABLED=true`，会默认打开 `VITE_STAR_OFFICE_MOCK_ENABLED=true`
8. proxy 模式下的工作台继续消费统一会话级 runtime，因此像素风办公室入口可以和聊天主链路一起联调

额外说明：

- 本地 proxy dev server 会优先复用官方 `GatewayClient`
- 当前仓库不会把 `openclaw` 安装为本地依赖，而是从全局安装目录动态定位：
  - 默认尝试 `npm root -g`
  - 如定位失败，可显式设置 `OPENCLAW_GATEWAY_RUNTIME_ENTRY`
- 如果你只是日常联调聊天和会话管理，应优先用本模式

## 4.1 次推荐方式：使用仓库一键直连脚本

当前仓库已经提供推荐命令：

```bash
npm run dev:openclaw-direct
```

该命令会自动完成以下动作：

1. 先尝试停止当前已加载的 OpenClaw dev service
2. 以前台子进程方式启动 `openclaw --dev gateway run`
3. 仅对当前前端子进程注入 `openclaw-direct` 运行时环境变量
4. 自动以 `localhost` 启动 Vite，避免 direct 模式误走局域网 origin
5. 当你 `Ctrl+C` 停止命令时，同时停止 Vite 与本次拉起的 Gateway
6. 额外再执行一次 `gateway stop`，避免本机 LaunchAgent 把 `19001` 再次拉起
7. 若未显式配置 `VITE_STAR_OFFICE_REAL_DEV_ENABLED=true`，会默认打开 `VITE_STAR_OFFICE_MOCK_ENABLED=true`
8. direct 模式下的工作台会继续通过本地 Star-Office mock 承接真实 runtime，便于聊天协议与像素办公室一起联调
9. 对 `operator` 角色会自动补齐 `operator.admin`，确保本地联调时“重命名 / 删除真实会话”可以真正落到 Gateway

说明：

- 该命令不会改写你的 `.env.local`
- 首次直连时，浏览器会自动生成并缓存一份 OpenClaw `device identity`
- 后续刷新页面会复用同一 identity，并在 Gateway 返回时持久化 `device token`
- 如果你曾经用旧的 read/write scopes 联调过，脚本现在会在检测到缓存 token scopes 不足时自动放弃旧 token，重新申请包含 `operator.admin` 的新 token
- 额外参数会透传给 Vite，例如：

```bash
npm run dev:openclaw-direct -- --port 3011
```

说明补充：

- 该命令依然有价值，但当前更适合做“底层协议诊断”
- 当你要确认问题是出在浏览器直连握手、device token、session 消息订阅，还是出在 proxy / BFF 时，再切回该模式
- 如果你的目标是验证“会话重命名 / 删除”这种正式能力，请优先回到 `openclaw-proxy`

## 4.2 临时前台运行

适合短时间联调，最直观。

```bash
openclaw --dev gateway run --auth none --allow-unconfigured --force
```

特点：

- Gateway 在当前终端前台运行
- 关闭终端后，Gateway 会退出
- 适合临时排查协议问题

如果你当前只是临时验证协议或想脱离仓库脚本单独排查，本方式足够。  
但日常联调更推荐使用上面的 `npm run dev:openclaw-direct`。

## 4.3 安装为本地 dev 服务

适合长期联调，推荐作为默认方式。

首次安装：

```bash
openclaw --dev gateway install
```

启动服务：

```bash
openclaw --dev gateway start
```

检查状态：

```bash
openclaw --dev gateway status
openclaw --dev gateway health
```

停止服务：

```bash
openclaw --dev gateway stop
```

重启服务：

```bash
openclaw --dev gateway restart
```

说明：

- 如果你频繁本地直连调试，不建议每次都手动保持一个前台终端
- 将 Gateway 安装成 dev 服务后，调试体验会稳定很多
- 但如果你只是在本仓库里做直连联调，依然建议优先使用 `npm run dev:openclaw-direct`，因为它能自动处理启动、切换和关闭

## 5. `agent-chat` 如何手动切换运行时

### 5.1 切到本地 company-gateway 模式

编辑本地环境文件，例如 `.env.local`：

```env
VITE_CHAT_RUNTIME=openclaw-proxy
VITE_OPENCLAW_PROXY_URL=/__openclaw_proxy
VITE_OPENCLAW_PROXY_DEV_TARGET=http://127.0.0.1:19002
OPENCLAW_PROXY_GATEWAY_URL=ws://127.0.0.1:19001
```

然后分别启动：

```bash
openclaw --dev gateway run --auth none --allow-unconfigured --force
node ./scripts/openclaw-proxy-dev-server.mjs
npm run dev
```

但日常开发仍推荐直接使用：

```bash
npm run dev:openclaw-proxy
```

### 5.2 切到本地直连模式

编辑本地环境文件，例如 `.env.local`：

```env
VITE_CHAT_RUNTIME=openclaw-direct
VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
VITE_OPENCLAW_GATEWAY_TOKEN=
VITE_OPENCLAW_GATEWAY_PASSWORD=
VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN=
VITE_OPENCLAW_GATEWAY_ROLE=operator
VITE_OPENCLAW_GATEWAY_SCOPES=operator.read,operator.write,operator.admin
```

然后启动前端：

```bash
npm run dev
```

推荐访问方式：

```text
http://localhost:3000
```

或：

```text
http://127.0.0.1:3000
```

不推荐：

```text
http://192.168.x.x:3000
```

如果你使用 `npm run dev:openclaw-direct`，脚本会自动把 Vite 绑定到 `localhost`，无需手动再改 host。

## 6. 如何确认本地 Gateway / Proxy 真的可用

不要只看浏览器里 `http://127.0.0.1:19001/` 是否有页面。

更可靠的检查顺序是：

### 6.1 先看 Gateway health

```bash
openclaw --dev gateway health
```

如果返回 `OK`，说明 Gateway 至少处于可探测状态。

### 6.2 如果使用 proxy 模式，再看 company-gateway dev health

```bash
curl http://127.0.0.1:19002/health
```

期望返回：

- `ok: true`
- `payload.gatewayConnected: true`

### 6.3 再看端口监听

```bash
lsof -nP -iTCP:19001 -sTCP:LISTEN
lsof -nP -iTCP:19002 -sTCP:LISTEN
```

如果对应端口没有监听，说明 Gateway 或 proxy 实际没有在运行。

### 6.4 最后再看 dashboard 页面

```text
http://127.0.0.1:19001/
```

注意：

- 某些情况下 CLI 会打印 `Dashboard URL: http://127.0.0.1:19001/`
- 但真正判断联调是否可继续，仍应以 `gateway health` 与实际 WebSocket 可连接为准
- 因为页面根路径异常，不一定等于 WebSocket Gateway 不可用；反过来，页面能打开也不等于 chat 一定正常

## 7. 常见问题与排查

## 7.0 三种运行时该怎么选

推荐顺序：

1. `mock-openclaw`
   - UI 开发、样式调整、稳定回归
2. `openclaw-proxy`
   - 主联调路径，验证真实会话管理与更贴近正式环境的链路
3. `openclaw-direct`
   - 底层协议诊断，验证握手、device token、`sessions.messages.subscribe` 等细节

## 7.1 页面提示“等待 OpenClaw 握手超时”

优先检查：

1. Gateway 是否已启动
2. `VITE_OPENCLAW_GATEWAY_URL` 是否正确
3. 前端是否从 `localhost / 127.0.0.1` 访问
4. 当前前端实现是否已修复对应握手协议兼容问题

建议命令：

```bash
openclaw --dev gateway health
tail -f /tmp/openclaw/openclaw-$(date +%F).log
```

## 7.2 会话重命名 / 删除在 direct 模式下失败

这是当前已经确认的真实边界，不是前端单纯权限不足：

- 浏览器 `webchat` 客户端不能直接调用 `sessions.patch`
- 浏览器 `webchat` 客户端不能直接调用 `sessions.delete`

如果你看到类似错误：

- `webchat clients cannot patch sessions`
- `webchat clients cannot delete sessions`

正确动作不是继续堆 scopes，而是切换到：

```bash
npm run dev:openclaw-proxy
```

让本地 company-gateway dev 以受控服务端身份去执行这些方法。

## 7.3 proxy 模式提示无法定位官方 GatewayClient

当前本地 proxy dev server 会动态加载全局 `openclaw` 安装目录中的：

- `openclaw/dist/plugin-sdk/gateway-runtime.js`

如果日志提示找不到入口，可按以下顺序排查：

1. 先确认全局已安装 `openclaw`

```bash
openclaw --version
npm root -g
```

2. 如果 `npm root -g` 可用，但路径不是当前 Node 进程默认前缀，可显式设置：

```bash
export OPENCLAW_GLOBAL_NODE_MODULES="$(npm root -g)"
```

3. 如果仍不稳定，直接指定准确入口：

```bash
export OPENCLAW_GATEWAY_RUNTIME_ENTRY="/绝对路径/openclaw/dist/plugin-sdk/gateway-runtime.js"
```

## 7.2 页面 toast 提示 `device identity required`

这通常表示：

- 浏览器直连请求没有携带有效的 OpenClaw `device` 身份
- 或者本地缓存的 device 身份 / token 已损坏

当前仓库的新直连实现会自动：

1. 在浏览器中生成 Ed25519 device identity
2. 用 `connect.challenge` 的 `nonce` 做 v3 签名
3. 在 `hello-ok` 成功后缓存 Gateway 返回的 `device token`

如果你仍看到这个错误，优先执行：

1. 重启 `npm run dev:openclaw-direct`
2. 刷新页面
3. 清理浏览器 localStorage 中以下键后再重试：

```text
oc_openclaw_direct_device_identity
oc_openclaw_direct_device_tokens
```

然后再看 Gateway 日志是否仍出现 `device identity required`。

## 7.2.1 页面提示 `device signature invalid / expired`

这表示浏览器本地缓存的 `device token` 与本次握手上下文不再匹配，常见于：

- Gateway 已重置或重装
- 浏览器缓存了旧的 `device token`
- 页面刷新后开始复用旧 token，但签名上下文已经变化

当前仓库已内置一次性受控恢复逻辑：

1. 首次握手若命中 `device signature invalid / expired`
2. 前端只清理冲突的 `oc_openclaw_direct_device_tokens`
3. 保留稳定的 `oc_openclaw_direct_device_identity`
4. 自动再发起一次握手

因此大多数情况下，你只需要：

1. 刷新页面或重新执行 `npm run dev:openclaw-direct`
2. 观察是否自动恢复

若仍未恢复，再手动清理：

```text
oc_openclaw_direct_device_tokens
```

只有在多次恢复仍失败时，才建议连同 `oc_openclaw_direct_device_identity` 一起删除。

## 7.3 `http://127.0.0.1:19001/` 访问异常

先不要直接判定成“模型没配好”或“前端有问题”。

应先检查：

```bash
openclaw --dev gateway health
lsof -nP -iTCP:19001 -sTCP:LISTEN
```

如果 health 失败或没有监听，说明本质问题是 Gateway 没跑起来。

## 7.4 发送消息时报“没有 API key / provider 配置”

这通常不是前端问题，而是 OpenClaw Agent 侧没有完成模型配置。

例如你之前见到的类似报错：

```text
No API key found for provider "anthropic"
```

说明：

- Gateway 能启动
- 但实际执行消息时，Agent 无法找到对应 Provider 的可用认证

应通过 OpenClaw 自身的模型或 auth 配置解决，而不是改前端。

## 7.5 前端能打开，但发送消息一直 loading

排查顺序建议为：

1. 浏览器 Console 是否有直连报错
2. Gateway 日志是否有握手失败、连接关闭、权限或模型错误
3. 当前会话是否已进入异常中断状态
4. 切回 mock 后是否恢复正常

如果怀疑是本地直连链路本身卡住，可先切回：

```env
VITE_CHAT_RUNTIME=mock-openclaw
```

确保 UI 开发不被阻塞。

## 8. 推荐的日常调试流程

如果今天要调真实 OpenClaw，建议按这个顺序执行：

1. 启动或确认 Gateway 已运行
2. 执行 `openclaw --dev gateway health`
3. 将 `.env.local` 切到 `openclaw-direct`
4. 启动 `agent-chat`
5. 在浏览器里用 `localhost` 访问前端
6. 打开发送消息、会话切换、执行状态入口进行验证
7. 若遇到阻塞，先切回 `mock-openclaw` 保持开发连续性

补充建议：

- direct 模式下左侧会话列表默认只展示当前前端创建的 `agent:main:dashboard:*` 会话
- 如果你通过路由直达某个非 dashboard session，页面仍会尝试读取该会话历史，但不会把它长期混入主列表

## 9. 如何切回本地 mock

如果你今天不联调真实 Gateway，只需要把 `.env.local` 改回：

```env
VITE_CHAT_RUNTIME=mock-openclaw
```

然后重启前端 dev server。

说明：

- mock 仍然是当前仓库的默认稳定兜底方案
- 后续即使引入本地真实 Star-Office-UI 或公司网关，mock 也不应被删除

## 10. 与像素风办公室的关系

当前建议理解为三层：

1. `mock-openclaw`
   - 前端使用本地 mock Gateway
   - 像素风办公室也可继续使用本地 mock / 本地 sidecar 预览
2. `openclaw-direct`
   - 前端 chat 直连本机真实 OpenClaw
   - 像素风办公室当前可继续由本地 Star-Office mock 承接真实 runtime
   - 若开启 `VITE_STAR_OFFICE_REAL_DEV_ENABLED=true`，则可切换到本地真实像素办公室资源联调
3. 公司网关
   - 浏览器不再直连真实 Gateway
   - 统一走企业 BFF / proxy / trusted-proxy 方案

这也是为什么本手册只覆盖“本地操作”，不覆盖最终生产部署。

## 11. 推荐给后续 Agent 的执行规则

当后续 Agent 需要帮助你“启动本地 OpenClaw 联调”时，建议默认遵循以下步骤：

1. 先读本文档
2. 先确认 `.env.local` 当前 runtime 是 `mock-openclaw` 还是 `openclaw-direct`
3. 先检查 `openclaw --dev gateway health`，再判断前端问题
4. 若 Gateway 未运行，优先建议使用 `gateway start` 或 `gateway run`
5. 若模型配置有误，应明确告知是 OpenClaw 侧问题，不把锅甩给前端
6. 若联调被阻塞，应优先帮助用户切回 `mock-openclaw`

## 12. 快速命令清单

```bash
# 一键直连本地 OpenClaw（推荐）
npm run dev:openclaw-direct

# 一键直连并指定前端端口
npm run dev:openclaw-direct -- --port 3011

# 查看版本
openclaw --version

# 前台运行 dev Gateway
openclaw --dev gateway run --auth none --allow-unconfigured --force

# 安装 dev 服务
openclaw --dev gateway install

# 启动 / 停止 / 重启 dev 服务
openclaw --dev gateway start
openclaw --dev gateway stop
openclaw --dev gateway restart

# 查看状态与健康检查
openclaw --dev gateway status
openclaw --dev gateway health

# 查看端口监听
lsof -nP -iTCP:19001 -sTCP:LISTEN

# 查看日志
tail -f /tmp/openclaw/openclaw-$(date +%F).log
```

## 13. 相关文档

- [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)
- [阶段七-本地直连OpenClaw开发联调方案.md](./阶段七-本地直连OpenClaw开发联调方案.md)
- [07-阶段七-Mock转真实接口.md](./07-阶段七-Mock转真实接口.md)
