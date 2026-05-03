---
title: Claude Code 实战指北：从命令到工作流的效率密码
date: 2026-05-03
category: AI/LLM
tags: [Claude Code, AI编程, 开发工具, 工作流]
---

# Claude Code 实战指北：从命令到工作流的效率密码

用 Claude Code（后称 CC）的第一个月，最容易犯的错误不是"用不好"，而是"把它当 ChatGPT 用"。

ChatGPT 是你问它答，CC 是它会真的改你的代码、跑你的命令、操作你的文件系统。把脑中的问题描述清楚丢给它，它自己能 Read → Edit → Bash → 验证，一条龙跑完。但前提是：**你得知道怎么驾驭它**。

这篇从最核心的命令讲起，覆盖模型调度、Plan 模式、Thinking 机制和日更工作流——读完你 80% 的日常操作都能脱手完成。

## 1. 四种输入前缀：决定"走哪条路"

CC 的输入框看似简单，但前缀是关键路由：

| 前缀 | 作用 | 例子 |
|------|------|------|
| `/` | 斜杠命令或 Skill：调用内建命令 | `/clear`、`/compact`、`/review` |
| `@` | 文件/目录引用：把内容注入上下文 | `@src/server.ts`、`@docs/` |
| `!` | 直接执行 shell，不走 Agent 推理 | `!git status`、`!pnpm test` |
| 无前缀 | 自然语言任务，交给 Agent | "把 X 模块的日志改成结构化日志" |

一个容易被忽略的技巧：`!` 跑出来的结果会自动进入上下文，比让 Agent "跑一下 git status" 省一次工具调用往返。

## 2. 真正每天都会用的命令（按频次排序）

### 会话管理

`/clear`（别名 `/reset`、`/new`）是最高频命令——换任务前必做，清空上下文但保留 CLAUDE.md。上下文是 CC 最贵的资源，上一个任务的残留不仅费 token，还会干扰后续判断。

`/compact [可选指令]` 用于任务还要继续但上下文快爆时。可以传指令指定保留什么，比如 `/compact 只保留对支付模块的决策`。

`/resume` 恢复历史会话（跨天长任务必备），`/branch` 从当前对话分叉做 A/B 探索，`/rewind` 则比 `git reset` 更稳——会话和工作区一起回滚。

`/cost` 在大改动前后各看一次，建立成本直觉。`/context` 可视化当前上下文占用，调预算时第一时间看。

### 模型与成本三轴

CC 给了三个独立的旋钮控制速度/成本/质量：

- **`/model`**：Opus 4.7（架构难题）→ Sonnet 4.6（日常实现）→ Haiku 4.5（批量简单任务）
- **`/effort low|medium|high|xhigh|max`**：任务级努力档，Opus 默认 xhigh，Sonnet 上限 max
- **`/fast`**：用 Opus 4.6 + 跳过部分推理特效，简单任务显著降本

**经验：写代码的活用普通模式，想"怎么写"的活用 thinking 模式。**

### 那些让你效率翻倍的非命令技巧

这些比很多命令都重要：

- **Esc**：方向跑偏立刻打断。比等它跑完再纠正便宜十倍。
- **双击 Esc**：回到更早一条消息，从那里分叉——等于"读档重来"。
- **Shift+Tab**：在六档 permission mode 间循环。
- **Ctrl+B**：把当前任务塞后台跑（`/tasks` 看进度）。
- **拖入图片**：架构图、报错截图、Figma 截图直接拖进终端，CC 会识别。
- **`\` + Enter**：多行输入（所有终端通用），粘长日志必备。

**小结：** 这些命令和快捷键是肌肉记忆级别的操作。玩熟之后，你会发现自己越来越少"等 CC 跑完才发现方向错了"——Esc 让纠偏成本趋近于零。

## 3. Thinking 关键字：最被低估的能力

任务描述里包含特定关键字，CC 会分配更多内部推理 token。注意这和 `/effort` 是两套机制——thinking 关键字调"单回合推理深度"，effort 调"任务级努力档位"，可叠加：

| 关键字 | 大致预算 | 适用 |
|--------|---------|------|
| `think` | ~4K tokens | 简单分析 |
| `think hard` | ~10K tokens | 中等复杂 |
| `think harder` / `ultrathink` | ~32K tokens | 架构设计、难 bug、并发问题 |

**取舍法则**：架构设计、并发/一致性问题 → `ultrathink` + `/effort xhigh`；普通重构、写单测 → 不加关键字，甚至可以开 `/fast`。思考越深越贵越慢，不是默认开越好。

**小结：** 把 thinking 关键字当成"深度开关"——只在真正需要推理深度的场景打开。日常编码任务不需要，省下的 token 比你想的多。

## 4. Plan 模式：资深工程师最该用起来的功能

进入方式：Shift+Tab 循环到 plan（最推荐），或 `/plan [task description]`。

进入 plan 模式后，CC 只能用 Read/Grep/Glob 等只读工具，产出一份结构化实施计划。你 review 完、纠正方向后，accept plan 才会真的进 Agent 模式改代码。

**什么任务必走 Plan 模式？**

1. 涉及 3 个以上文件或跨模块的改动
2. 有架构选型空间的（"加缓存"——Redis？进程内？这时该规划）
3. 你自己也没完全想清楚的需求
4. 对生产行为有影响的（迁移、回滚、schema 变更）

**反模式**：已经完全想清楚的一行代码改动也走 Plan 模式——纯浪费时间。

**小结：** Plan 模式是让 CC 从"码农"变成"架构师搭档"的关键功能。它强制 CC 先思考再动手，而你在它动手前还有一次纠偏机会——这比事后回滚高效得多。

## 5. 推荐的日更工作流

### 实现新需求

```
1. /clear                              # 干净上下文
2. 描述需求 + @相关目录 + "进入 plan 模式"
3. CC 产出计划 → 你 review、纠偏、补充约束
4. Accept plan → Agent 自动执行
5. 执行中：看到偏了立刻 Esc；需要补文档 @具体文件
6. 让它 /review 自查
7. !pnpm test && !pnpm lint            # 直接 shell 跑验证
8. 让 CC 基于 diff 写 commit message 草稿
9. /cost 记录成本，/clear 准备下个任务
```

### 查 Bug

```
1. /clear
2. 贴报错日志 + 复现步骤 + "ultrathink，先只分析不要改代码"
3. CC 输出若干根因假设 + 验证方法
4. 你选最像的 → "按假设 2 继续验证，允许读代码、跑测试，但不改代码"
5. 确认根因后："现在按最小改动修复，附带回归测试"
6. /review → 验证 → 提交
```

这套两段式（先假设 → 再验证）比直接让它修 bug 效果好得多。资深工程师自己查 bug 也是这么想的，只是把这个过程显式化给了 CC。

## 6. Headless 模式：把 CC 嵌入自动化

除了交互式，CC 还可以 `claude -p "<prompt>"` 以非交互方式跑，适合 CI、cron、pre-commit hook 等场景：

```bash
# 基础用法
claude -p "检查这段 diff 有没有引入 N+1 查询" --output-format stream-json

# CI 安全用法（限制工具和轮数）
claude -p "review 这个 PR 的安全问题" \
  --allowedTools "Read,Grep,Bash(git log:*)" --max-turns 5

# 极简启动（跳过所有扩展，脚本场景下显著快）
claude --bare -p "..."

# 预算护栏，超了直接退
claude -p --max-budget-usd 2.00 --max-turns 10 "..."
```

**安全红线**：headless 场景务必限制 `--allowedTools` 和 `--max-turns`，防止跑飞。`--dangerously-skip-permissions` 在生产/CI 严禁——社区有过事故，等价于把仓库写权限给 prompt 注入者。

**小结：** Headless 模式把 CC 从一个"交互式助手"升级为"可编程的工程能力"。CI review、自动打 label、告警分流——这些场景的 ROI 极高。

## 总结

三个核心认知：

1. **CC 是 Agent，不是 Chatbot**。它有一整套工具（Read/Edit/Bash/Grep/Task），你给它什么上下文、什么规则，它就在什么边界里干活。
2. **速度/成本/质量是三轴可调的**。`/model × /effort × /fast`，学会这三个旋钮比纠结 prompt 写法重要。
3. **Plan 模式 + Esc 中断 = 最小纠偏成本**。让 CC 先想再动手，走偏了立刻打断——这套节奏一旦形成，效率是指数级的提升。

命令会迭代，但这个三轴调度的思路不会变。把基础操作练成肌肉记忆，把思考留给架构决策。

[返回博客列表](./index)
