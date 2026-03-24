# 变更提案：UI 细节打磨（第二轮）

> Change ID: `refine-ui-polish-pass-2`
> 状态：提案中
> 创建日期：2026-03-24

## Why

第一轮视觉系统升级已完成整体风格统一，但当前真实截图暴露出若干影响体验的细节问题：

- 聊天页标题区占用过多视觉带宽，`sessionId` 等技术信息直接暴露
- 顶部 meta 卡片与标题抢宽度，长标题换行质量差
- 欢迎态与首屏交互入口存在“首屏内容被截断、行动路径不聚焦”的问题
- 技能页重复展示已安装技能，信息架构冗余
- 登录页存在标题层级不规范、主 CTA 权重不足的问题
- 搜索与分类控件的可访问性 label 仍不完善

这些问题不涉及核心架构与能力，但会直接影响用户对当前 UI 方案的信任度与精致感，需要进行第二轮精修。

## What Changes

- 收敛聊天页标题区与 meta 区视觉密度，避免压缩主标题宽度
- 移除原始 `sessionId` 的首屏直出，改为更可读的会话语义
- 优化欢迎态首屏信息密度，确保 CTA 与卡片完整可见
- 调整消息列的视觉轨道（conversation rail），提升阅读连续性
- 技能页去重：已安装与所有技能不重复展示
- 登录页修正标题层级与 CTA 权重
- 补足搜索输入的可访问性 `aria-label`

## Impact

- Affected specs: `workspace-ui`
- Affected code:
  - `src/pages/Chat/*`
  - `src/components/Chat/*`
  - `src/pages/Skills/*`
  - `src/components/Skills/*`
  - `src/pages/Login/*`
  - `src/styles/*`
  - `tests/pages/*`
  - `tests/components/*`
