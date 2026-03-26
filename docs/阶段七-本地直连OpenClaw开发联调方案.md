# 阶段七：本地直连 OpenClaw 开发联调方案

> 最后更新：2026-03-27
>
> 本文档用于说明 `agent-chat` 在第二阶段如何从“OpenClaw-compatible 本地 mock”继续演进到“浏览器直连本机真实 OpenClaw Gateway”的开发联调方案。本文是阶段七总方案的下钻文档，不替代 OpenSpec change。

## 快速入口

如果当前目标不是讨论方案，而是直接启动、切换、排查本地联调，请优先阅读：

- [本地OpenClaw联调操作手册.md](./本地OpenClaw联调操作手册.md)

额外提醒：

- 当前仓库已经新增 `openclaw-proxy` 本地 company-gateway 模式
- `openclaw-direct` 仍然保留，但现在更适合做底层协议诊断
- 如果你的目标是验证真实会话重命名、删除和更贴近正式环境的链路，应优先切换到 `openclaw-proxy`

## 当前稳定化变更

在 `add-openclaw-direct-dev-runtime` 之后，当前仓库又新增了一轮稳定化收敛，用于解决真实联调中暴露出的协议与会话边界问题：

- 对应 OpenSpec change：
  - `stabilize-openclaw-direct-runtime-and-session-boundaries`
- 重点解决：
  - `device signature invalid / expired` 的受控恢复
  - direct 模式默认只展示 dashboard 命名空间会话
  - 新建会话优先请求 Gateway 创建权威 session
  - direct runtime 到本地 Star-Office 承接层的 bridge 补齐
  - “发送后、首个 delta 前”的 pending 视觉承接

应把这轮收敛理解为本地直连阶段的稳定化补丁层，而不是新的分叉方案。

## 1. 文档定位

这份文档只回答一件事：

> 在开发者本机已经启动真实 OpenClaw 的前提下，`agent-chat` 应如何以最小风险接入真实 Gateway，并继续保持现有聊天 UI 与像素风办公室能力。

它不回答：

- 公司正式环境如何接入 OpenClaw
- trusted proxy / BFF 如何设计
- 最终组织级鉴权、审计和权限模型如何落地

这些内容属于后续“公司网关”阶段。

## 2. 为什么要单独拆出本地直连阶段

第一阶段虽然已经完成了本地 mock 协议抽象，但它本质上仍然是：

- 可控的假数据源
- 可预测的假 session
- 可推断的假 `agent` 事件

它无法真正验证以下问题：

1. 真实 Gateway 握手是否能在浏览器里打通
2. 真实 `sessionKey / sessionId` 是否与当前多会话体验兼容
3. 真实 `chat / agent / health` 事件是否能无损驱动当前 UI
4. 像素风办公室是否能摆脱前端 fallback，真正由真实事件驱动

因此，第二阶段不能被省略。

## 3. 结论先行

### 3.1 推荐结论

推荐采用：

> **显式 `openclaw-direct` 运行时 + 浏览器仅在 localhost 直连本机真实 Gateway + 保留 mock 兜底**

在仓库实际操作层，优先落地为：

```bash
npm run dev:openclaw-direct
```

也就是说：

- 配置切换由脚本通过子进程 env 覆盖完成
- Gateway 生命周期由脚本统一托管
- 退出脚本时自动停止本次本地直连环境

这是当前风险最低、收益最高的路线。

### 3.2 不推荐的做法

不推荐：

- 继续用 `VITE_MOCK_ENABLED=true/false` 一个布尔值强行区分全部运行模式
- 为了“方便”而在第二阶段就引入本地 BFF，掩盖真实 Gateway 接入问题
- 把“本地直连”误当成未来生产部署方案
- 在尚未验证真实 session 语义前，就直接复用现有“新建对话”全部交互

## 4. 推荐目标

本阶段完成后，开发者应能做到：

1. 在本机启动真实 OpenClaw Gateway
2. 将 `agent-chat` 切换到 `openclaw-direct` 模式
3. 读取真实会话列表与历史消息
4. 发送真实消息并接收真实流式事件
5. 让当前像素风办公室继续消费真实执行状态
6. 在失败时看到明确诊断，而不是陷入“像是连上了其实没连上”的假状态
7. 会话列表默认只展示当前 dashboard 命名空间，避免混入 CLI / 控制台历史会话
8. direct 模式下工作台仍可由本地 Star-Office mock 或 real-dev 页面承接

## 5. 运行模式设计

## 5.1 为什么必须显式引入 runtime

当前项目至少已经存在三种不同语义：

- `mock-openclaw`
- `openclaw-direct`
- `openclaw-proxy`（未来）

如果仍然只依赖 `VITE_MOCK_ENABLED`：

- 无法表达当前究竟在走 mock 还是 direct
- 也无法为后续公司网关继续扩展

因此建议引入显式 runtime，例如：

```env
VITE_CHAT_RUNTIME=mock-openclaw
```

后续可切换为：

```env
VITE_CHAT_RUNTIME=openclaw-direct
VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
```

## 5.2 推荐运行时列表

- `mock-openclaw`
  - 默认开发模式
  - 无需真实 Gateway
  - 自动化测试和日常开发兜底
- `openclaw-direct`
  - 第二阶段本地联调
  - 浏览器直连本机真实 Gateway
- `openclaw-proxy`
  - 第三阶段公司网关 / BFF
  - 当前不实现

### 5.3 当前仓库已落地的配置

当前实现已经落地以下环境变量：

```env
# 运行时选择：mock-openclaw | openclaw-direct | legacy-websocket
VITE_CHAT_RUNTIME=mock-openclaw

# direct 模式配置
VITE_OPENCLAW_GATEWAY_URL=ws://127.0.0.1:19001
VITE_OPENCLAW_GATEWAY_TOKEN=
VITE_OPENCLAW_GATEWAY_PASSWORD=
VITE_OPENCLAW_GATEWAY_DEVICE_TOKEN=
VITE_OPENCLAW_GATEWAY_ROLE=operator
VITE_OPENCLAW_GATEWAY_SCOPES=operator.read,operator.write
VITE_OPENCLAW_CLIENT_INSTANCE_ID=
```

若使用一键命令：

```bash
npm run dev:openclaw-direct
```

脚本会额外处理以下行为：

- 自动切到 `VITE_CHAT_RUNTIME=openclaw-direct`
- 默认注入 `VITE_STAR_OFFICE_MOCK_ENABLED=true`
- 若你显式开启 `VITE_STAR_OFFICE_REAL_DEV_ENABLED=true`，则不强行覆盖真实工作台联调开关

说明：

- 当未显式设置 `VITE_CHAT_RUNTIME` 时，仓库仍兼容旧版 `VITE_MOCK_ENABLED`
- `openclaw-direct` 当前只允许页面 origin 与 Gateway 都位于 `localhost / 127.0.0.1`
- `legacy-websocket` 仍保留为兼容链路，但不再是第二阶段的主实现目标

## 6. 为什么第二阶段不先做本地代理

表面上看，本地开发可以走：

```text
Browser -> Vite Dev Proxy -> OpenClaw Gateway
```

但这会掩盖几个关键问题：

- 浏览器真实握手是否可行
- device identity / pairing 流程是否被正确处理
- 连接来源约束是否满足
- 当前页面与真实 Gateway 的能力边界到底在哪里

第二阶段的目标就是验证这些问题，因此不应先把它们藏到代理层后面。

## 7. localhost 边界为什么必须强调

本地直连不是“任何开发环境都能用”的能力。  
根据 OpenClaw 官方 Web / Gateway 文档，浏览器接入会涉及：

- secure context
- device identity
- pairing / approval
- origin / network 边界

所以本阶段明确建议只支持：

- `http://localhost:*`
- `http://127.0.0.1:*`

不把以下场景列入本阶段支持范围：

- `http://192.168.x.x:*`
- 远程开发机映射地址
- 非本机测试域名

如果未来确实要支持这些场景，应在第三阶段公司网关里处理。

## 8. 协议与适配层怎么演进

### 8.1 保持现有分层

建议继续使用当前已经建立好的分层：

```text
Wire Protocol Layer
  -> Domain Adapter Layer
  -> UI / Store / Visualize Runtime
```

这样做的原因：

- 页面层不必重新理解真实 Gateway 帧
- mock / direct / proxy 三种模式可复用同一 UI
- 第三阶段不会推翻第二阶段成果

### 8.2 direct transport 应做什么

`DirectOpenClawTransport` 负责：

- 建立真实 WebSocket
- 处理握手
- 管理请求与响应
- 分发真实事件
- 报告连接状态与错误上下文

### 8.3 adapter 应继续做什么

adapter 继续负责：

- 会话列表翻译
- 历史消息翻译
- 流式回复翻译
- 结构化消息翻译
- 执行状态 runtime 翻译

也就是说：

- transport 面向协议
- adapter 面向 UI

## 9. 多会话与“新建对话”的真实问题

这是本阶段最容易被低估的点。

当前产品的前端语义是：

- 用户可以看到多个对话
- 用户可以创建新的空白对话
- 当前路由用 `sessionId` 区分不同对话

但真实 OpenClaw 的 session 模型是：

- Gateway 维护 `sessionKey`
- 每个 `sessionKey` 下可能映射到当前有效 `sessionId`
- 某些“重置 / 新轮次”操作并不等于前端语义上的“新建一个独立对话”

因此第二阶段必须验证：

1. direct 模式下，前端路由是否直接承载真实 `sessionKey`
2. Gateway 是否接受应用分配的新 `sessionKey`
3. 如果不接受，当前“新建空白对话”是否需要阶段性收敛

### 9.1 我推荐的策略

先做：

- 读取真实会话
- 展示真实历史
- 发送真实消息
- 默认只展示 `agent:main:dashboard:*` 会话
- 新建时优先调用 `sessions.create`，让 Gateway 生成或确认权威 session

再决定：

- “新建对话”是否继续完整保留

这样能避免在未验证真实 session 语义前就把错误假设写进产品逻辑。

### 9.2 当前实现采用的会话承载策略

当前仓库已进一步收敛为以下策略：

- 路由参数 `sessionId` 在 `openclaw-direct` 模式下直接承载真实 `sessionKey`
- `sessions.list` 返回后，默认只展示 `agent:main:dashboard:*` 会话
- 路由直达的非 dashboard session 仍允许按需读取历史，避免破坏调试兼容性
- “新建对话”优先调用 `sessions.create`
- 若当前 Gateway 暂未返回可用 entry / key，则回退到本地 dashboard key 兜底

这样做的原因是：

- 多会话产品界面需要明确边界，不能把其他入口产生的历史 session 混入主列表
- 浏览器直连阶段仍要逐步向真实 Gateway 的权威 session 语义靠拢
- 即便老版本 Gateway 缺少某些返回字段，也不能阻断当前前端的新建会话体验

## 10. 与像素风办公室的关系

本阶段不改变当前工作台交互形态。  
重点不是重新设计工作台，而是把它的数据来源从“mock 或前端 fallback”切到“真实 Gateway 事件”。

目标是：

- 用户仍然从当前会话进入工作台
- 工作台仍然显示该会话的执行状态
- runtime 的来源从 mock event 变成真实 `chat / agent` event
- direct 模式下若未配置真实 `STAR_OFFICE_URL`，工作台仍可通过本地 Star-Office mock / real-dev 页面承接 runtime

如果第二阶段做完后，工作台仍主要依赖前端猜测状态，那么这一步就没有真正完成。

## 11. 推荐实施顺序

### 11.1 第一步：直连可用

先验证：

- 握手成功
- `sessions.list` 可读
- `chat.history` 可读
- `chat.send` 可发

### 11.2 第二步：adapter 接上真实数据

确保：

- 页面层继续只消费 adapter 输出
- store 不直接理解真实 Gateway 帧

### 11.3 第三步：工作台 runtime 接上真实事件

确保：

- 真实 `agent / chat` 事件能更新 `SessionVisualizeRuntime`
- 工作台期间不会因为路由切换而断掉 runtime 消费

### 11.4 第四步：验证新建对话策略

这是一个单独的产品与协议验证点，不应混入第一步。

## 12. 失败场景应该怎么处理

本阶段应至少明确处理：

- Gateway URL 缺失
- 当前 origin 非 localhost / 127.0.0.1
- 握手失败
- pairing / device identity 失败
- 方法不存在
- 请求超时
- 真实会话读取失败

出现这些问题时，系统不应：

- 静默切回 mock
- 继续显示“已连接”
- 让用户误以为 direct 模式可用

## 13. 推荐交付物

建议本阶段最终交付：

- `add-openclaw-direct-dev-runtime` OpenSpec change
- 本地直连专用环境变量与说明
- `DirectOpenClawTransport`
- direct runtime adapter 接入
- direct 模式异常诊断
- 工作台真实事件联动
- 对应单元测试与联调清单

## 14. 与后续阶段的关系

本地直连阶段完成后，第三阶段公司网关应继续沿用：

- 同一套协议模型层
- 同一套 adapter
- 同一套页面领域模型

只替换：

- transport
- 认证与安全边界
- 连接入口

这才是“分阶段演进”的正确方式。

## 15. 参考资料

- [阶段七-OpenClaw协议接入总体方案.md](./阶段七-OpenClaw协议接入总体方案.md)
- OpenClaw Gateway Protocol: https://docs.openclaw.ai/gateway/protocol
- OpenClaw Session Concepts: https://docs.openclaw.ai/concepts/session
- OpenClaw WebChat: https://docs.openclaw.ai/web/webchat
- OpenClaw Control UI: https://docs.openclaw.ai/web/control-ui
- OpenClaw Trusted Proxy Auth: https://docs.openclaw.ai/gateway/trusted-proxy-auth
