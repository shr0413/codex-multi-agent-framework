# Codex 多智能体框架

面向 Codex 风格代码代理的受控执行框架。

它把代码代理工作流组织成显式 gate、磁盘持久化状态和独立验证流程，而不是依赖脆弱的长上下文 prompt 循环。

文档：

- [框架总览](docs/framework-overview.md)
- [Process Layer](docs/process-layer.md)
- [State Layer](docs/state-layer.md)
- [Execution Layer](docs/execution-layer.md)
- [Evaluation and Stopping](docs/evaluation-and-stopping.md)

## 为什么做这个项目

很多多智能体演示更关注“多个 agent 一起说话”，但真正进入生产后，难点通常不在这里。真正困难的是让执行链条可控、可恢复、可验证。

这个项目聚焦的是控制面本身：

- 用 process gates 替代自由发散的 agent 循环
- 用持久化 run state 替代易失的上下文记忆
- 用独立验证替代 worker 自报完成
- 用显式停止机制约束自治优化

## 核心特性

- 内置 `Design Gate`、`Planning Gate`、`Debugging Gate`、`Verification Gate`
- 运行过程落盘保存 state、events、evidence 和 working summary
- 包含 orchestrator、router、worker pool、verifier、watcher 的最小执行运行时
- 支持基于任务快照和 run state 的断点恢复
- 提供两种执行模式：
  - 普通模式
  - 自治优化模式

## 快速开始

环境要求：

- Node.js `>=22`

运行普通模式示例：

```bash
node src/cli.mjs run examples/tasks/normal-mode-demo.json
```

运行自治优化模式示例：

```bash
node src/cli.mjs run examples/tasks/autonomous-mode-demo.json
```

运行测试：

```bash
node tests/framework.test.mjs
```

框架运行状态默认写入：

```text
.codex-framework/
```

## CLI 用法

运行一个任务文件：

```bash
node src/cli.mjs run path/to/task.json --project-root path/to/project
```

恢复一个历史运行：

```bash
node src/cli.mjs resume <run-id> --project-root path/to/project
```

查看某次运行的存档结果：

```bash
node src/cli.mjs show-run <run-id> --project-root path/to/project
```

仓库内置的任务示例：

- `examples/tasks/normal-mode-demo.json`
- `examples/tasks/autonomous-mode-demo.json`

## 工作方式

```text
Task Ingress
    |
    v
Process Layer
    |
    v
State Layer
    |
    v
Execution Layer
    |
    v
Domain Skill Layer
```

这套设计的优先级很明确：

> 先解决流程控制和状态边界，再扩展更强的 worker 与 domain skills

## 任务模型

框架消费的是 JSON 任务文件。

普通模式至少需要：

- task identity 和 title
- task kind
- complexity metadata
- 可执行计划
- verification rules

自治优化模式还需要额外提供：

- metric 定义
- evaluation procedure
- mutable file set
- 明确的 iteration 列表
- 至少一个 `improvement` 阶段
- 至少一个 `refinement` 阶段

## 这个项目是什么

这个项目是一个围绕“受控执行链”构建的小型框架：

1. 先识别任务类型
2. 通过对应的 gate
3. 由显式 worker 执行
4. 用新鲜证据完成验证
5. 按系统规则停止，而不是依赖 agent 自觉收手

它不是“很多 agent 聊天”的演示项目，也不是研究型多智能体 runtime 的直接翻版。

## 仓库结构

```text
src/
  cli.mjs
  index.mjs
  process/
  state/
  execution/
  shared/
docs/
examples/
tests/
framework.config.json
```

## 当前范围

v1 的边界是刻意收敛过的：

- 本地单进程控制面
- 内置 worker 类型仅包含 `note`、`write_file`、`append_file`、`shell`
- 不做分布式 runtime
- 不做 skill marketplace
- 不做超出显式自治迭代列表之外的自动策略搜索

v1 已实现：

- `Process Layer`
  - `Design Gate`
  - `Planning Gate`
  - `Debugging Gate`
  - `Verification Gate`
- `State Layer`
  - run state
  - project memory
  - evidence log
  - working summary
- `Execution Layer`
  - orchestrator
  - router
  - worker pool
  - verifier
  - watcher

## 路线图

下一步比较自然的扩展方向：

1. fresh-context worker 抽象
2. 更丰富的 worker / planner DSL
3. 更强的 resume 语义
4. 远程或分布式执行
5. 可观测性与策略层

## V1 非目标

- 完全去中心化的 agent 拓扑
- latent / KV 风格的 agent 通信
- benchmark 平台
- agent 社会化仿真
- 无约束自治循环

## 开发说明

- 框架文档保留在版本控制中
- 本地 checkpoint 文件属于私有工作流产物，默认不进入 GitHub 对外仓库内容
