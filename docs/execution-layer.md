# Execution Layer

## 最小角色集

### Orchestrator

- 唯一推进 run state 的组件
- 负责 gate、调度、状态落盘、验证收口

### Worker Pool

- 负责具体步骤执行
- 当前内置 worker 类型：
  - `note`
  - `write_file`
  - `append_file`
  - `shell`

### Router

- 基于依赖和文件冲突拆成执行批次
- 只在独立步骤间并行

### Verifier

- 独立于 worker
- 校验 expected files / expected text / shell verification commands
- 负责 metric 解析

### Watcher

- 记录 baseline / best metric / no improvement / failures
- 管自治优化模式的停止条件

## 代码位置

- `src/execution/orchestrator.mjs`
- `src/execution/router.mjs`
- `src/execution/worker-pool.mjs`
- `src/execution/verifier.mjs`
- `src/execution/watcher.mjs`
