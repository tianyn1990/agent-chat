## MODIFIED Requirements

### Requirement: Light 主题 SHALL 收敛为更中性的 Porcelain Console

`light` 主题 SHALL 在保留项目既有 editorial / paper 工作台语义与品牌识别的前提下，进一步收敛为更中性的 `Porcelain Console`，减少大面积暖黄、米色和浅棕结构层。

#### Scenario: 用户在 light 主题访问主应用

- **WHEN** 用户在 `light` 主题下访问聊天页、技能页或其他主工作台页面
- **THEN** 页面应优先表现为白灰主背景、极浅表面层、细分隔线与稳定墨色文本
- **AND** 大面积结构层不应继续呈现明显的米黄或羊皮纸色调
- **AND** 系统不得回退为默认蓝白 SaaS 后台风格

### Requirement: Light 主题下的反馈层 MUST 与主工作台保持同一色温

主题系统 MUST 让 `light` 主题下的 `Modal`、`Message`、`Notification`、`Drawer`、`Dropdown` 与其他浮层容器保持和主工作台一致的白灰色温与克制交互强度。

#### Scenario: 用户在 light 主题触发弹层与提示

- **WHEN** 用户在 `light` 主题下触发 toast、弹窗、抽屉、下拉菜单或 tooltip
- **THEN** 这些反馈层应继承同一套白灰容器、稳定文字与轻分隔语义
- **AND** 不得出现明显偏暖、偏黄或默认 Ant Design 浅色 token 的视觉断层
