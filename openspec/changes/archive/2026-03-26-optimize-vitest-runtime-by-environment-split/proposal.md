# Change: 按测试环境拆分 Vitest 运行时以缩短全量测试耗时

## Why

当前仓库只有 47 个测试文件，但 `npm run test` 的实际墙钟时间已经达到约 11 分钟。  
根因不是单个测试逻辑过慢，而是所有测试统一跑在 `jsdom` 环境下，导致大量仅验证 store、utils、mock、service 的纯逻辑测试也重复承担浏览器模拟环境初始化成本。

如果不解决这个基础设施问题，后续测试规模继续增长时，本地回归与 CI 都会明显变慢，影响开发效率。

## What Changes

- 将 Vitest 改为按测试类型拆分运行环境：
  - `components / pages / 依赖 DOM 的 src 测试` 使用 `jsdom`
  - `stores / utils / mocks / services` 使用 `node`
- 将测试 setup 拆分为 `node` 与 `jsdom` 两套入口，避免非 UI 测试加载多余的浏览器 stub
- 保持现有 `npm run test` 使用方式不变，但内部改为更高效的环境分流匹配
- 新增 `npm run test:logic` 与 `npm run test:ui`，方便按测试类型独立回归
- 补充针对新测试基础设施的验证，确保环境切换后现有测试语义不变

## Impact

- Affected specs:
  - `test-runtime-performance`
- Affected code:
  - `vitest.config.ts`
  - `package.json`
  - `tests/setup.ts`
  - `tests/**/*`
  - `src/**/*`
