## ADDED Requirements

### Requirement: 测试运行时必须按环境分流

系统 SHALL 根据测试实际依赖，将 Vitest 测试拆分到 `node` 与 `jsdom` 两类运行环境中执行，避免纯逻辑测试重复初始化浏览器模拟环境。

#### Scenario: 纯逻辑测试使用 node 环境

- **WHEN** 执行 `stores`、`utils`、`mocks`、`services` 目录下的测试
- **THEN** 系统应使用 `node` 环境运行这些测试
- **AND** 不应为这些测试加载浏览器专用 stub

### Requirement: UI 测试必须继续使用 jsdom

系统 SHALL 保持组件与页面测试在 `jsdom` 环境下运行，确保现有 DOM 交互测试行为不变。

#### Scenario: 组件测试继续使用 jsdom

- **WHEN** 执行 `components`、`pages` 等依赖 DOM 的测试
- **THEN** 系统应使用 `jsdom` 环境运行
- **AND** 继续提供 `localStorage`、`matchMedia` 等必要浏览器 mock

### Requirement: 全量测试命令必须保持兼容

系统 SHALL 保持 `npm run test` 作为统一入口，同时在内部完成多环境测试调度。

#### Scenario: 开发者继续使用统一命令

- **WHEN** 开发者执行 `npm run test`
- **THEN** 系统应同时运行 `node` 与 `jsdom` 两类测试
- **AND** 不要求开发者改变现有测试执行习惯
