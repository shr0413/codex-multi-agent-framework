# Framework Overview

第一版把 README 里的蓝图收敛成一个能跑的最小控制面。

## 目标

- 用 gate 而不是 prompt 自觉来控制进入下一阶段的条件
- 把运行状态写盘，支持恢复、回放和审计
- 把执行、验证、停止拆成独立职责
- 在普通模式和自治优化模式之间显式切换

## 当前实现

- `src/process/gates.mjs`
  - `Design Gate`
  - `Planning Gate`
  - `Debugging Gate`
  - `Verification Gate`
- `src/state/state-store.mjs`
  - run state
  - working summary
  - evidence log
  - project memory
  - cross-project learnings reference file
- `src/execution/orchestrator.mjs`
  - normal mode orchestration
  - autonomous optimization loop
  - verification + stop handling
- `src/cli.mjs`
  - `run`
  - `resume`
  - `show-run`

## 当前边界

- 这是控制面 v1，不是分布式 agent runtime
- worker 先只内置 `note`、`write_file`、`append_file`、`shell`
- 并行只在无依赖、无文件冲突的步骤上发生
- 自治优化先支持显式定义的 baseline / iteration / rollback
