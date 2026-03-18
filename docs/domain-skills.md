# Domain Skills

第一版没有把领域 skill marketplace 做进来，只保留了接入口。

## 当前策略

- 主框架只负责流程、状态、执行、验证、停止
- 领域能力暂时通过 worker step 类型和 shell command 接入

## 第一版的叶子能力映射

- 文档/说明类：`note`
- 文件生成类：`write_file`
- 增量改写类：`append_file`
- 外部工具类：`shell`

## 下一步扩展方式

- 给 worker pool 增加 skill-aware executors
- 在 task schema 里加入 skill selector
- 把 skill 的输入/输出也纳入 evidence log
