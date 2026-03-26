# 实施任务：按环境拆分 Vitest 运行时

## 1. 方案与配置

- [x] 1.1 新建并校验本 change 的 proposal、design、spec
- [x] 1.2 盘点现有测试目录，确定 `node` 与 `jsdom` 的归属边界

## 2. 测试基础设施改造

- [x] 2.1 将 `vitest.config.ts` 改为按环境分流配置
- [x] 2.2 拆分测试 setup，避免非 UI 测试加载 DOM stub
- [x] 2.3 必要时调整少量测试文件以适配新的环境划分

## 3. 验证

- [x] 3.1 验证 `node` 通道测试通过
- [x] 3.2 验证 `jsdom` 通道测试通过
- [x] 3.3 运行 `npm run test`，确认全量通过且耗时下降
