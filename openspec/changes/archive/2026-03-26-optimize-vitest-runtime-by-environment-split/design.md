# 设计文档：按环境拆分 Vitest 运行时

## Context

当前 `vitest.config.ts` 只有一套全局配置：

- 所有测试统一使用 `jsdom`
- 所有测试统一执行 `tests/setup.ts`

这会带来两个直接问题：

1. 纯逻辑测试也会重复初始化 `window`、`document`、`matchMedia` 等浏览器依赖
2. `jsdom` 的初始化和销毁成本被重复叠加到每个测试文件上

从当前测试分布来看，以下目录明显不需要 DOM：

- `tests/utils`
- `tests/stores`
- `tests/mocks`
- `tests/services`

而以下测试仍应保留 `jsdom`：

- `tests/components`
- `tests/pages`
- `src/components/**/__tests__`

## Goals

- 在不改动 `npm run test` 使用方式的前提下缩短全量测试时间
- 保持现有测试行为与断言结果不变
- 减少非 UI 测试对浏览器 stub 的隐式依赖

## Non-Goals

- 不重写现有测试目录结构
- 不引入新的测试框架
- 不在本次变更中大规模改造慢测试实现细节

## Decision

采用单一 `vitest.config.ts` + `environmentMatchGlobs` 的方案，将测试拆成两个运行域：

1. `logic`
   - 默认环境：`node`
   - 覆盖目录：`tests/utils/**`、`tests/stores/**`、`tests/mocks/**`、`tests/services/**`
   - setup：进入 `tests/setup.ts` 后只安装 `node` 侧轻量 polyfill

2. `ui`
   - 通过 glob 提升到 `jsdom`
   - 覆盖目录：`tests/components/**`、`tests/pages/**`、`src/components/**/__tests__/**`
   - setup：同样进入 `tests/setup.ts`，但会额外安装 DOM 相关 mock，如 `matchMedia`、`getComputedStyle`

同时补充两个独立脚本：

- `npm run test:logic`
- `npm run test:ui`

用于在日常开发中按测试类型做快速回归。

## Why This Design

### 为什么不是继续用单一 jsdom

因为当前性能瓶颈正是“无差别地初始化浏览器环境”。  
继续保留单一 `jsdom`，即使再做零散优化，也无法从根上消除这一层固定开销。

### 为什么不是把所有测试都切到 node

组件、页面与部分交互测试依赖：

- React Testing Library
- `antd`
- DOM 事件
- 浏览器布局 API stub

这些测试仍然必须使用 `jsdom`。

## Risks

### 风险 1：部分逻辑测试隐式依赖了 DOM

应对策略：

- 先按目录拆分
- 若某个逻辑测试实际依赖浏览器环境，则将其移动到 UI project 匹配范围或调整为显式 DOM 环境

### 风险 2：少量逻辑测试虽然不需要完整 DOM，但仍依赖局部浏览器能力

应对策略：

- 在 `node` setup 中只补最小必要 polyfill，例如 `localStorage`
- 对真正触碰 `document` 的个别测试文件，单独提升到 `jsdom`

### 风险 3：setup 拆分后行为不一致

应对策略：

- 通过统一的 `tests/setup.ts` 作为入口，再按环境分支安装对应能力
- 仅将 `window`、`matchMedia` 等浏览器特有 stub 放在 UI setup

## Validation

- `npm run test`
- 对比改造前后的总耗时变化
- 抽样验证 `node` / `jsdom` 两类测试都能独立通过
