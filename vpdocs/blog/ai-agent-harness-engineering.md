---
title: AI Agent 的工程化哲学：Harness 设计的核心原则
date: 2026-05-03
category: AI/LLM
tags: [AI Agent, Harness Engineering, LangGraph, 工程化, LLM]
---

# AI Agent 的工程化哲学：Harness 设计的核心原则

很多人第一次用 Claude Code 或 Cursor 时会有一种错觉：它好聪明，什么都能做。但用久了你会发现，这些产品真正厉害的地方**不是模型本身**——它们底层都接的是 Claude 或 GPT——**而是围绕模型搭建的那一套"脚手架"**。

这套脚手架在 AI 工程圈有个专门的词：**Harness（挽具）**。原意是套在马身上控制方向的工具，引申为围绕 LLM 构建的一切控制代码——决定什么时候调用模型、往上下文里塞什么、如何验证输出、失败时如何重试、如何保存状态以便中断后恢复。

LLM 是引擎，Harness 是把引擎装进车里的一切零件。

## 1. Context Engineering：每个 Token 都是预算

给 LLM 的输入要精确——这句话人人都同意，但落到实处是什么？

不是"把需求说清楚"就够了。Context Engineering 是一套完整的策展策略：

| 维度 | 实操 |
|------|-----|
| **System Prompt** | 角色、目标、约束、输出格式全部显式写明 |
| **Few-shot Examples** | 高质量示例比长篇规则更有效——模型模仿代码的能力远超按自然语言规范写代码 |
| **Tool Descriptions** | 描述要具体，举反例（"不要在 X 场景调用此工具"） |
| **Working Context** | 当前任务状态作为结构化 block 注入，而非混在对话历史里 |
| **Retrieved Context** | RAG 拉来的资料标注来源、时间、可信度 |
| **Negative Context** | 告诉模型**不要做什么**——经常比正向指令更有效 |

核心洞察：上下文窗口是稀缺资源，**每个 token 都应该为当前子任务服务**。反模式是把整个项目代码、整段对话历史、所有可能用到的工具一股脑塞进去——这叫 Context Stuffing，结果是信号被噪声淹没。

**小结：** 精确的输入不是"把话说清楚"那么简单，而是一套信息策展纪律。扔掉无关的，标注来源的，举例说明的，明确禁止的——四管齐下。

## 2. Workflow 与 Agent 的光谱：外层固定，内层自由

Agent 设计存在一个光谱：

```
纯 Workflow  ←──────────────────────→  纯 Agent
所有分支写死    预设骨架 + LLM 决策      完全自由的 ReAct 循环
可预测、可审计                           灵活、应对力强
容易调试                                 难调试、难预算
```

大型复杂任务的工程化原则很明确：**能用 workflow 表达的部分，就不要交给 Agent 自主决策。**

比如一个"代码 review → 测试 → 部署"的大任务：
- **宏观流程是 Workflow**（三阶段顺序固定，状态机表达）
- **每阶段内部的判断是 Agent**（LLM 决定看哪些文件、跑哪些测试）

这就是"相对固定的流程"的精确含义——**外层骨架固定，内层决策自由**。LangGraph 的 StateGraph 天然适合这种表达：StateGraph 定义 workflow 骨架，每个节点里可以是 Agent 子图。

**小结：** 把 Agent 当"万能自主决策者"是新手最容易犯的错误。高手的设计是：固定流程做骨架，Agent 能力填血肉。

## 3. Plan-Then-Execute：先规划，再动手

让 LLM 直接上手干活的失败率远高于先让它出计划。这在工业上叫 **Plan-Then-Execute 模式**：

```
输入
  ↓
阶段 1：Clarification（澄清）
  - LLM 反问用户，确认真实目标
  - 必要时 HITL（人工确认）
  ↓
阶段 2：Planning（规划）
  - 输出结构化任务列表
  - 每项含：描述、依赖、预期产物、验证方式
  ↓
阶段 3：Execution（执行）
  - 遍历任务列表，逐项执行
  - 每项完成后更新状态
  ↓
阶段 4：Consolidation（汇总）
  - 检查是否全部达成，整合输出
```

**一个关键点容易被忽略：Planning 阶段的输出应该是数据结构，不是自然语言。** 结构化的 plan 可以机器可读、可渲染进度条、支持 DAG 并行执行、中断恢复时精确定位到具体任务。

Claude Code 的 TodoWrite 就是 Plan-Then-Execute 的显式实现——它不是可有可无的辅助功能，而是复杂任务不跑偏的核心保障。

**小结：** 让 LLM 先出结构化计划，人 review 确认，再逐项执行。这 30 秒的"刹车"能省掉后面 30 分钟的回滚。

## 4. Verifier Loop：没有验证的 Agent 就是没有刹车的跑车

这是整个 Harness 设计中最关键也最容易被忽视的一条。LLM 会自信地胡说——只有客观的 Verifier 能拦住它。

AI coding 领域的验证手段分六级（由强到弱）：

| 验证强度 | 手段 | 可靠性 |
|---------|------|-------|
| **执行级** | 跑测试、编译、运行 | ★★★★★ |
| **静态分析** | TypeScript / lint / AST 检查 | ★★★★ |
| **Schema 级** | zod 校验输出结构 | ★★★★ |
| **LLM-as-Judge** | 另一个 LLM 评分 | ★★★ |
| **正则 / 字符串匹配** | 关键字出现检查 | ★★ |
| **无验证** | 信模型 | ★ |

工程实务：**每个子任务至少要有一个 Verifier**。失败时走"观察错误 → 修正 → 重试"的 Critic-Actor 循环。

但 Verifier 的价值不只是"成功/失败"的二元信号。**好的 Verifier 会返回结构化的失败原因**，让 LLM 能基于此修正：

```
❌ Bad verifier:  "测试失败"
✓ Good verifier:  "测试 'should return user id' 失败：
                   预期 'user-123'，实际 undefined。
                   可能原因：getUserById 未处理传入的 id 参数。"
```

TDD 是 Verifier Loop 最自然的实现——测试就是需求的可执行版本，红 → 绿 → 重构的节奏天然适配 Agent 的工作方式。

**小结：** Verifier 是 Agent 质量的天花板。执行级验证（跑测试、编译）是最可靠的，静态分析次之。每个子任务都必须配至少一个。

## 5. State is the Backbone：分层的状态管理

生产级 Agent 最核心的基础设施是状态管理。按粒度分四层：

- **任务级**：每个 subtask 的 status / result / errors
- **步级**：每次 LLM 调用的 input / output / tokens / latency
- **事件级**：每个 tool call 的参数、返回、耗时
- **会话级**：全局元信息（user_id、session_id、budget_used）

一个设计良好的 Agent State，打印出来应该能让一个新加入的工程师看懂"现在在干什么、干到哪一步了"。

中断恢复分三个层次：

1. **Crash Recovery**：程序崩了——checkpointer 存 Redis/Postgres，重启后加载
2. **Human Pause Recovery**：人工介入暂停——`interrupt()` + `resume`
3. **Long-task Resume**：跨天任务——每个子任务完成就持久化，避免重做

**小结：** 状态不只是技术细节，它是 Agent 的"记忆脊椎"。没有分层持久化状态的 Agent 只能处理五分钟内的任务——超出这个窗口，崩溃就等于归零。

## 6. 预算控制：给你的 Agent 戴上三个紧箍咒

Agent 容易"做得太久"——在循环里不断尝试、不断消耗 token。需要在三个维度设预算：

- **Token 预算**：累计 token 上限，超了就强制 summary 或放弃
- **Step 预算**：最多循环 N 次，对应 LangGraph 的 `recursionLimit`
- **Wall-time 预算**：墙钟时间上限，用 AbortSignal 实现

任一超出 → 走降级路径：部分交付、告知用户、或转交人工。**Agent 不怕失败，怕的是悄无声息地烧钱。**

**小结：** 这三个预算不是可选的 optimizations——它们是生产级 Agent 的安全带。开源 demo 和闭源产品之间最大的差距往往不在模型能力，在预算控制。

## 7. 错误是信号，不是终点

初级 Harness 遇到错误 → 重试相同操作（没用）  
中级 Harness 遇到错误 → 换参数重试  
**高级 Harness 遇到错误 → 让 LLM 看错误详情，重新规划**

把错误作为上下文的一部分喂回去，是 Agent 展现"智能"的关键场景。这不是简单的 retry——它需要 Harness 把 error message 结构化地注入到下一轮 LLM 调用的上下文中，让模型理解"刚才发生了什么、为什么会失败、现在该怎么调整"。

**小结：** Agent 的智能不在于不犯错，而在于犯了错之后能看懂错误信息并调整策略。这需要 Harness 把"错误 → 上下文 → 重新规划"这条链路做成标配。

## 8. 工具设计：少即是多

给 Agent 20 个工具 ≠ Agent 能做 20 种事。太多工具带来的问题：

- 稀释注意力——每个 turn 都要过一遍选择
- 相似工具混淆——`read_file` vs `load_file` 到底选哪个
- 描述互相干扰——tool A 的描述碰巧包含了 tool B 的触发词

原则：
- 单个 Agent 绑定的工具保持在 **10 个以下**
- 相似能力合并（一个 `file_operation` tool，用 `op` 参数区分读/写/删）
- 大工具集用**多 Agent 路由**（Supervisor 决定用哪个子 Agent，每个子 Agent 只带自己需要的工具）

**小结：** 工具设计的原则和函数设计一样——单一职责、少即是多。复杂的工具集不要扁平铺开，用 Agent 层级来组织。

## 9. Observability-First：不要接受黑盒

生产 Agent 必须从第一天就接 tracing。否则 debug 全靠运气。

推荐方案：
- **LangSmith**（LangChain 家族原生）——看每一步的 input/output/耗时
- **OpenTelemetry**（通用方案，能跟公司现有 Grafana/Datadog 整合）
- **自己的 event log**（最少要有这个——jsonl 格式，每行一个事件）

至少追踪：每次 LLM 调用的 prompt/tokens/latency、每次 tool call 的参数/返回/耗时、每个子任务的开始/完成/失败。

**小结：** "这个 Agent 为什么给出了这个答案？"——如果没有 tracing，这个问题你永远回答不了。

## 总结：九条原则背后的一个核心信念

Harness Engineering 不是什么神秘知识，它就是把这些工程常识搬到了 AI 场景里：

1. **Context Engineering** — 每个 token 都为当前子任务服务
2. **Workflow + Agent 混合** — 宏观写死，微观放开
3. **Plan-Then-Execute** — 先出结构化计划，再逐项执行
4. **Verifier Loop** — 每个子任务必须有客观验证
5. **Fine-grained State** — 分层持久化，支持任意粒度恢复
6. **Budget Control** — token/step/时间三维预算，超限降级
7. **Errors as Context** — 把错误作为新信息喂回去重新规划
8. **Sparse Tools** — 少而精的工具集，复杂能力走多 Agent 路由
9. **Observability-First** — 第一天就有 tracing

如果你学过 LangGraph，会发现每一条都对应一个原生能力——StateGraph、Conditional Edge、MemorySaver、recursionLimit——Harness 不是新概念，是这些原语的组合应用。

Claude Code、Cursor、Devin 这些产品真正的护城河不在模型层，在 Harness 层。而理解了这九条原则，你就拿到了自己搭建生产级 Agent 的蓝图。

[返回博客列表](./index)
