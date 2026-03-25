# 变更提案：为主应用引入双主题系统与明亮皮肤

> Change ID: `add-dual-theme-light-skin`
> 状态：提案中
> 创建日期：2026-03-25

## Why

当前 `agent-chat` 已经完成了 `Paper Ops / Graphite Console` 深色工作台收敛，深色主视觉基本稳定；但整个应用仍然只有单一 dark 主题能力，存在以下结构性问题：

- 全局样式、Ant Design token、页面模块样式和部分图表主题都默认写死为 dark 语义，无法安全扩展为运行时切换
- 如果直接追加一套浅色 CSS，很容易在聊天页、技能页、登录页、Toast、Modal、Loading、图表、工作台外壳等区域出现漏改和主题漂移
- 当前项目已经进入多页面、多模块阶段，后续新增页面如果没有统一主题层，将继续重复写死颜色与表面层，维护成本会持续上升
- 用户希望新增一套完整的“明”皮肤，但同时明确要求不要破坏当前“暗”部分的既有设计成果

因此，本次 change 的目标不是简单“换颜色”，而是把项目从单主题 UI 升级为：

> 可运行时切换的双主题系统 + 一套独立设计完成的 light skin

其中：

- dark 主题继续保持当前 `Paper Ops / Graphite Console`
- light 主题新增一套 `Ivory Editorial / Paper Console` 风格皮肤
- 两套皮肤共享统一组件语义与结构边界，避免后续维护出错

## What Changes

- 新增全局主题系统能力，支持 dark / light 两套主题在运行时切换
- 抽象语义化主题 token，统一 CSS、LESS、Ant Design 与图表层的主题来源
- 设计并落地一套新的 light skin，覆盖聊天页、技能页、登录页、错误页、加载态和全局反馈组件
- 保持当前 dark 皮肤的视觉结果不被重新设计，仅在必要处做兼容性改造
- 为沉浸式 `Star-Office-UI` 工作台补充主题边界：外层承载 chrome 跟随主应用主题，真实 iframe 内容不强制改造
- 补充主题偏好持久化、启动恢复和无闪烁策略
- 更新视觉系统文档，沉淀双主题下的长期规则与新增模块接入方式

## Impact

- Affected specs:
  - `theme-system`
  - `workspace-ui`
  - `visualize-workbench`
- Affected code:
  - `src/App.tsx`
  - `src/styles/variables.less`
  - `src/styles/global.less`
  - `src/theme/*`
  - `src/components/Layout/*`
  - `src/components/Chat/*`
  - `src/components/Skills/*`
  - `src/components/Chart/*`
  - `src/components/Common/*`
  - `src/components/Visualize/*`
  - `src/pages/Chat/*`
  - `src/pages/Skills/*`
  - `src/pages/Login/*`
  - `src/pages/Visualize/*`
  - `tests/components/*`
  - `tests/pages/*`
  - `docs/UI-视觉系统指南.md`
  - `AGENTS.md`
