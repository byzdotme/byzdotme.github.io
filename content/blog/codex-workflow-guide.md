---
title: Codex 实战指北：从入口、权限到高效工作流
date: 2026-06-18
category: AI/LLM
tags: [Codex, AI编程, 开发工具, 工作流]
---

# Codex 实战指北：从入口、权限到高效工作流

第一次认真用 Codex，很容易把它当成“另一个更会写代码的聊天框”。这会低估它，也会误用它。

Codex 更像一个有多种执行面的 coding agent：它可以在本地终端陪你改代码，可以在 CI 里非交互跑检查，可以在云端长时间处理任务，也可以在 GitHub PR 里像队友一样做 review。你真正要学的不是某个神奇 prompt，而是：**在什么场景下，把 Codex 放到什么执行面里，给它什么权限和边界。**

这篇先从日常最有用的部分讲起：入口选择、权限与沙箱、模型与推理强度、`codex exec`、云端任务，以及一套可以直接照着用的工作流。

## 1. 先选执行面：别拿锤子拧螺丝

Codex 至少有五类常见入口：

| 入口 | 运行位置 | 适合场景 |
|------|----------|----------|
| `codex` CLI / TUI | 本机仓库 | 日常编码、查 bug、改小需求、跑测试 |
| `codex exec` | 本机或 CI | 非交互 review、日志分析、批量检查 |
| IDE extension | 编辑器里 | 边写边问、从 IDE 派发任务 |
| Codex cloud | OpenAI 托管环境 | 长任务、并行任务、独立 branch、离线跑 |
| GitHub `@codex` | PR / issue 上下文 | `@codex review`、修 CI、处理 review 评论 |

我的经验是：**你需要实时纠偏，就用本地 CLI；任务边界清晰但耗时长，就丢给 cloud；需要脚本化输出，就用 `codex exec`。**

比如“帮我理解这个支付状态机为什么会卡住”，最好在本地 CLI 里做，因为你可能随时补充日志、打断方向、选择假设。相反，“把这个 PR 的 CI failure 修掉，并开一个小 PR”，很适合 Codex cloud，因为目标、上下文和验收条件都比较明确。

**小结：** Codex 不是单一工具，而是一组执行面。选对入口，任务已经成功了一半。

## 2. Approval × Sandbox：决定 Codex 的行动半径

让 Codex 动手前，先问两个问题：

1. 它能不能写文件？
2. 它执行高风险命令时需不需要问你？

这就是 sandbox 与 approval 的组合。

| 场景 | 推荐姿势 |
|------|----------|
| 调研 / review | `read-only`，只读更稳 |
| 日常开发 | `workspace-write` + 按需审批 |
| CI 非交互检查 | `read-only` + 不弹交互审批 |
| 受控容器里的自动修复 | 可考虑 `workspace-write`，仍要限制网络和 secrets |
| 普通本机开发 | 不建议默认 `danger-full-access` |

可以把它想成给实习生配门禁卡：查资料给只读卡，改当前项目给工作区卡，生产机万能卡几乎永远不该随手发。

一个比较稳的本地默认配置是：工作区可写，默认不开放网络，遇到越权行为再让 Codex 申请。这样它可以正常编辑仓库、跑测试，又不至于悄悄访问外部系统或乱动仓库外文件。

**小结：** 权限不是麻烦，是 Codex 的安全带。越是自动化，越要把 sandbox 和 approval 写清楚。

## 3. 模型与 reasoning：别把所有任务都开到最贵档

Codex 的质量、速度和成本通常由三类旋钮影响：

- `model`：主模型
- `review_model`：review 场景可单独设置
- `model_reasoning_effort`：推理强度

实战上可以这样粗分：

| 任务 | 推荐思路 |
|------|----------|
| 普通实现、补测试、局部重构 | 默认推荐模型 + medium |
| 架构设计、复杂 bug、并发一致性 | 更强模型 + high / xhigh |
| 大量只读探索、摘要、扫文件 | 更快更便宜的模型，配 subagent |
| PR review | review 模型比实现模型略高一档 |

不要把所有任务都开到最高推理档。高 reasoning 很像请资深架构师开长会：关键决策值，改文案和小测试就不值。

具体模型名和可用档位会随 Codex 版本变化，所以不要把旧教程里的模型清单当圣经。日常以 `codex --help`、TUI `/help`、`/model` 和官方文档为准。

**小结：** 模型和 reasoning 是预算控制工具。日常 medium，难题再升档，才是长期可持续的用法。

## 4. `codex exec`：把 Codex 变成脚本里的工程同事

交互式 CLI 适合陪跑，`codex exec` 适合自动化。它的特点是：不开 TUI，直接跑一个 prompt，把最终输出交给 stdout，适合接在 shell、CI、cron 后面。

几个典型用法：

```bash
codex exec "summarize the repository structure and list risky areas"
```

```bash
git diff origin/main...HEAD | codex exec \
  --sandbox read-only \
  "Review this diff as a senior engineer. Findings first."
```

```bash
npm test 2>&1 | codex exec \
  "Summarize the failing tests and suggest the smallest likely fix"
```

如果下游要机器消费，可以用 JSONL 或 schema 输出。比如自动 triage issue、生成 release notes、把 CI log 总结成 PR 评论，这些都比“人在浏览器里复制粘贴”稳定得多。

但 CI 里有一条红线：**不要把个人登录态或长期 token 暴露给不受信任的仓库代码。** 依赖安装脚本、测试脚本、第三方 action 都可能读环境变量。自动化环境里要把 API key 的暴露范围压到最小，能只读就只读。

**小结：** `codex exec` 的价值不是“无人值守写代码”，而是把 Codex 的分析能力接进现有工程流水线。

## 5. Codex cloud 与 GitHub `@codex`：边界清晰时再放手

云端任务适合这些场景：

- 任务超过 30 分钟，不想本机守着
- 需要在独立 branch 上完成并开 PR
- 修 CI、回应 review、补测试这种 PR 闭环任务
- 大范围迁移、扫仓、文档整理
- 本机环境不适合跑，云端环境更干净

不适合这些场景：

- 需求还没说清楚
- 高风险改动需要你实时盯着
- 需要本机私有凭据，但云端环境没配置
- “帮我优化一下项目”这种没有边界的任务

云端任务的 prompt 要像一张清晰工单：

```text
目标：修复 billing 模块 CI 中的 flaky test。

上下文：
- 当前 PR：<link>
- 失败 job：<link>
- 相关目录：services/billing/**

约束：
- 不要重构 payment gateway
- 不要修改 public API
- 如果根因不清楚，先汇报

验收：
- 相关测试连续运行 3 次通过
- 给出根因说明
- 开 PR 或推到当前任务 branch

停止条件：
- 60 分钟内没有明确根因就停止，并汇报已排除的假设。
```

在 GitHub 里，`@codex review` 是 review 任务，其它 `@codex <task>` 更像派发一个云端任务。想让 review 更准，需要把 review 准则写进 `AGENTS.md`，比如只报真实风险：bug、安全、数据丢失、并发、测试缺口，而不是纯风格偏好。

**小结：** 云端 Codex 适合“边界清楚、验收明确、可以异步完成”的任务。越远离你的实时控制，任务描述越要具体。

## 6. 一套日常工作流

### 新需求

```text
1. 新开干净会话或 worktree
2. 描述需求，引用相关目录
3. 要求 Codex 先读 AGENTS.md 和相关文件，只给计划
4. 你 review 计划，补约束
5. Codex 分步实现，每步后跑最小测试
6. Codex 自查 diff
7. 你跑最终验证
8. 让 Codex 基于 diff 写 commit message 草稿
```

关键是第 3 步：**先计划，再动手。** 计划不需要很长，但必须包含涉及文件、风险点、测试计划和实现顺序。Codex 最容易出问题的地方，往往不是写不出代码，而是一开始就理解错影响半径。

### 查 bug

```text
1. 用 read-only 启动
2. 贴完整错误、复现步骤、近期 diff
3. 让 Codex 先给 3 个根因假设
4. 每个假设必须有证据、反证、最小验证方法
5. 你选最像的假设
6. 再切到可写，做最小修复和回归测试
```

这和资深工程师自己查 bug 的方式一样：先缩小假设空间，再验证。不要一上来就说“修一下”，那是在鼓励模型猜。

### PR review

```bash
git diff origin/main...HEAD | codex exec --sandbox read-only \
  "Review this diff. Findings first, ordered by severity.
   Focus on correctness, security, data loss, concurrency, and test gaps."
```

如果在 GitHub 上，就用 `@codex review`，并确保仓库有明确的 review guidance。

**小结：** 高效用 Codex 的本质，是把你的工程节奏显式化：先读、先计划、再执行、再验证。

## 总结

Codex 的核心不是“更会写代码”，而是它把 coding agent 放进了多个工程入口：本地 CLI、IDE、CI、云端、GitHub PR。你要做的，是给每个入口配好边界。

记住四句话：

1. **选对执行面**：本地陪跑，云端长跑，`exec` 自动化，GitHub 做 PR 闭环。
2. **权限先行**：sandbox 和 approval 是安全带，不是打扰。
3. **预算可调**：普通任务 medium，难题再升 reasoning。
4. **流程显式化**：先计划、再实现、再验证，别让 Codex 猜你的工程判断。

工具会迭代，命令会变化，但这套工作流很稳定。把它练成肌肉记忆，Codex 才会从“偶尔惊艳的助手”变成“每天可靠的工程搭档”。

[返回博客列表](/blog/)
