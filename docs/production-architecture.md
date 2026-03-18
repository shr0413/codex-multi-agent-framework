# Production Architecture

第一版代码是本地单进程控制面，但结构已经按生产需求分层。

## 生产拆分建议

### Control Plane

- Orchestrator
- Process gates
- Run state transitions

### Durable State

- 运行状态存储
- 证据日志
- 项目记忆

### Execution Plane

- 本地 worker
- 远程 worker
- shell / tool adapters

### Verification Plane

- command-based verifiers
- policy checks
- artifact diff / replay checks

## 当前最值钱的部分

- 清楚的状态边界
- 可追踪事件日志
- 可回滚自治优化迭代
- 不依赖 agent 自觉的停止机制
