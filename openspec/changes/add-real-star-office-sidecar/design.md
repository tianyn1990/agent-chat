# 设计文档：真实 Star-Office-UI 侧车接入方案

> 对应 Change: `add-real-star-office-sidecar`

## 1. 设计结论

本次设计的结论非常明确：

1. 要看到真实 Star-Office-UI 的像素风办公室效果，就必须运行 **真实上游应用**
2. 真实上游应用应保持 **独立 sidecar 服务** 形态，而不是被重写成主前端组件
3. `agent-chat` 负责 **入口、会话上下文与 iframe 承接**
4. 服务端适配层负责 **`sessionId` 到状态接口** 的翻译
5. 本地开发建议通过 **受控 fork 或子仓库 + 启动脚本 + 同域代理** 的方式获得真实效果
6. 由于上游像素素材存在许可证限制，正式商用交付前必须完成 **法务确认或资产替换**

## 2. 上游项目特征

从当前已调研结果看，Star-Office-UI 具备以下特征：

- 后端：`Flask`
- 前端：静态 `HTML/CSS/JavaScript`
- 场景引擎：`Phaser`
- 核心接口：`/status`、`/agents`、`/set_state`、`/agent-push`
- 能力定位：执行状态看板，而不是 DAG / trace 可视化系统

这几个特征决定了工程策略：

- 它不是组件库
- 它更适合被当成独立服务运行
- 它的真实视觉效果和行为，依赖上游前端脚本、素材与 Phaser 动画运行时

## 3. 设计原则

### 3.1 保真优先

用户明确要求看到真实像素风办公室效果，因此方案必须优先保证：

- 运行真实上游前端
- 使用真实上游素材与动画逻辑
- 不再用抽象 mock 页面替代最终效果

### 3.2 解耦优先

主应用不应该吞掉整个上游工程。

应该保持以下边界：

- `agent-chat`：聊天 UI、会话上下文、可视化入口
- Star-Office-UI sidecar：像素办公室渲染
- 服务端适配层：把 OpenClaw / 业务会话状态翻译成 Star-Office 接口

### 3.3 可升级优先

上游版本未来可能变化，因此本地接入不能采用一锤子买卖式复制方案。

要能回答：

- 上游 commit 如何固定
- patch 如何维护
- 升级如何对比
- 回滚如何执行

### 3.4 许可证边界清晰

由于上游素材与代码的许可证边界不同，工程设计必须显式区分：

- 哪部分是依赖
- 哪部分是主项目自有代码
- 哪部分不能直接进入商业交付物

## 4. 目标架构

### 4.1 逻辑拓扑

```text
Browser
  └─ agent-chat
      ├─ 会话列表 / 消息列表
      ├─ 右侧执行状态面板
      └─ iframe -> /star-office/session/<sessionId>/

agent-chat / visualize adapter
  ├─ 维护 chatSessionId -> OpenClaw session 映射
  ├─ 提供 session 级执行状态查询
  ├─ 对 Star-Office 输出兼容接口
  └─ 负责多会话下的状态隔离

Star-Office-UI sidecar
  ├─ 承载真实上游前端
  ├─ 渲染像素办公室与角色动画
  └─ 读取兼容状态接口

OpenClaw / Gateway
  └─ 真实会话与执行事件来源
```

### 4.2 职责边界

`agent-chat` 前端负责：

- 入口按钮
- `sessionId` 选择
- iframe URL 生成
- 未配置时的降级提示

服务端适配层负责：

- 解析当前 `sessionId`
- 查找该会话对应的 OpenClaw session
- 将事件归并为 `idle / researching / writing / executing / syncing / error`
- 对外暴露 Star-Office 兼容接口

Star-Office-UI sidecar 负责：

- 真实视觉效果
- 轮询状态接口
- 渲染像素办公室

## 5. 为什么不能只靠 iframe

iframe 只是展示容器，不负责语义正确性。

即便已经做到同域：

- Star-Office-UI 仍然不知道 `sessionId`
- 它依然只会请求自己的状态接口
- 如果没有适配层，最终展示的仍然只是某个全局状态

因此，正确方案不是：

- “给 iframe 多传一点 postMessage”

而是：

- “让服务端把当前会话翻译成 Star-Office 可理解的状态接口”

## 6. 真实接入的三种工程方式

### 6.1 方案 A：sidecar + 受控 fork / 子仓库管理（推荐）

做法：

- 将上游项目以 **受控 fork** 或 **git submodule** 的方式纳入工作区
- 以独立服务启动真实 Star-Office-UI
- 通过反向代理把它挂到与 `agent-chat` 同域的路径或子域
- 在本项目中只维护少量 patch、启动脚本与适配层代码

优点：

- 真实效果完整
- 上游升级路径清晰
- 主项目职责清楚
- 本地开发与生产拓扑一致

缺点：

- 需要维护一个外部依赖仓库
- 需要额外的启动流程
- 如果要支持子路径部署，可能要维护少量上游 patch

### 6.2 方案 B：直接拷贝上游工程进主仓库（不推荐）

做法：

- 直接把上游前后端源码复制到本仓库某个目录

问题：

- 上游升级困难
- 许可证边界模糊
- 主仓库体积迅速膨胀
- 后续想替换素材或切 fork 会很痛苦

### 6.3 方案 C：重写成 React 组件（明确拒绝）

问题：

- 失去真实上游效果
- 工程投入过高
- 等于自己维护一套新产品
- 和“本地需要看到真实像素办公室”目标冲突

## 7. 仓库管理策略

### 7.1 推荐策略

推荐优先顺序：

1. **公司自有 fork**
2. **固定 commit 的 git submodule**
3. **git subtree**

不推荐：

- 直接散拷贝源码

### 7.2 为什么优先自有 fork

自有 fork 能解决两类问题：

- 可以托管我们自己的最小 patch，例如 base path 或 session facade 注入
- 可以锁定一个可回滚的组织内来源，而不是每次直接追公共仓库

### 7.3 为什么 submodule 优于散拷贝

如果暂时不建立自有 fork，`git submodule` 仍优于直接复制：

- commit 边界明确
- 许可证文件原样保留
- 升级与回滚都可以追溯

## 8. 本地开发方案

### 8.1 目标

在本地通过 `agent-chat + 真实 Star-Office-UI + 本地适配层` 看到真实像素办公室效果。

### 8.2 推荐本地拓扑

```text
agent-chat dev server          http://localhost:3000
Star-Office sidecar            http://localhost:19000
local visualize adapter        http://localhost:3000/api/visualize/*
dev reverse proxy              http://localhost:3000/star-office/*
```

推荐行为：

1. 本地单独启动真实 Star-Office sidecar
2. `agent-chat` 开发服务通过代理暴露 `/star-office/`
3. 前端配置 `VITE_STAR_OFFICE_URL=/star-office/`
4. iframe 仍走主域同源地址，保证交互形态与生产一致

### 8.3 为什么本地仍需要适配层

即便本地运行了真实 Star-Office 服务，也不能直接解决会话问题。

原因：

- Star-Office-UI 不理解聊天会话
- 本地真实效果只解决“视觉效果”
- 适配层仍然要负责“当前看的是哪个会话”

因此，本地完整链路应该是：

```text
Mock WebSocket / OpenClaw mock
  -> 本地 visualize adapter
  -> Star-Office sidecar 兼容接口
  -> 真实像素办公室
```

### 8.4 本地开发的两阶段策略

为了降低接入风险，建议本地开发保留两种模式：

- `mock-fallback`：当前已有本地 mock 页面，用于无 sidecar 场景的兜底验证
- `real-office-dev`：运行真实 Star-Office sidecar，获得真实像素效果

这样可以避免因为 sidecar 未启动就完全阻断日常前端开发。

## 9. 生产部署方案

### 9.1 部署结论

生产环境推荐：

- `agent-chat` 与 Star-Office-UI 使用 **相同主域名**
- 优先使用 **子域名** 或 **已验证可用的子路径**
- 前端只使用受控入口，不直接暴露内部端口

### 9.2 同域子路径 vs 子域名

#### 子路径

示例：

- `https://example.com/`
- `https://example.com/star-office/`

优点：

- 用户感知上更统一
- 前端配置更直接

缺点：

- 上游前端如果默认根路径请求，可能需要 patch base path

#### 子域名

示例：

- `https://chat.example.com/`
- `https://office.example.com/`

优点：

- 对上游原始应用侵入更小
- 适合作为独立 sidecar 服务发布

缺点：

- 需要额外处理嵌入安全策略、Cookie/鉴权边界和域名配置

### 9.3 当前推荐

如果实现阶段希望尽量少 patch 上游：

- 优先 **子域名**

如果业务明确要求“同域同路径体验”：

- 采用 **子路径 + 受控 patch**

## 10. 会话语义与多会话设计

### 10.1 必须回答的问题

当用户打开某个会话的执行状态面板时，系统必须能明确回答：

- 当前面板绑定的是哪个 `sessionId`
- 这个 `sessionId` 对应哪个 OpenClaw session
- 当前 Star-Office 页面读到的是哪个会话的状态

### 10.2 推荐策略：单面板单焦点会话

阶段六推荐先采用：

- 一个面板只绑定一个 `sessionId`
- 一个 iframe 只展示一个焦点会话

这比把多个会话都塞进一个办公室更稳。

### 10.3 为什么不建议阶段六直接做“多会话映射多 Agent”

虽然技术上可以把多个会话映射成多个访客 Agent，但阶段六不建议这么做：

- 它会把“会话”和“Agent”两个概念混在一起
- 容易让用户误解同一会话与多 Agent 协作的关系
- 状态清理和生命周期会明显更复杂

## 11. session facade 设计

### 11.1 关键问题

Star-Office-UI 原生只会访问自己的状态接口。

为了让它展示“某一个会话”的状态，需要增加一层 **session facade**。

### 11.2 facade 责任

facade 至少要解决三件事：

1. 根据 iframe 打开的 URL 解析当前 `sessionId`
2. 读取该会话的最新执行状态
3. 对真实 Star-Office 前端输出它能直接消费的接口

### 11.3 两种实现方式

#### 方式 A：在适配层前置一个代理壳

思路：

- 由适配层暴露 `/star-office/session/:sessionId/` 入口
- 这个入口代理真实上游静态资源
- 同时把 `/status`、`/agents` 重写成当前会话的兼容接口

优点：

- 会话语义清楚
- 前端 iframe URL 可直接带 `sessionId`

缺点：

- 需要少量代理与资源转发逻辑

#### 方式 B：对上游做最小 patch，支持 API base 注入

思路：

- 上游前端增加可配置的 API base
- iframe 打开 `/star-office/?sessionId=xxx`
- 上游前端从全局配置中读 session 级接口前缀

优点：

- 部署路径更直接

缺点：

- 需要维护上游 patch

### 11.4 当前推荐

对于本 change 的验收路径，当前统一收敛为：

- **方式 A：代理壳 / facade**
- **统一入口：`/star-office/session/:sessionId/`**

原因：

- 它不要求先维护上游 patch 就能定义稳定入口契约
- 它最容易验证“一个 iframe 只绑定一个会话”
- 它可以把 session 语义固定在适配层，而不是扩散到前端和上游源码

方式 B 仍然保留为后续优化备选，但不作为本 change 的默认验收路径。

结论：

- 本 change 的 session facade 必须以 **可按 `sessionId` 直接寻址** 的入口形态存在
- 若未来切换到方式 B，也必须对外继续保持等价的会话级入口语义

## 12. 许可证与合规约束

### 12.1 当前结论

根据已调研结果，需要把许可证风险单独列为实现前置条件：

- 上游代码逻辑可按较宽松方式复用
- 上游像素美术资源存在非商业使用限制

### 12.2 工程影响

因此不建议：

- 把这些素材直接打包进主应用前端产物
- 在没有授权确认前把它们作为默认商业交付内容

### 12.3 推荐控制策略

推荐按以下顺序处理：

1. 先把真实接入方案做成独立变更设计
2. 在实现前完成许可证核查
3. 如果当前项目存在商用风险，则二选一：
   - 获得上游明确授权
   - 替换为自有或可商用素材

## 13. 与现有本地 mock change 的关系

`add-local-star-office-mock` 依然有价值，但角色要重新定位：

- 它不是最终视觉方案
- 它是无 sidecar 场景的兜底测试夹具
- 它用于验证 iframe、会话隔离和前端回归

新的 `add-real-star-office-sidecar` change 才负责：

- 真实像素效果
- 真实上游运行
- 本地与生产一致的 sidecar 集成路线

## 14. 推荐实施顺序

1. 冻结上游来源策略：
   - 决定使用公司 fork 还是 submodule
2. 完成许可证评估：
   - 确认当前交付场景是否允许使用上游素材
3. 打通本地真实 sidecar：
   - 能在本地看到真实像素办公室效果
4. 增加 session facade：
   - 保证一个 iframe 对应一个会话
5. 接入真实状态适配层：
   - 从 OpenClaw 或 mock gateway 输出状态
6. 完成生产代理方案：
   - 子域名或子路径二选一

## 15. 验收判断

达到以下条件，才可以说“真实 Star-Office-UI 已可接入”：

- 本地能通过真实上游服务看到像素办公室效果
- 面板与 `sessionId` 存在稳定绑定关系
- 没有把真实视觉效果建立在 React 重写或假 mock 页面之上
- 同域 iframe 路线已经明确
- 许可证处理路径已经落文档，不再口头约定

## 16. 相关文档

- [../../../docs/阶段六-真实Star-Office-UI侧车接入方案.md](../../../docs/阶段六-真实Star-Office-UI侧车接入方案.md)
- [../../../docs/阶段六-服务端适配层设计.md](../../../docs/阶段六-服务端适配层设计.md)
- [../../../docs/Star-Office-UI-部署指南.md](../../../docs/Star-Office-UI-部署指南.md)
- [../add-local-star-office-mock/design.md](../add-local-star-office-mock/design.md)
