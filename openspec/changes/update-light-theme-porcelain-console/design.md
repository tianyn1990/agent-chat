## Context

本次变更发生在双主题系统已经落地之后，因此目标不是“新增 light 主题”，而是“继续校准已经存在的 light 主题”。

当前 `dark` 主题已经形成较稳定的 `Graphite Console` 视觉语言，而 `light` 主题仍处于从“暖纸面后台”向“白灰编辑台”过渡的阶段。用户本轮明确给出一张偏文档站点风格的参考图，并指出当前项目的明亮皮肤存在“偏黄”“偏暖”的问题，希望整体进一步向白色、灰色、中性结构层收敛。

从现有 token 可见，问题主要不是某个局部组件单独出错，而是 `lightPalette` 中一整组基础颜色都偏向：

- `contentBg` / `contentBgSecondary`
- `paperBg` / `paperBgStrong`
- `sidebarBg`
- `toolbarBg`
- `surfaceFloating`
- `overlayCanvas`
- `visualizeShellBg`

这组颜色会层层传导到：

- Layout 外壳
- 聊天主舞台
- 侧边栏与二级 panel
- Modal / Message / Dropdown / Tooltip 等 portal 组件
- 图表与结果容器
- 沉浸式工作台外层宿主

因此这是一个跨主题层、框架层和反馈层的 change，需要在实现前先明确设计边界。

## Goals / Non-Goals

- Goals:
  - 让 `light` 主题整体从暖黄纸面收敛到更中性的 `Porcelain Console`
  - 保持与当前 `dark` 主题共享同一套布局语义、组件边界和信息架构
  - 让大面积背景、浮层、分隔线、toolbar 与反馈层在明亮主题下更白、更灰、更冷静
  - 保留靛蓝主色与克制铜棕 accent，避免主题失去产品识别
  - 减少 `light` 主题在 portal 组件和工作台宿主上的色温断层
- Non-Goals:
  - 不重做 `dark` 主题
  - 不做新一轮框架级布局改造
  - 不重写聊天、技能或像素办公室的交互逻辑
  - 不把 `light` 主题改成默认蓝白 SaaS 管理后台

## Decisions

### Decision: 将明亮主题收敛为“白灰编辑台”而不是“米黄纸面”

- 决策：
  - `light` 主题保留 editorial / paper 的文档产品气质，但整体色温向更中性的白灰收紧
  - 大面积背景从 `ivory / parchment` 调整到 `porcelain / fog / slate-white`
- Why:
  - 用户参考图的核心特征是“白灰工作台 + 细分隔 + 中性文字”，而不是“暖黄纸张”
  - 保留轻微暖感作为品牌余温即可，不应继续主导全局背景

### Decision: 优先通过 palette 与 AntD token 收敛，而不是逐组件硬编码修补

- 决策：
  - 以 `src/theme/palette.ts` 为主入口完成 `light` 主题校准
  - 通过 `src/theme/antdTheme.ts` 同步 Ant Design portal 组件的容器、mask、文字和边框
- Why:
  - 本次问题的根源在主题基底，而不是单个页面
  - 若继续在组件里硬编码补色，会让后续双主题维护更容易漂移

### Decision: 保留靛蓝主色，降低铜棕对结构层的参与度

- 决策：
  - `primary` 仍保持低饱和靛蓝
  - `accentColor` 继续存在，但主要用于眉标、辅助强调与少量记忆点
  - 结构分隔、默认容器和大面积表面层不再依赖棕灰底色
- Why:
  - 产品仍需要自身识别，而不是完全贴近外部参考站点
  - 问题的重点不是去掉品牌色，而是让品牌色退出“大面积底色”

### Decision: 受影响面优先覆盖主舞台、反馈层与工作台宿主

- 决策：
  - 除主题 token 外，优先回归以下区域：
    - 聊天页主舞台与消息容器
    - 技能页与抽屉
    - 图表与结果容器
    - 空状态容器
    - 工作台宿主壳层与 iframe 外围
    - Message / Modal / Dropdown / Tooltip 等 portal 组件
- Why:
  - 这些区域最容易暴露“light 主题整体已经变冷，但局部仍发黄”的断层

## Risks / Trade-offs

- 风险：白灰化过度，导致 `light` 主题失去 paper / editorial 气质
  - Mitigation:
    - 保留轻微暖白而不是做成纯 `#ffffff`
    - 保留 muted indigo 与 restrained bronze 作为局部品牌记忆

- 风险：只改 palette 后，仍存在局部硬编码暖色残留
  - Mitigation:
    - 实现阶段对聊天页、技能页、图表容器、工作台宿主做一轮定点回归

- 风险：Ant Design portal 组件继续暴露默认 token，造成弹层与主界面割裂
  - Mitigation:
    - 同步校准 `Modal`、`Message`、`Notification`、`Drawer` 以及全局 `colorBgMask`

## Migration Plan

1. 创建本次 change 的 proposal、design、tasks 与 delta spec
2. 调整 `lightPalette` 的基础背景、表面层、边框、浮层和反馈层 token
3. 调整 `createAntdTheme('light')` 的 portal token，使其与 palette 一致
4. 回归聊天页、技能页、图表容器与工作台宿主的明亮主题表现
5. 补充测试并更新 UI 视觉系统文档

## Open Questions

- 这次收敛后，`light` 主题文案命名是否仍保留 `Ivory Editorial / Paper Console`，还是在文档层引入 `Porcelain Console` 作为更具体的子方向
- 某些极弱暖感是否需要只保留在欢迎态、眉标和少量状态标签中，实现阶段需结合效果微调
