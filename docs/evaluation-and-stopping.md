# Evaluation And Stopping

## 普通模式

- 执行完 plan 后做一次 run-level verification
- 没有 fresh evidence 就不能完成

## 自治优化模式

### 必须项

- baseline 先测
- metric 明确
- evaluation command 明确
- mutable file set 明确

### 当前循环

1. 先跑 baseline
2. 对每个 iteration：
   - 先快照 mutable files
   - 执行 iteration plan
   - 重新测 metric
   - 只保留提升，或显式允许的等价结果
   - 否则回滚

### 默认停止条件

- 连续失败达到阈值
- 连续无提升达到阈值
- iteration 列表耗尽

## 第一版没有做的事

- 自动生成候选 patch
- 自动搜索巨大策略空间
- 自动改 benchmark harness
