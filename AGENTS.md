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

## 提交协作规则（长期生效）

- 当 Agent 认为当前任务阶段适合提交时，必须先询问用户是否同意提交。
- 仅在用户明确同意后，才可执行 `git add` 与 `git commit`。
- `git add` 范围可根据任务需要选择部分文件或全部文件，但应在提交前向用户说明范围。
- 提交信息必须使用中文，并包含清晰且相对详细的变更说明（建议包含背景、主要改动、验证结果）。
