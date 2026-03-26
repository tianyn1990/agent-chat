# 设计文档：本地直连 OpenClaw 稳定化与会话边界收敛

> 对应 Change: `stabilize-openclaw-direct-runtime-and-session-boundaries`

## 1. Context

当前仓库已经进入“本地 mock 已完成、本地 direct 已打通基础闭环”的阶段，现状可以概括为：

- UI 层已经通过统一 `ChatAdapter` 消费会话、消息与执行状态
- `ChatRuntimeHost` 已经常驻宿主层，避免工作台路由切换时中断 runtime 事件消费
- 沉浸式工作台与会话级执行状态入口已经稳定存在
- `npm run dev:openclaw-direct` 可以一键启动本机 Gateway + Vite 开发环境

但真实联调已证明，“能发消息”不等于“可以稳定开发”。目前最突出的痛点不是功能缺失，而是边界不清：

1. **握手边界不清**
   - 当前 direct transport 可以通过一次握手建立连接
   - 但刷新后缓存 `device token` 参与连接时，签名 payload 仍可能沿用旧逻辑，导致 `device signature invalid`

2. **会话边界不清**
   - Gateway 返回的是“当前 agent 的真实 session 集合”
   - 当前前端又存在“本产品 dashboard 会话”的产品边界
   - 如果不把两者区分清楚，左侧列表会持续混入其他来源的历史会话

3. **工作台数据边界不清**
   - direct runtime 已经可以产出真实 runtime
   - 但本地 Star-Office 承接层仍然主要按 mock 条件启用桥接
   - 结果是 direct 模式下聊天能工作，工作台却像断电

4. **发送态交互边界不清**
   - 当前“正在处理”几乎等同于“已经收到首个 streaming delta”
   - 在真实 OpenClaw 返回首个 delta 之前，用户会经历明显空窗

因此，这次 change 的目标不是扩展功能面，而是将这些边界收拢到可以稳定开发、稳定验证、稳定演进的状态。

## 2. Goals / Non-Goals

### 2.1 Goals

- 让 `openclaw-direct` 在刷新、重连、缓存 device token 的情况下更稳定
- 明确本前端在 direct 模式下只接管 dashboard 会话，而不是全部 agent 历史
- 让工作台在 direct 模式下真正消费到当前会话的执行状态
- 为发送流程补一个更自然的 pending 视觉承接
- 让消息级复制操作回到次级动作层级
- 保持当前“会话级执行状态入口 + 微型像素显示器”的视觉语义

### 2.2 Non-Goals

- 不修改 `openclaw-direct` 只允许 localhost / 127.0.0.1 的安全边界
- 不在本 change 中把 direct 模式扩展成生产接入模式
- 不在本 change 中重写沉浸式工作台布局
- 不在本 change 中完成真实 sidecar 接口适配层
- 不在本 change 中引入更强的历史会话管理后台或多 agent 总览

## 3. Decisions

### 3.1 握手签名必须与真实 `auth` 选择逻辑完全一致

#### Decision

`DirectOpenClawTransport` 构建 device signature 时，必须使用与实际 `connect.params.auth` 一致的 signature token 选择顺序：

1. `auth.token`
2. `auth.deviceToken`
3. `auth.bootstrapToken`
4. 无 token

并且不能再只按“共享 token 是否存在”来决定签名 payload。

#### Why

OpenClaw 当前 Gateway 校验的是“设备签名所覆盖的 token 语义”与“这次握手真实提交的 auth 信息”是否一致。  
如果浏览器在刷新后开始使用缓存的 `deviceToken`，而签名仍沿用“无 token”或“只看 shared token”的逻辑，就会出现：

- 首次连接成功
- 刷新后偶发失败
- 日志报 `device signature invalid`

这类问题不会通过 UI 层规避，必须在 transport 层一次修正。

### 3.2 `device signature invalid` 应有受控恢复路径

#### Decision

当 direct 握手失败且错误明确指向：

- `device signature invalid`
- `device signature expired`

系统应执行一次受控恢复：

1. 丢弃当前 role 对应的浏览器缓存 `device token`
2. 保留稳定 `device identity`
3. 重新完成一次握手

只允许自动重试一次，避免死循环。

#### Why

这类失败通常说明“缓存 token 与当前签名上下文不匹配”，并不一定意味着浏览器 identity 已损坏。  
直接删掉整个 identity 会增加无意义的重新配对成本；完全不恢复又会让本地联调频繁中断。

### 3.3 direct 模式下要区分“Gateway 全量会话”和“dashboard 会话”

#### Decision

当前前端在 direct 模式下，默认只展示当前 dashboard 命名空间内的会话，例如：

- `agent:<agentId>:dashboard:<uuid>`

其它历史会话：

- 不默认进入左侧列表
- 但若用户通过明确路由或外部入口打开某个 `sessionKey`，仍允许读取

#### Why

OpenClaw 的 `sessions.list` 返回的是当前 agent 的真实 session 集合。  
这对调试是事实层正确的，但对当前产品 UI 来说过宽，会导致：

- 后台 control-ui 用过的会话混进当前产品
- 旧调试残留污染当前用户的会话列表
- 用户误以为这些会话都属于本页面正常创建结果

所以 direct 阶段必须引入产品边界，而不是把 Gateway 全量事实原样灌给用户。

### 3.4 direct 新建会话应优先请求 Gateway 产生权威 session

#### Decision

`createSession()` 在 direct 模式下应优先走真实 `sessions.create` 或等价权威创建路径，而不是继续完全由前端虚构 `sessionKey`。

如果 Gateway 未返回可用 key，再回退到受控本地生成策略，但要显式记录这是 fallback。

#### Why

后续无论是本地真实联调还是公司网关阶段，权威 session 都应来自服务端。  
如果在 direct 阶段继续用前端自说自话的 `sessionKey`，会把问题推迟到后面更难收拾的时候。

### 3.5 工作台 bridge 的启用条件应与“Star-Office 承载模式”绑定，而不是与“chat 是否 mock”绑定

#### Decision

本地 Star-Office bridge 的启用条件应基于：

- 当前是否启用了本地 Star-Office mock
- 或是否启用了本地真实 Star-Office dev 承载

而不是绑定 `IS_MOCK_ENABLED`。

#### Why

当前 direct 模式最典型的问题就是：

- 聊天 runtime 已经是真实的
- 但工作台 bridge 因为写死在 mock 条件下，根本没有继续工作

这会造成“聊天正常、工作台没状态”的假割裂。

### 3.6 发送态要拆成 `pending-before-first-delta` 与 `streaming`

#### Decision

当前发送中视觉要拆成两段：

1. `pending`
   - 从用户点击发送成功，到收到首个 assistant delta 之前
2. `streaming`
   - 已收到 assistant delta，进入真实打字/流式阶段

在 `pending` 阶段，消息区尾部应显示一个轻量 assistant 占位行。

#### Why

真实 OpenClaw 的首个 delta 不一定立即返回。  
如果把“发送中”完全绑定到 streaming，就会留下明显的交互空窗，用户会误判成“没发出去”或“卡住了”。

### 3.7 会话级执行状态入口继续采用“微型像素显示器”

#### Decision

会话头部执行状态入口继续保留“微型像素显示器”作为唯一核心图标语义，不改用龙虾或其他高识别但偏主题化的图形。

#### Why

- 显示器图标与“工作台 / 执行状态 / 恢复控制台”语义更直接
- 既能保留 Star-Office 的像素风记忆点，又不会把主工作台做成游戏化入口
- 用户已经明确更偏好这一语义

## 4. Runtime Changes

### 4.1 握手稳定化

主要变更：

- 修正 signature token 选择顺序
- 增加握手失败 reason 解析
- 增加一次性 token 恢复重试

关键原则：

- 优先修 transport，不在 UI 层做“猜测性回退”
- 错误必须可诊断，不能只给泛化 toast

### 4.2 会话列表收敛

主要变更：

- direct `listSessions()` 后增加 dashboard 过滤层
- `upsertSessions()` 不再无条件保留所有旧 direct 历史
- 路由直达的非 dashboard session 仍允许读取，但不默认展示

### 4.3 工作台联动补齐

主要变更：

- `ChatRuntimeHost` 中的 runtime -> Star-Office bridge 从 mock 条件解绑
- `dev:openclaw-direct` 默认同时开启本地 Star-Office mock 承接
- direct runtime 发出的 `runtime.changed` 继续驱动现有 visualize store

### 4.4 发送态与操作区微调

主要变更：

- 新增 pending 占位行
- `TypingIndicator` 不再只是“已经 streaming 才出现”
- 复制按钮改为 icon-only 的次级动作

## 5. Risks / Trade-offs

### 5.1 dashboard 过滤可能让“旧真实会话看不见”

权衡：

- 这是有意为之的产品收敛，不是数据丢失
- 需要在文档中明确：事实层存在，默认产品视图不展示

### 5.2 自动恢复不能过度激进

权衡：

- 自动恢复只允许一次
- 超过一次必须向用户暴露明确诊断
- 否则会把真正的 auth 漂移问题掩盖掉

### 5.3 pending 占位不能引入新的滚动抖动

权衡：

- pending 行要使用稳定高度
- 从 pending 切到 streaming 时应尽量复用消息占位，避免再次推挤滚动

## 6. Acceptance

满足以下条件后，本 change 可视为达到目标：

- 刷新页面后，direct 模式能稳定恢复握手
- 左侧不会再混入 control-ui 或其他旧来源会话
- 发送后立即可见 pending 状态，而不是等待首个 delta
- direct 模式下工作台可以看到当前会话的执行状态
- 会话头部入口仍保持“微型像素显示器”语义，且不引入新的视觉噪音
