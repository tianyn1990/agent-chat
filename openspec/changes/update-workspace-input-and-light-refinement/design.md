## Context

本次变更发生在三轮较大改造之后：

1. 主应用已完成 `Graphite Console` 深色工作台收敛
2. 框架层已完成“线性分隔工作台”重构
3. 双主题系统与明亮皮肤已具备运行时切换能力

因此，这次不再解决“页面框架是否正确”的问题，而是解决“结构已经基本稳定后，哪些交互细节仍然让用户频繁别扭”的问题。

用户本轮反馈集中在以下七项：

- 档案 panel 开关位置不对
- 输入框容易失焦
- 回复中不能继续输入
- 多行输入发送后不恢复
- light 主题整体色调还不够克制
- 从像素办公室返回后的提示太短
- icon 垂直节奏不够稳

这些问题跨越 `Sidebar`、`MessageInput`、聊天页状态管理、`VisualizeSummaryView` 和全局主题 token，因此属于典型的跨组件精修 change，需要在开始实现前先明确边界。

## Goals / Non-Goals

- Goals:
  - 让聊天主舞台的边界控制器回到正确位置，减少结构与交互之间的认知断裂
  - 让输入区支持“上一轮回复处理中，下一轮内容已开始准备”的使用模式
  - 让发送、清空、切会话后的输入区高度与焦点行为更可预测
  - 让明亮皮肤更接近文档化、纸面化、编辑器化的工作台气质
  - 让工作台返回提示更像短驻留恢复入口，而不是一闪而过的 toast
  - 收敛关键 icon-only 控件的垂直节奏，提高整体完成度
- Non-Goals:
  - 不改动聊天消息协议、WebSocket 并发模型或会话模型
  - 不引入“草稿队列”或同一会话多条消息并发提交
  - 不重做像素办公室 iframe 内部 UI
  - 不进行新一轮框架级布局重构

## Decisions

### Decision: 将档案 panel 的切换入口变为 seam toggle

- 现状问题：
  - 按钮位于 rail 底部，语义上像底部工具，但行为上控制的是中部 panel 的可见性
- 决策：
  - 把切换按钮从 rail 底部迁移到 rail 与 panel 的分隔线位置
  - 设计为低干扰的边界控制器，而不是普通功能按钮
- Why:
  - 线性分隔框架的核心是“结构边界可感知”
  - 控制某段边界的入口，应附着在该边界本身
- Alternatives considered:
  - 保留当前位置，只改样式：无法解决结构语义错位
  - 放到 panel 头部：展开态可行，但收起态失去稳定入口

### Decision: 拆分“可编辑”和“可发送”两种输入状态

- 现状问题：
  - 机器人处理中时，`textarea` 直接 disabled，浏览器会移走焦点，用户也无法提前准备下一条内容
- 决策：
  - 输入区拆为：
    - `editable`: 是否允许编辑文字 / 选择附件
    - `submittable`: 是否允许发送
  - 在“已有会话但当前正在回复”时，允许编辑但禁止发送
- Why:
  - 用户的真实工作流是“等待上一轮回复时开始准备下一轮”
  - 这仍符合“同一会话提交串行”的系统约束
- Alternatives considered:
  - 继续整体禁用：最简单，但持续制造焦点与输入阻塞问题
  - 允许并发发送：会改变会话协议边界，风险过大

### Decision: 对输入框采用条件化自动 focus，而不是全局强制抢焦点

- 决策：
  - 只在以下场景恢复或建立焦点：
    - 新建/切换到当前会话后
    - 欢迎建议或技能跳转注入草稿后
    - 发送成功清空输入后
    - 当前流式回复结束后，且用户没有把注意力移到别的控件
  - 不在所有 render / 所有状态变化时强制 `focus()`
- Why:
  - 自动 focus 的目标是“减少多余点击”，不是“持续抢占注意力”

### Decision: 发送后与切换会话时都要重算 composer 高度

- 现状问题：
  - 输入框高度只在 `onChange` 里被调整，value 被外部清空时不会恢复
- 决策：
  - 以 `value` 为唯一高度真源
  - 当 `value === ''` 时回落到单行高度
  - 当切换 session 或注入 draft 时重新测量高度
- Why:
  - 高度状态必须跟随草稿值，而不是滞留在 DOM 内联样式里

### Decision: 将 light 主题从“暖后台”继续收敛为“纸面文档工作台”

- 决策：
  - 降低当前明亮皮肤的暖黄感、渐变感和卡片感
  - 提高文字墨色稳定度，收紧 CTA 饱和度，更多依赖分隔线与浅表面层建立结构
- Why:
  - 用户给出的参考更接近 docs / editorial 产品，而不是浅色 SaaS 后台
  - 但仍需保留当前产品的靛蓝与纸面工作台识别
- Alternatives considered:
  - 直接照搬参考站点：会破坏项目既有品牌边界
  - 完全不改：light 主题成熟度仍不足

### Decision: 延长工作台返回提示驻留时间，并支持 hover 暂停

- 现状问题：
  - 轻量提示当前更像 toast，不像恢复入口
- 决策：
  - 延长默认驻留时间
  - 鼠标 hover 时暂停自动关闭
  - 保留手动关闭
- Why:
  - 这个提示承担“恢复工作台”的任务，需要给用户足够反应时间

### Decision: 对关键 icon-only 控件做一次垂直节奏归一

- 决策：
  - 优先处理 rail action、发送按钮、滚动定位按钮、执行状态提示按钮、图表工具栏等高频控件
  - 统一 `inline-flex`、`line-height: 1`、内部 icon wrapper 与按钮尺寸规则
- Why:
  - 视觉精修阶段，icon 垂直重心不稳会显著降低整体完成度

## Risks / Trade-offs

- 风险：自动 focus 处理不当会变成“抢焦点”
  - Mitigation:
    - 使用条件化 focus 策略
    - 只在明确的会话与发送节点恢复焦点

- 风险：允许回复中编辑后，用户可能误以为可以立即发送
  - Mitigation:
    - 发送按钮明确 disabled
    - tooltip 与提示文案说明“可继续输入，稍后发送”

- 风险：light 主题二次调色波及面广，容易出现局部漏改
  - Mitigation:
    - 主要通过 palette token 调整
    - 对重点页面与反馈层补充回归测试

- 风险：seam toggle 若做得太弱，可能难以发现
  - Mitigation:
    - 提高 hover / focus-visible 可发现性
    - 保持足够命中面积，而不是仅保留极细视觉体积

## Migration Plan

1. 先在 OpenSpec 中补齐 `workspace-ui`、`theme-system`、`visualize-workbench` 的 delta
2. 实现 `Sidebar` seam toggle 与输入状态机拆分
3. 实现 composer 焦点与高度归一逻辑
4. 调整 `VisualizePanel` 与 `VisualizeSummaryView` 的返回提示策略
5. 统一调 light palette 与关键 icon-only 控件
6. 补测试、回归文档、更新 UI 视觉系统指南

## Open Questions

- seam toggle 是采用纯 icon 还是极窄胶囊外形更合适
- light 主题的暖感收紧到什么程度最平衡，需要实现阶段结合截图再做一次视觉校准
