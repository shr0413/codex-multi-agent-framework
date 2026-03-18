# Process Layer

## Gate 设计

### Design Gate

- 高不确定度、多文件、多阶段任务时强制要求 `context.designSummary`
- 小任务直接跳过，不做形式主义设计文档

### Planning Gate

- 普通模式要求非空 `plan`
- 自治优化模式要求：
  - `metric`
  - `evaluate.command`
  - `mutableFiles`
  - 至少一轮 `improvement`
  - 至少一轮 `refinement`

### Debugging Gate

- 仅对 `bug` / `regression` 生效
- 要求先给 `context.rootCause`
- 如果失败次数过多，直接阻断继续修补

### Verification Gate

- 运行结束后必须有新鲜验证证据
- 证据时间戳必须晚于最后一次执行时间

## 代码位置

- Gate 判断：`src/process/gates.mjs`
- Gate 落地调用：`src/execution/orchestrator.mjs`
