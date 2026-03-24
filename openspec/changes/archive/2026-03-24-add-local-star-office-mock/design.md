# 设计文档：Star-Office-UI 本地 Mock 方案

> 对应 Change: `add-local-star-office-mock`

## 1. 设计目标

本设计需要同时满足四件事：

1. 在 `npm run dev` 下无需额外启动外部服务即可看到执行状态 iframe
2. 本地页面展示结果必须与当前 `sessionId` 绑定
3. 保留未来真实部署时的系统拓扑，不做一次性临时拼接方案
4. 不改变阶段六已经确认的产品语义，即“查看执行状态”而非“查看工作流”

## 2. 当前问题复盘

当前前端可视化面板的行为是：

- 读取 `VITE_STAR_OFFICE_URL`
- 若为空，则显示“未配置 Star-Office-UI 地址”
- 若非空，则直接把该地址作为 iframe `src`

因此在开发模式下，出现以下情况：

### 2.1 未配置地址

- 面板只能显示提示文案
- 无法验证 iframe 承接、布局、尺寸、交互

### 2.2 配置了地址但本地没有服务

- iframe 访问失败或空白
- 无法验证会话上下文是否正确透传

### 2.3 即便有页面，也没有会话级状态来源

- 当前 `Mock WebSocket` 只驱动主应用消息列表
- 没有任何一层把 `sessionId` 对应的运行态转成 Star-Office 风格状态接口

这说明问题不是单纯“少一个页面”，而是缺了两层：

- 可被 iframe 访问的本地 mock 页面
- 向该页面供状态的本地 mock adapter

## 3. 设计原则

### 3.1 单进程优先

优先使用现有 Vite dev server 承载本地 mock 页面和 mock adapter，避免：

- 再起一个本地 Node 服务
- 再加一个 Docker / Python 启动步骤
- 用户需要维护多终端、多端口

### 3.2 同域优先

本地 mock 页面与主应用必须保持同域，以便最大程度贴近未来同域 iframe 部署模型。

推荐开发地址形式：

- 主应用：`http://localhost:3000/`
- 本地 mock 页面：`http://localhost:3000/__mock/star-office/app?...`
- 本地 mock adapter：`http://localhost:3000/__mock/star-office/status?...`

### 3.3 会话隔离优先

所有 mock 状态必须以 `sessionId` 为主键，而不是共享单一全局状态。

原则：

- 点开哪个会话，就只看哪个会话
- 多个会话即便同时活跃，也不得互相覆盖
- 同一时间允许 adapter 持有多个会话的状态快照

### 3.4 契约贴近真实系统

本地 mock adapter 输出的接口形状要尽量贴近 Star-Office-UI 的现有契约：

- `/status`
- `/agents`

而不是自定义一套与真实系统完全无关的数据模型。

## 4. 目标架构

```text
Chat Page
  ├─ Mock WebSocket / 前端运行态
  ├─ 会话运行态桥接器
  └─ Visualize 面板
       └─ iframe -> /__mock/star-office/app?sessionId=xxx

Vite Dev Server
  ├─ /__mock/star-office/app
  ├─ /__mock/star-office/status
  ├─ /__mock/star-office/agents
  └─ /__mock/star-office/adapter/push
```

数据流：

1. 用户在某个会话内发送消息
2. `Mock WebSocket` 驱动本会话消息流转
3. 前端桥接器把运行态映射成执行状态并推送给 mock adapter
4. iframe 页面按 `sessionId` 轮询状态
5. 页面根据状态渲染本地 mock 版执行状态视图

## 5. 配置设计

建议新增以下环境变量：

```env
VITE_STAR_OFFICE_MOCK_ENABLED=true
VITE_STAR_OFFICE_MOCK_BASE=/__mock/star-office
```

同时保留已有：

```env
VITE_MOCK_ENABLED=true
VITE_STAR_OFFICE_URL=
```

### 5.1 推荐判断顺序

执行状态面板的 iframe 地址选择建议遵循如下优先级：

1. 若 `VITE_STAR_OFFICE_URL` 明确配置，优先使用真实或代理后的地址
2. 若未配置且 `VITE_MOCK_ENABLED=true` 且 `VITE_STAR_OFFICE_MOCK_ENABLED=true`，使用本地 mock 地址
3. 否则显示“未配置 Star-Office-UI 地址”

这样可以满足三种场景：

- 本地纯 mock 开发
- 本地直连真实/代理服务联调
- 未配置时明确降级提示

## 6. 路由与接口设计

### 6.1 iframe 页面

```http
GET /__mock/star-office/app?sessionId=<id>
```

职责：

- 读取 URL 中的 `sessionId`
- 轮询本地 mock adapter
- 渲染执行状态页面
- 明确显示“当前会话 ID”

要求：

- 如果缺少 `sessionId`，显示错误提示，而不是展示全局默认状态
- 如果该会话当前没有状态，也要展示“等待会话执行状态”

### 6.2 主状态接口

```http
GET /__mock/star-office/status?sessionId=<id>
```

返回建议：

```json
{
  "sessionId": "session_123",
  "state": "writing",
  "detail": "正在生成回复",
  "progress": 62,
  "updatedAt": 1742788800000
}
```

说明：

- 这里显式返回 `sessionId`，便于开发排查串会话问题
- `progress` 为可选模拟字段，用于页面做视觉反馈

### 6.3 多 Agent 状态接口

```http
GET /__mock/star-office/agents?sessionId=<id>
```

返回建议：

```json
{
  "sessionId": "session_123",
  "agents": [
    {
      "agentId": "main",
      "name": "OpenClaw",
      "state": "writing",
      "detail": "正在生成回复",
      "updatedAt": 1742788800000
    }
  ]
}
```

本地 mock 初期可以只返回一个主 Agent。

如果后续想模拟工具执行或子 Agent 协作，再扩展为多个 Agent。

### 6.4 状态推送接口

```http
POST /__mock/star-office/adapter/push
```

请求体建议：

```json
{
  "sessionId": "session_123",
  "state": "executing",
  "detail": "正在生成图表",
  "progress": 80,
  "messageId": "msg_456",
  "source": "frontend-mock"
}
```

职责：

- 接收主应用桥接过来的会话运行态
- 以 `sessionId` 为键写入内存态
- 更新 `updatedAt`

### 6.5 清理接口

```http
POST /__mock/star-office/reset
```

用途：

- 测试时清空所有 session 状态
- 避免开发中长期积累脏状态

## 7. 数据模型设计

建议在本地 mock adapter 内维护一张内存表：

```ts
type MockVisualizeState =
  | 'idle'
  | 'researching'
  | 'writing'
  | 'executing'
  | 'syncing'
  | 'error';

interface MockSessionState {
  sessionId: string;
  state: MockVisualizeState;
  detail: string;
  progress?: number;
  updatedAt: number;
  messageId?: string;
  source: 'frontend-mock';
}
```

存储结构建议：

```ts
const stateBySession = new Map<string, MockSessionState>();
```

这样能直接保证：

- 查询按会话隔离
- 切换会话不会丢掉原状态
- 后续实现 TTL 清理也简单

## 8. 前端桥接设计

### 8.1 桥接输入

当前前端已有两个状态来源：

- `Mock WebSocket` 的流式消息事件
- `useVisualizeStore` 中的每会话运行态

桥接层建议优先复用 `useVisualizeStore`，原因：

- 它已经是当前前端对“会话运行态”的统一表达
- 能减少重复订阅 WebSocket 事件的逻辑
- 能让未来真实适配层接入时保持同样的前端观察点

### 8.2 映射规则

前端桥接到 mock adapter 的规则建议如下：

| 前端运行态 | mock 执行状态 | detail 示例 |
|---|---|---|
| `researching` | `researching` | 正在分析用户请求 |
| `writing` | `writing` | 正在生成回复 |
| `executing` | `executing` | 正在执行命令或生成图表 |
| `idle` | `idle` | 当前会话空闲 |
| `error` | `error` | 当前会话执行失败 |

若当前运行态包含更细的 detail，则优先透传脱敏后的 detail。

### 8.3 推送时机

建议在以下时机触发 `adapter/push`：

1. 用户消息刚发出，进入 `researching`
2. 收到流式 chunk，进入 `writing`
3. 收到图表/卡片/文件等特殊回复，进入 `executing`
4. 流式完成，回到 `idle`
5. 出现错误，进入 `error`

### 8.4 节流策略

不要对每个字符 chunk 都推一次 HTTP。

建议：

- 状态值不变时，不重复推送
- `detail` 高频变化时做 300ms 左右节流
- `idle/error` 等终态立即推送

这样可以避免开发环境下无意义的高频请求刷屏。

## 9. mock 页面展示设计

### 9.1 页面定位

本地 mock 页面不是要复刻完整 Star-Office-UI，而是要承担三类验证：

- iframe 是否正常嵌入
- 当前会话是否绑定正确
- 状态流转是否符合预期

因此展示内容建议包含：

- 当前会话 ID
- 当前状态标签
- 当前 detail
- 简化版办公室 / 状态卡片 / 时间轴反馈
- 最近更新时间

### 9.2 推荐视觉结构

```text
┌──────────────────────────────────┐
│ Star-Office-UI Local Mock        │
│ 会话：session_123                │
│ 状态：writing                    │
│ 详情：正在生成回复               │
│ 更新时间：00:12:30               │
│                                  │
│ [主 Agent 状态卡]                │
│ [可选：访客 Agent 卡]            │
│ [可选：状态时间轴]               │
└──────────────────────────────────┘
```

### 9.3 错误与空态

需要明确区分三类状态：

1. 缺少 `sessionId`
   页面应直接报错，提示“缺少会话 ID”
2. 会话尚未产生状态
   页面应提示“等待该会话的执行状态”
3. adapter 不可用
   页面应提示“本地 mock adapter 未启动或不可访问”

## 10. 多会话语义设计

这是本次设计最关键的部分。

### 10.1 当前展示的是哪个会话

规则必须唯一且明确：

- 当前 iframe 展示的一定是“用户点开执行状态面板时所绑定的那个 `sessionId`”
- 不是最近活跃会话
- 不是全局第一个会话
- 不是所有会话汇总状态

### 10.2 多会话并发时如何处理

如果多个会话都在本地 mock 中活跃：

- mock adapter 应同时保存多个 `sessionId` 的状态
- 每个 iframe 页面只读取自己的 `sessionId`
- 如果用户切换面板绑定的 `sessionId`，则 iframe URL 也应随之切换

### 10.3 为什么不能用单全局状态

因为一旦使用全局状态：

- 会话 A 执行中时，会话 B 的面板也会看到 A 的状态
- 用户会误以为“多会话设计是假的”
- 后续切换到真实服务端适配层时，前端语义仍然错误

所以本地 mock 也必须从第一天就按会话建模。

## 11. 与真实服务端适配层的衔接

未来切换到真实服务端时，建议替换的只有两层：

1. iframe 地址从本地 mock 页面切换为真实 Star-Office-UI 地址
2. 状态来源从本地 mock adapter 切换为真实服务端适配层

不应变化的部分：

- `sessionId` 作为前端可视化上下文主键
- 执行状态面板的交互入口
- 当前会话绑定逻辑
- 面板开关与布局

## 12. 可选替代方案评估

### 12.1 方案 A：直接克隆并本地运行真实 Star-Office-UI

优点：

- 更接近真实系统

缺点：

- 需要额外启动服务
- 仍然缺本地适配层
- 对当前前端开发流不友好

结论：

- 不适合作为默认开发方案

### 12.2 方案 B：用 `localStorage` / `BroadcastChannel` 在 iframe 与主应用间直接通信

优点：

- 实现快

缺点：

- 破坏“服务端适配层”这一真实拓扑
- 容易演化为前端私有协议
- 未来切真实接口时返工大

结论：

- 不推荐

### 12.3 方案 C：在主应用内直接渲染一个假组件，不走 iframe

优点：

- 最快

缺点：

- 完全无法验证 iframe 承接
- 不能发现路径、沙箱、尺寸、页面隔离等问题

结论：

- 不满足本次目标

## 13. 推荐决策

推荐采用：

- `Vite dev server + 本地 mock adapter + 本地 iframe 页面 + sessionId 隔离状态`

这是当前成本、真实性、可维护性三者之间最平衡的方案。

## 14. 后续实施顺序

1. 加入 OpenSpec 变更文档并确认
2. 落地本地 mock 配置项与 URL 选择逻辑
3. 实现 dev-only mock adapter 路由
4. 实现 mock iframe 页面
5. 接入前端运行态桥接
6. 补测试与开发说明
