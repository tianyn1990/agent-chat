## MODIFIED Requirements

### Requirement: Light 主题 SHALL 进一步收敛为文档化纸面工作台

`light` 主题 SHALL 在保留既有产品识别的前提下，进一步收敛为更克制的文档化纸面工作台语义，减少暖后台感、厚卡片感和明显渐变感。

#### Scenario: 用户在 light 主题查看主工作台

- **WHEN** 用户在 `light` 主题下访问聊天页或技能页
- **THEN** 页面应优先通过暖白纸面底色、细分隔线、浅表面层与稳定墨色文本建立结构
- **AND** 不得继续表现为明显偏黄的后台面板风格
- **AND** 不得回退到默认蓝白 SaaS 风

### Requirement: Light 主题下的交互控件 MUST 保持克制且统一的视觉强度

主题系统 MUST 让 `light` 主题下的按钮、输入区、meta chip、状态标签和反馈层保持统一且低饱和的交互强度，避免出现局部按钮或提示过亮、过跳的问题。

#### Scenario: 用户在 light 主题操作聊天页输入区

- **WHEN** 用户查看输入 dock、发送按钮、状态 chip 或轻量提示
- **THEN** 这些控件应共享统一的 paper / ink / muted indigo 语义
- **AND** 主 CTA、默认按钮、禁用态和信息标签之间必须保持清晰但克制的层级差
