<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 仓库 Agent 协作约束

## 语言规范

- 请使用中文回复、写文档、写代码注释，专业词汇使用英文。

## 代码注释规则（长期生效）

- 所有新增或修改的核心逻辑，必须补充简洁注释，优先解释“为什么这样做”。
- 注释使用中文，专业词汇使用英文；避免逐行翻译式注释。
- 若发现历史代码可读性不足，应在相关任务中顺带补齐必要注释。

## 前端 UI 规则（长期生效）

- 当任务涉及页面视觉、组件样式、交互层级或新增前端模块时，必须先阅读 [docs/UI-视觉系统指南.md](/Users/hetao/Documents/github/agent-chat/docs/UI-视觉系统指南.md)。
- 新增页面或组件默认继承当前双主题视觉系统：`dark` 为 `Paper Ops / Graphite Console`，`light` 为 `Ivory Editorial / Porcelain Console`；不得回退到通用蓝白后台风。
- 优先复用 `src/styles/variables.less` 中的 token，不要无必要写死新的颜色、圆角、阴影和间距。
- 涉及主题能力时，优先复用 `src/theme/palette.ts`、`src/theme/antdTheme.ts` 与 `src/stores/useThemeStore.ts`，不要在组件中单独维护一套 `dark/light` 常量。
- 主应用框架优先采用“线性分隔工作台”策略：避免重新引入左右双大壳体；框架级区域尽量用分隔线、留白和弱表面层表达，内容级主舞台再保留必要容器。
- 执行状态相关体验继续遵循“主界面克制专业、沉浸式工作台 iframe-first”的边界，不要重新引入大面积说明层挤占真实工作台画面。

## 本地 OpenClaw 联调规则（长期生效）

- 当任务涉及本地 OpenClaw 启动、`mock-openclaw / openclaw-direct` 切换、`19001`、Gateway health、直连联调、模型配置排查时，必须先阅读 [docs/本地OpenClaw联调操作手册.md](/Users/hetao/Documents/github/agent-chat/docs/本地OpenClaw联调操作手册.md)。
- 当任务目标是在本仓库内启动本地直连联调时，优先使用 `npm run dev:openclaw-direct`，不要先手工改写 `.env.local` 或单独常驻一个 Gateway 前台终端，除非任务明确要求这样做。
- 进行本地直连排查时，优先执行 `openclaw --dev gateway health` 与端口监听检查，再判断是否是前端问题。
- 当本地直连受阻时，优先帮助用户切回 `mock-openclaw` 以保持开发连续性，不要让 UI 开发被真实 Gateway 阻塞。
- 若错误本质属于 OpenClaw 模型或 auth 配置，应明确说明是 OpenClaw 侧问题，不要错误归因到前端仓库。

## 提交协作规则（长期生效）

- 当 Agent 认为当前任务阶段适合提交时，必须先询问用户是否同意提交。
- 仅在用户明确同意后，才可执行 `git add` 与 `git commit`。
- `git add` 范围可根据任务需要选择部分文件或全部文件，但应在提交前向用户说明范围。
- 提交信息必须使用中文，并包含清晰且相对详细的变更说明（建议包含背景、主要改动、验证结果）。
