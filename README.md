# Codex Multi-Agent Framework

更新时间：2026-03-17

## 0. 第一版实现状态

仓库现在已经有一个可运行的 v1 控制面实现，对应 README 里定义的最小范围：

- `Process Layer` 的四个 gate
- `State Layer` 的最小持久化结构
- `Execution Layer` 的最小 `Orchestrator + Worker + Verifier + Watcher`
- 普通模式 / 自治优化模式
- 结构化事件与证据日志
- CLI、examples、tests、配套 docs

快速开始：

```bash
node src/cli.mjs run examples/tasks/normal-mode-demo.json
node src/cli.mjs run examples/tasks/autonomous-mode-demo.json
node tests/framework.test.mjs
```

运行时状态默认写入：

```text
.codex-framework/
```

配套文档：

- `docs/framework-overview.md`
- `docs/process-layer.md`
- `docs/state-layer.md`
- `docs/execution-layer.md`
- `docs/domain-skills.md`
- `docs/evaluation-and-stopping.md`
- `docs/production-architecture.md`
- `docs/roadmap.md`

## 1. 项目定义

这个项目的目标，不是再做一个“很多 agent 一起聊天”的演示系统，也不是把最新论文里的 MAS runtime 原样搬进来。  
它要解决的是更具体的问题：

- 让 Codex 类代码代理在复杂任务中稳定分工
- 让任务经过设计、计划、执行、验证、停止这条受控流水线
- 让系统能够恢复、追踪、回放、审计
- 让系统在用户授权时进入自治优化，而不是默认无限迭代
- 让这套机制最终能走向生产，而不是停留在实验 prompt

一句话概括：

> 这不是“多智能体聊天框架”，而是“面向代码代理的受控执行框架”。

## 2. 这次更新是基于什么改的

这份 README 现在同时吸收了两类输入：

### 2.1 研究材料

来自 `E:\ProjectFolder\multi-agent` 里已有文档的主线：

- `multi_agent_literature_review_2026-03-11.md`
- `cross_agent_context_fidelity_literature_reframed_2026-03-13.md`
- `minimum_reading_map_2026-03-13.md`
- `framework_published_manifest_2026-03-13.md`

这些材料给出的共识是：

- 编排是核心变量
- 记忆系统比长上下文更重要
- 通信结构和通信预算必须显式建模
- 信息损失不能只看最终答案
- 统一 benchmark 仍然稀缺

### 2.2 skill 通读结果

来自 `E:\ProjectFolder\multi-agent\skill-research\skill-readthrough-2026-03-17.md` 的结论：

- `brainstorming` 提供设计前置门
- `writing-plans` 提供计划门
- `planning-with-files` 提供磁盘化状态与 session recovery
- `systematic-debugging` 提供根因优先规则
- `verification-before-completion` 提供证据门
- `dispatching-parallel-agents` 提供并行条件判断
- `ralph-wiggum` 提供 fresh-context worker 思路
- `skill-creator` 提供 skill 分层方法论

这次更新的核心变化是：

> 之前的 README 更偏“为什么要做”；现在的 README 改成“这个框架该怎么组织、哪些流程必须变成系统机制”。

## 3. 修正后的核心立场

## 3.1 不直接照搬研究型 MAS runtime

论文里的 MAS 系统经常擅长：

- 动态拓扑
- 角色协作
- 通信压缩
- benchmark 提分

但真正落到 Codex 和生产环境，先要回答的是：

- 谁能调度，谁不能调度
- 状态写在哪里，什么时候恢复
- 什么情况下允许并行
- 什么情况下必须停
- 谁来判定“完成”
- 谁来独立验证“完成”

所以这个项目的基本立场是：

- 用**可控编排**做骨架
- 用**skill 级工作流约束**做行为层
- 用**持久化状态与验证门**做可靠性层
- 用**领域能力模块**做叶子执行器

## 3.2 不再把语言栈预设成 Python

这个仓库不应默认写成“Python 项目 = 用 `uv` 初始化”。

更准确的规则是：

- 如果某个子模块选择 Python，那么默认用 `uv`
- 但框架整体的语言与运行时选择，必须由生产要求决定

决定栈时优先看：

- 吞吐与尾延迟
- 并发模型
- 状态持久化方式
- 部署目标
- 运维与观测成本

换句话说：

`uv` 是 Python 子模块的默认工具链，不是整个框架语言决策的依据。

## 4. 这个框架最重要的 7 条原则

1. **默认单代理，复杂度足够高时才升级为多代理**
2. **设计、计划、执行、验证必须分层，不能混成一个大 prompt**
3. **共享状态，不共享全量上下文**
4. **没有根因，不允许修 bug**
5. **没有新鲜验证证据，不允许宣称完成**
6. **并行只发生在真正独立的问题域上**
7. **停止条件必须是系统机制，不是 agent 自觉**

这 7 条里，前 5 条几乎都能在刚读完的 skill 体系里找到对应来源。

## 5. 新版框架结构：四层模型

基于这次 skill 通读，README 的主结构不再围绕“角色名”，而改为围绕“层”。

## 5.1 Process Layer

这是整个系统最关键的一层。  
它不直接产出代码，它决定**什么时候允许进入下一步**。

建议包含四个门：

### 1. Design Gate

来源：`brainstorming`

职责：

- 判断任务是否需要先做设计
- 当需求太大时先拆子项目
- 在复杂任务中先形成 spec 或设计摘要
- 未过设计门前，不允许直接进入实现

建议规则：

- 仅对高不确定度、多文件、多阶段任务强制启用
- 小任务允许跳过完整 spec，只保留简短设计结论

### 2. Planning Gate

来源：`writing-plans`

职责：

- 把设计转成可执行计划
- 把任务压成可验证、可交接、可追踪的步骤
- 锁定文件边界、依赖关系、验证命令、验收条件

这层的重点不是“列 Todo”，而是把执行意图变成结构化计划。

### 3. Debugging Gate

来源：`systematic-debugging`

职责：

- 当任务性质是 bug / failure / regression 时强制先做根因分析
- 没完成根因调查前，不允许给 fix
- 3 次以上修复失败就升级成架构问题讨论

### 4. Verification Gate

来源：`verification-before-completion`

职责：

- 没有新鲜验证结果，不允许声称成功
- 所有“已完成 / 已修复 / 已通过”都必须带证据
- 验证命令必须与当前任务绑定，而不是凭经验判断

---

## 5.2 State Layer

这一层吸收的是 `planning-with-files` 和研究材料里关于记忆系统的结论。

### 目标

- 把运行状态从上下文窗口中解耦
- 让系统可以恢复、回放、交接
- 让 agent 读到的是正确粒度的状态，而不是全量历史

### 建议拆分

`Run State`

- 当前执行图节点
- 当前 phase / iteration
- 最近一次工具结果
- 中断点与恢复点

`Working Summary`

- 当前任务所需的压缩上下文
- 只保留继续执行必要的信息

`Findings / Evidence Log`

- 外部证据
- 关键发现
- 调查结果
- 验证输出

`Project Memory`

- 当前仓库长期偏好
- 已知坑点
- 项目级规则
- 自治优化模式是否启用

`Cross-Project Learnings`

- 对接 `E:\codex\.learnings\`
- 记录通用 best practice、错误、能力需求

### 重要边界

从 `planning-with-files` 学到的最重要一条不是“三文件模式”，而是：

> 自动重读的状态文件不能混入未经净化的外部内容。

所以这个框架里必须区分：

- 计划/状态
- 外部证据
- 原始日志

不要把 web / API / 文档原文直接塞进高优先级状态文件。

---

## 5.3 Execution Layer

这一层决定“谁来干活、如何并行、如何收敛”。

### 建议的执行角色

`Orchestrator`

- 系统唯一正式推进器
- 驱动状态机 / 执行图
- 负责切换 gate、调度 worker、控制停止

`Planner`

- 输出任务图
- 设定依赖和验收条件

`Router`

- 决定该串行、并行、层级还是混合执行
- 只在独立问题域上启用并行

`Worker`

- 执行具体子任务
- 默认不拥有继续扩张系统的权限

`Fresh-Context Worker`

- 来源：`ralph-wiggum`
- 用于长链自治任务或高污染任务
- 每轮从新上下文启动，但共享磁盘状态

`Verifier`

- 独立检查某轮结果是否满足要求
- 不信任 worker 的自报成功

`Watcher`

- 跟踪进度、失败模式、平台期
- 决定是否继续、暂停、升级给人

### 并行规则

从 `dispatching-parallel-agents` 吸收的核心规则：

- 只有当两个问题域不共享状态、没有顺序依赖、不会编辑同一批关键文件时，才应该并行
- 并行 agent 不应继承主会话的完整历史
- 主会话只负责协调、审查、集成

这条规则非常适合 Codex，尤其适合你之前强调的“自动工作，但要可控”。

---

## 5.4 Domain Skill Layer

这一层负责具体专长，不负责主流程。

典型例子：

- `frontend-design`
- `markitdown`
- `git-commit`
- `github-pr-*`

它们的作用是：

- 提供某类任务的高质量执行偏置
- 约束本领域输出
- 降低某类高频动作的犯错率

这一层必须是**叶子层**，不能反过来接管主流程。

从 `frontend-design` 可以学到：

- 少量强约束能显著改变输出质量

从 `markitdown` 可以学到：

- 外部工具能力适合封成轻量 skill
- skill 需要清楚声明边界、依赖和入口

从 `dev-agent-skills` 可以学到：

- 很多高频工程动作适合做成窄技能，而不是交给大一统 agent 自己发挥

## 6. 从 skill 研究反推出来的真正系统骨架

如果把这些 skill 抽象成系统图，得到的不是“很多 skill 并列”，而是下面这个结构：

```text
User / Task Ingress
        |
        v
Task Classifier
        |
        v
Process Layer
  ├── Design Gate
  ├── Planning Gate
  ├── Debugging Gate
  └── Verification Gate
        |
        v
State Layer
  ├── Run State
  ├── Working Summary
  ├── Findings / Evidence
  ├── Project Memory
  └── Cross-Project Learnings
        |
        v
Execution Layer
  ├── Orchestrator
  ├── Planner
  ├── Router
  ├── Worker Pool
  ├── Fresh-Context Workers
  ├── Verifier
  └── Watcher
        |
        v
Domain Skill Layer
  ├── Frontend
  ├── Docs / Conversion
  ├── Git / PR
  └── Experiment / Benchmark
```

这比旧版 README 里单纯按 `Planner / Router / Verifier / Watcher` 列角色更准确。  
因为现在已经明确：

- 角色只是执行层的一部分
- 真正让系统可靠的，是 process layer 和 state layer

## 7. 运行模式

## 7.1 普通模式

默认模式。

特点：

- 优先直接完成任务
- 复杂度不足时不升级多代理
- 不做无边界搜索
- 不做长时间自动优化

## 7.2 自治优化模式

这部分继续遵守你已经明确的全局规则：

- 项目级 opt-in
- 第一次进入项目时问一次
- 没开启前就保持普通模式

开启后：

- 先建立 baseline
- 定义主指标和评估过程
- 明确 mutable files、日志路径和停止条件
- 小步迭代，只保留改进或等价简化

默认停止条件继续沿用现有规则：

- 已建立 baseline
- 已完成至少一轮改进和一轮细化
- 连续 8 次有效迭代无明显提升
- 连续 3 次 crash/fix 失败
- 时间或算力预算耗尽
- 用户中断

## 8. 生产环境优先级

既然这个框架最终要落到生产，就不应该先问“多智能体炫不炫”，而应该先问下面这些问题：

1. 能不能恢复
2. 能不能观测
3. 能不能验证
4. 能不能中断
5. 能不能停止
6. 能不能审计
7. 最后才是吞吐和延迟

所以生产环境下真正的优先级是：

- **正确性与可控性**
- **恢复与观测**
- **成本与性能**

不是反过来。

## 8.1 性能应该先看哪里

多智能体系统的性能瓶颈，往往首先不在语言，而在：

- 模型调用延迟
- 工具 / API I/O
- agent 之间的重复推理
- 状态读写与恢复
- 无效迭代
- 验证与回放成本

所以生产优化第一阶段不该先纠结“Python 还是 Go”，而应该先把这些指标打出来。

## 8.2 语言与运行时选择原则

推荐按层决策，而不是整仓统一绑定某一门语言：

- 控制面：
  适合做状态机、编排、策略、人工接管
- 执行面：
  适合做高并发 worker、消息路由、热路径执行
- 能力面：
  适合承接 Python 生态、模型工具、评测脚本、文档处理

更具体一点：

- 如果某个能力模块天然依赖 Python 生态，就用 Python，并默认 `uv`
- 如果某部分是高并发和低延迟热路径，就优先考虑 Go 或 Rust
- 如果某部分要强恢复和长流程协调，就优先选可持久化工作流 / 状态机方案

这个 README 不再预设整仓一定是 Python。

## 9. 第一版应该做什么，不做什么

## 9.1 第一版要做

- Process Layer 的四个 gate
- State Layer 的最小持久化结构
- Execution Layer 的最小 `Orchestrator + Worker + Verifier + Watcher`
- 普通模式 / 自治优化模式
- 结构化消息
- 可追踪的验证与停止闭环

## 9.2 第一版不要做

- 完全去中心化 agent 网络
- latent / KV 通信
- 大而全 benchmark 平台
- 大而全 skill marketplace
- 复杂社会仿真
- 过度依赖 magic phrase 的自治循环

第一版的目标不是“功能看起来多”，而是“框架骨架正确”。

## 10. 推荐的文档框架

既然 README 已经被重新定位为总蓝图，后续仓库文档建议按下面结构展开：

```text
docs/
  framework-overview.md
  process-layer.md
  state-layer.md
  execution-layer.md
  domain-skills.md
  evaluation-and-stopping.md
  production-architecture.md
  roadmap.md
```

每个文档各自回答一个问题：

- `framework-overview.md`
  - 这套系统要解决什么问题
- `process-layer.md`
  - 哪些 gate 存在，何时触发，谁能通过
- `state-layer.md`
  - 状态怎么存，怎么恢复，什么可以自动重读
- `execution-layer.md`
  - 哪些角色存在，谁有调度权，谁没有
- `domain-skills.md`
  - 哪些叶子能力可接入，边界是什么
- `evaluation-and-stopping.md`
  - 如何验证、如何判断平台期、如何停止
- `production-architecture.md`
  - 控制面、执行面、观测面如何部署
- `roadmap.md`
  - v1/v2/v3 各做什么

## 11. 最后的压缩结论

基于研究材料和 skill 通读，这个项目现在应该坚持下面 6 句话：

1. 多智能体不是多个 agent 同时说话，而是带 gate 的受控执行链。
2. 主框架要先解决流程和状态，再谈角色和并行。
3. 没有设计门、计划门、调试门、验证门，系统就会失控。
4. 没有持久化状态和恢复机制，长任务自治不可靠。
5. 没有 verifier 和 watcher，agent 的“完成”不可信。
6. 领域 skill 应该做成叶子能力，而不是反过来接管主流程。

如果把这 6 句话守住，这个仓库会更像一个真正能进生产的 Codex 多智能体框架，而不是一个研究概念或 prompt 拼装品。
