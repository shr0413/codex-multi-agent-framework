# Codex Multi-Agent Framework Checkpoint

更新时间：2026-03-17

## 本次对话的核心目标

围绕 `E:\ProjectFolder\multi-agent` 里的研究资料，逐步收敛出一个适用于 Codex 的多智能体框架方向，并整理为后续可直接继续推进的项目状态。

## 已完成事项

### 1. Codex 全局规则相关

- 已确认 Python 默认规则：
  - 对未来 **Python 项目** 默认使用 `uv`
  - 共享 `uv` 资产目录固定在 `E:\codex\backage`
- 已确认自治优化模式规则：
  - **项目级 opt-in**
  - 首次进入新项目时先问：`这个项目是否开启自治优化模式？`
  - 当前这个 multi-agent 项目：**未开启**

### 2. 对 `E:\ProjectFolder\autoresearch\autoresearch` 的启发

- 用户希望把其“自动工作、自动迭代优化、到最优结果再停止”的思路迁移到 Codex 规则
- 最终落地为：
  - 自治优化模式只在项目级明确开启后才进入
  - 开启后自动 baseline -> iteration -> plateau stop
  - 不再每轮确认

### 3. 对“最新多智能体系统框架”的判断

结论不是直接照搬最新论文 runtime，而是：

- 用 **可控编排** 做骨架
- 把研究里的动态拓扑、通信预算、上下文保真、监督与停止机制转成规则
- 对 Codex 更适合的主方向是：
  - 图式 / 状态机式 orchestrator
  - process gates
  - persistent state
  - verifier / watcher

### 4. `E:\ProjectFolder\multi-agent` 研究整理

已创建目录：

- `E:\ProjectFolder\multi-agent\codex-multi-agent-framework`
- `E:\ProjectFolder\multi-agent\skill-research`

已写入文档：

- `E:\ProjectFolder\multi-agent\codex-multi-agent-framework\README.md`
- `E:\ProjectFolder\multi-agent\skill-research\README.md`
- `E:\ProjectFolder\multi-agent\skill-research\skill-readthrough-2026-03-17.md`

### 5. skill 研究结果

已通读并整理以下条目：

- `planning-with-files`
- `superpowers`
- `brainstorming`
- `ralph-wiggum`
- `skill-creator`
- `frontend-design`
- `markitdown`
- `dev-agent-skills`

关键结论：

- 最值得迁移到 Codex 的不是“具体某个 skill”，而是这套组合：
  - `brainstorming` 的设计门
  - `writing-plans` 的计划门
  - `planning-with-files` 的持久化状态
  - `systematic-debugging` 的根因优先
  - `verification-before-completion` 的证据门
  - `dispatching-parallel-agents` 的独立问题域并行规则
  - `skill-creator` 的 skill 分层方法

### 6. README 已重构

`E:\ProjectFolder\multi-agent\codex-multi-agent-framework\README.md` 已经从旧版“研究综述 + 角色列表”改成新版“框架蓝图”，主结构变为：

- `Process Layer`
- `State Layer`
- `Execution Layer`
- `Domain Skill Layer`

并且已经明确：

- 不再把整仓默认写成 Python
- `uv` 只在子模块决定使用 Python 时作为默认工具链
- 生产环境优先级是：
  - 正确性 / 可控性
  - 恢复 / 观测
  - 成本 / 性能

## 当前项目的核心设计结论

### 一句话定义

这不是“多智能体聊天框架”，而是“面向代码代理的受控执行框架”。

### 建议的四层结构

1. `Process Layer`
   - Design Gate
   - Planning Gate
   - Debugging Gate
   - Verification Gate

2. `State Layer`
   - Run State
   - Working Summary
   - Findings / Evidence
   - Project Memory
   - Cross-Project Learnings

3. `Execution Layer`
   - Orchestrator
   - Planner
   - Router
   - Worker Pool
   - Fresh-Context Workers
   - Verifier
   - Watcher

4. `Domain Skill Layer`
   - frontend
   - docs / conversion
   - git / pr
   - experiment / benchmark

### 不建议直接照搬的点

- `superpowers` 的“1% 可能适用就必须先 skill check”
- `ralph-wiggum` 的危险高自治默认
- `planning-with-files` 的每次工具调用前强制重读 plan
- 把整个项目直接预设成 Python

## Git / GitHub 当前状态

本地仓库目录：

- `E:\ProjectFolder\multi-agent\codex-multi-agent-framework`

当前状态：

- 已初始化 git 仓库
- 默认分支：`main`
- 已完成首个提交：
  - commit: `33ad58c`
  - message: `docs(framework): add initial Codex multi-agent README`

远端已预设：

- `origin -> git@github.com:shr0413/codex-multi-agent-framework.git`

GitHub 认证状态：

- SSH 已验证成功
- 当前可用 GitHub 账号：`shr0413`
- 使用的 key：`C:/Users/1/.ssh/github_codex_fresh`

当前阻塞点：

- GitHub 上 **还没有创建空仓库**
- 因此还没有执行最终推送

## 下次继续时的最短接续方式

如果下次要继续，只需要从这里开始：

1. 先读：
   - `E:\ProjectFolder\multi-agent\codex-multi-agent-framework\README.md`
   - `E:\ProjectFolder\multi-agent\skill-research\skill-readthrough-2026-03-17.md`
   - 本文件

2. 如果用户已在 GitHub 创建空仓库 `shr0413/codex-multi-agent-framework`，下一步直接执行：

```bash
git -C E:\ProjectFolder\multi-agent\codex-multi-agent-framework push -u origin main
```

3. 如果还没建仓库，则先提醒用户在 GitHub 上创建空仓库，再推送

## 用户偏好与本项目上下文

- 当前项目 **不启用** 自治优化模式
- 用户更关注：
  - 自动工作
  - 自动迭代优化
  - 生产可用
  - 执行性能
  - 可控停止
- 用户已经明确指出：
  - 不要把全局 Python 默认规则误用到整个框架架构决策上

