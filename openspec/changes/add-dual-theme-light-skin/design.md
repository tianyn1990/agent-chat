# 设计文档：双主题系统与 Light Skin 引入

## Context

当前系统的 UI 已围绕 `Paper Ops / Graphite Console` 深色工作台建立了一套较稳定的视觉语言，但这套语言主要依赖于：

- `variables.less` 中的一组 deep graphite token
- `global.less` 中大量默认 dark 样式覆写
- `antdTheme.ts` 中单一的 Ant Design dark token 映射
- 若干模块样式中直接写死的 rgba、gradient 和 dark 容器值

这意味着：

1. 项目目前本质上是“单主题系统”
2. 主题值同时散落在 CSS、LESS、TS 和局部模块中
3. 页面越多，后续维护越容易出现主题不一致

本次目标是引入双主题，但用户已明确提出两个约束：

- 不要重新设计当前 dark 主题
- 新增的 light 皮肤必须是完整的、可维护的、全局一致的，而不是“浅色补丁”

因此，本次需要先解决“主题架构”，再解决“视觉设计”。

## Goals / Non-Goals

### Goals

- 建立运行时双主题能力，支持 dark / light 切换
- 保持现有 dark 皮肤的视觉结果稳定，避免回归
- 设计并引入新的 light 皮肤，使其与 dark 同属一个产品家族
- 为 CSS、LESS、Ant Design、图表和 portal 组件提供统一的主题来源
- 让聊天页、技能页、登录页、加载态、错误态、Toast、Modal、Tooltip 等跟随主题稳定切换
- 明确沉浸式 `Star-Office-UI` 的主题边界，防止把外部 iframe 内容错误纳入主应用主题改造
- 将后续新增页面的主题接入方式沉淀为长期规范

### Non-Goals

- 不重做当前 dark 主题的视觉方向
- 不把 light 主题做成通用蓝白后台风
- 不修改 `Star-Office-UI` iframe 内部的真实像素办公室视觉
- 不引入新的大型主题框架或 CSS-in-JS 体系替换现有 LESS 架构
- 不借本次 change 调整会话模型、协议、业务流程或权限逻辑

## Aesthetic Direction

### Dark Theme

延续当前已完成的：

> `Paper Ops / Graphite Console`

即：

- 深 graphite 壳层
- 低存在感 chrome
- 分隔线优先于厚卡片
- 中高信息密度
- 主舞台优先

### Light Theme

新增主题方向定义为：

> `Ivory Editorial / Paper Console`

核心气质：

- 暖白纸面背景，而不是纯白后台
- 石墨文字与低饱和靛蓝交互色
- 细分隔线、弱表面层、低阴影
- 更接近文档工作台与知识台面，而不是通用管理端

该 light 主题与 dark 主题属于同一产品家族，只改变光照与纸面语义，不改变整体布局秩序。

## Decisions

### Decision: 建立“语义 token -> 运行时主题 -> 组件消费”三层结构

本次不直接在每个组件里写 `light` / `dark` 分支，而是建立三层主题结构：

1. 语义 token 层  
   定义颜色、表面层、文本、边框、交互、状态、结果容器、图表、反馈等语义变量

2. 运行时主题层  
   通过 `data-theme` + CSS custom properties 承载 dark / light 的实际值

3. 组件消费层  
   组件继续优先通过 LESS 变量或统一 helper 使用语义 token，而不是直接写颜色

这样做的原因：

- 运行时切换必须依赖 CSS custom properties 或等价机制
- 现有 LESS 代码量较大，完全替换成本高
- 通过“LESS 变量桥接 CSS vars”，可以降低迁移成本并减少遗漏

### Decision: 统一维护 palette，并生成 Ant Design 主题

Ant Design 组件不能仅依赖 CSS vars，因此需要把当前 `antdTheme.ts` 改造成：

- `darkPalette`
- `lightPalette`
- `createAntdTheme(mode)`

由此保证：

- Button、Input、Modal、Message、Notification、Drawer、Select 等 portal 或 token 组件能够同步主题
- 全局 portal 组件不会继续残留 dark token 或默认 AntD 样式

### Decision: 明确主题切换入口与持久化行为

系统需要提供一个全局可发现的主题切换入口，并具备持久化能力。

建议行为：

- 用户切换主题后，偏好写入本地存储
- 应用启动时在首屏渲染前恢复主题
- DOM 根节点同步 `data-theme`
- 同步浏览器 `color-scheme`

这样做是为了避免：

- 路由切换时主题闪回
- 初次渲染先以 dark 显示，再跳成 light 的 FOUC 问题

### Decision: light 主题不复刻 dark，而是复刻“结构秩序”

本次 light skin 不是简单把 dark 的每个背景调亮，而是保留以下结构不变：

- 线性分隔工作台
- 主舞台优先
- 底部 dock composer
- 聊天页、技能页、登录页、沉浸层之间的角色边界

同时重建以下视觉元素：

- 背景层级
- 表面层语义
- 文本对比
- CTA 颜色
- hover / focus 反馈
- 图表与表格的浅色呈现方式

### Decision: `Star-Office-UI` 仅改外层承载，不改内部真实画面

沉浸式工作台属于产品的外部沉浸层。

因此本次要求：

- 外层悬浮控制条、背景遮罩、承载页壳层跟随当前主题
- 真实 iframe 内的像素办公室画面保持原始视觉，不强行纳入主应用 light 主题改造

这样做的原因：

- 避免把不属于主应用控制范围的外部系统错误地纳入主题改造
- 降低 theme coupling
- 保护真实像素办公室的完整性

## Theme Surface Plan

### 1. Global / Shell

- 页面底色
- rail / panel / divider
- 主内容舞台底板
- 全局 selection / scrollbar / focus ring

### 2. Chat Workspace

- 欢迎态
- 对话态
- 消息轨道
- 底部 composer dock
- 轻量 meta 区
- 滚动定位按钮

### 3. Skills / Login / Error / Loading

- 技能页头部工具层与卡片表面
- 登录页品牌入口区与操作卡
- 错误边界
- 路由级 loading 占位

### 4. Rich Content

- Markdown 表格
- 引用块
- inline code / code block
- 图表容器
- Ant Design 表格与分页

### 5. Feedback Layer

- Message / Toast
- Modal
- Drawer
- Tooltip / Popover
- Dropdown

## Risks / Trade-offs

- 风险：深色主题在接入运行时 token 后出现视觉漂移  
  缓解：dark palette 以现状为基准，只做兼容性映射，不做主动重设计

- 风险：主题值仍散落在局部样式中，导致 light 遗漏  
  缓解：实现阶段需要优先清理写死值最集中的全局样式、聊天页、技能页、图表与反馈层

- 风险：portal 组件与普通 DOM 组件出现两套主题  
  缓解：Ant Design token 与 CSS vars 必须来自同一 palette 源

- 风险：light 主题过于接近默认后台风，失去产品识别  
  缓解：明确使用 `Ivory Editorial / Paper Console`，坚持暖白纸面、石墨文本和低饱和靛蓝点缀

- 风险：主题切换导致首屏闪烁  
  缓解：在根节点渲染前恢复本地主题并同步 `data-theme`

## Migration Plan

1. 创建并校验 `add-dual-theme-light-skin` change
2. 建立 `theme-system` 能力与统一 palette
3. 改造 `App` 根层、全局样式与 Ant Design 主题入口
4. 迁移高优先级页面与组件到语义 token
5. 引入 light 皮肤并完成主页面覆盖
6. 修正图表、表格、Toast、Modal、Loading、错误态等漏点
7. 更新 `docs/UI-视觉系统指南.md` 与 `AGENTS.md` 中的长期引用
8. 补充测试并完成回归验证

## Open Questions

- 主题切换入口最终落在侧栏底部用户区还是顶部全局操作区
- 是否在未来加入“跟随系统”作为第三种模式

本次 change 先只定义 dark / light 两种显式模式，不把“跟随系统”纳入必做范围。
