# State Layer

## 状态目录

默认写在：

```text
.codex-framework/
  memory/
  runs/<run-id>/
```

## 每次运行写出的内容

- `run-state.json`
  - phase
  - status
  - 当前节点
  - step 状态
  - watcher 状态
- `task-snapshot.json`
  - 本轮运行使用的任务定义
- `working-summary.md`
  - 人类可读压缩上下文
- `events.jsonl`
  - 结构化运行事件
- `evidence.jsonl`
  - metric 与 verification 证据

## 长期状态

- `memory/project-memory.json`
  - 项目级偏好
  - 自治优化默认开关
- `memory/cross-project-learnings.json`
  - 外部 learnings 根路径引用
  - 只存净化后的引用，不直接塞原始内容

## 当前恢复能力

- `resume <run-id>` 会读取 `task-snapshot.json` 和 `run-state.json`
- 已完成步骤不会重复执行
- 自治优化模式会跳过已接受/已回滚/已失败的 iteration
