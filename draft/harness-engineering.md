# Harness Engineering 深度讨论

> 讨论大型复杂任务下的 Agent 设计哲学：怎么让 LLM 在长任务中保持聚焦、可验证、可恢复。

---

## 一、先肯定你的核心判断

你的原始观点是这样的：

> 对于给 LLM 的输入要足够精确和具体，使得 LLM 的输出尽可能聚焦。处理大型复杂任务时，要实现**相对固定的流程**，通过多次与 LLM 交互**澄清真实需求**，然后**拆分任务到足够细致**，每个子任务**保持 LLM 聚焦**，每个子任务**有验证手段**（如 TDD），每个子任务的**执行状态详细记录**以支持中断恢复。

**这个判断框架非常准确**，覆盖了 harness engineering 的四大核心维度：

| 你提到的 | 对应的工程维度 |
|---------|---------------|
| "输入足够精确" | **Context Engineering**（上下文工程） |
| "相对固定的流程 + 拆分任务" | **Task Decomposition & Planning** |
| "每个子任务有验证" | **Verification Loop** |
| "状态详细记录 + 中断恢复" | **Persistent State / Resumability** |

下面把每一条做**精修 + 补全**，并加几条你没提到但同样关键的原则。

---

## 二、术语澄清：Harness 是什么

**Harness（挽具）** 这个词在 AI Agent 领域的用法来自 RL / AI coding 圈，原意是"套在马身上控制方向的工具"。引申义：

> **围绕 LLM 构建的一切"脚手架代码"**，负责：
>
> - 决定什么时候调用 LLM
> - 决定往 LLM 里塞什么上下文
> - 决定如何解析 LLM 输出
> - 决定如何验证并在失败时重试
> - 决定如何保存/恢复状态
> - 决定如何做最终交付

**LLM 是引擎，Harness 是把引擎装进车里的一切零件**。

现实中的 harness 代表作：
- **Claude Code / Codex CLI / Cursor Agent** —— AI coding harness
- **Devin / Cognition / Replit Agent** —— 自主软件工程 harness
- **Manus / AutoGPT** —— 通用任务 harness

这些产品真正厉害的地方**不是模型**（都是 Claude / GPT / Gemini），**是 harness 设计**。

---

## 三、你的观点精修版

### 3.1 "输入要精确" → **Context Engineering 是第一要义**

**你说得对，但可以更具体**。精确的输入不只是"把用户需求说清楚"，而是一套完整的上下文策展策略：

| 维度 | 实操 |
|------|-----|
| **System Prompt** | 角色、目标、约束、输出格式都要显式写明 |
| **Few-shot Examples** | 高质量示例比长篇规则更有效 |
| **Tool Descriptions** | 工具描述要具体、举反例（"不要在 X 时调用") |
| **Working Context** | 把**当前任务状态**作为结构化 block 注入（而非混在对话里） |
| **Retrieved Context** | RAG 拉来的资料，要标注来源、时间、可信度 |
| **Negative Context** | 告诉模型**不要做什么**（经常比正向指令更有效） |

**核心洞察**：上下文**窗口是稀缺资源**，每个 token 都应该为当前子任务服务。

> **反模式**：把整个项目代码、整段对话历史、所有可能用到的工具一股脑塞进去。这叫 context stuffing，效果往往是**信号被噪声淹没**。

### 3.2 "相对固定的流程" → **Workflow ↔ Agent 光谱**

你说"相对固定的流程"抓住了关键。更精确的表达是：

**Agent 存在一个光谱**，两极是：

```
纯 Workflow  ←──────────────────────→  纯 Agent
所有分支写死    预设骨架 + LLM 决策      完全自由的 ReAct 循环
可预测、可审计                           灵活、应对力强
容易调试                                 难调试、难预算
```

大型复杂任务的**工程化原则**：

> **能用 workflow 表达的部分就不要交给 Agent 自主决策**。

比如一个"代码 review → 测试 → 部署"的大任务：
- **宏观流程是 workflow**（三阶段顺序固定）
- **每阶段内部的判断是 Agent**（LLM 决定要看哪些文件、跑哪些测试）

这就是你说的"相对固定的流程"的精确含义 —— **外层骨架固定，内层决策自由**。

LangGraph 特别适合这种表达：StateGraph 是 workflow，每个节点里可以是 Agent 子图。

### 3.3 "先澄清再拆分" → **Plan-Then-Execute 是标配**

你说的"多次与 LLM 交互澄清真实需求" + "拆分任务"**完全对**。这在工业上叫 **Plan-Then-Execute 模式**（也叫 Planner-Worker）：

```
输入
  ↓
阶段 1：Clarification（澄清）
  - LLM 反问用户，确认真实目标
  - 可能涉及 HITL（人工确认）
  ↓
阶段 2：Planning（规划）
  - LLM 输出**结构化的任务列表**（TodoWrite 这种）
  - 每项含：描述、依赖、预期产物、验证方式
  ↓
阶段 3：Execution（执行）
  - 遍历任务列表，逐项执行
  - 每项完成后更新状态
  ↓
阶段 4：Consolidation（汇总）
  - 检查是否全部达成，整合输出
```

**Claude Code 的实现就是这个模式**（你应该见过 TodoWrite 这个 tool，本质就是显式任务列表）。

**补充一个关键点**：**Planning 阶段的输出应该是数据结构，不是自然语言**。比如：

```json
{
  "tasks": [
    { "id": "1", "content": "读取 X 模块的测试文件", "dependencies": [], "status": "pending" },
    { "id": "2", "content": "基于测试推导模块行为", "dependencies": ["1"], "status": "pending" }
  ]
}
```

结构化的 plan 可以：
- 机器可读，不需要每次重新 parse
- 可渲染给用户看进度
- 支持并行执行（DAG）
- 中断恢复时精确定位

### 3.4 "每个子任务有验证" → **Verifier Loop 是 Agent 质量的天花板**

这是**最关键**也最容易被忽视的一条，你提到是对的。深入讲：

**没有 verifier 的 agent = 没有刹车的跑车**。LLM 会自信地胡说，只有客观 verifier 能拦住它。

AI coding 领域的 verifier 层级（由强到弱）：

| 验证强度 | 手段 | 可靠性 |
|---------|------|-------|
| **执行级** | 跑测试、编译、运行 | ★★★★★ |
| **静态分析** | TypeScript / lint / AST 检查 | ★★★★ |
| **Schema 级** | zod 校验输出结构 | ★★★★ |
| **LLM-as-Judge** | 另一个 LLM 评分 | ★★★ |
| **正则 / 字符串匹配** | 关键字出现检查 | ★★ |
| **无验证** | 信模型 | ★ |

**工程实务**：**每个子任务至少要有一个 verifier**，失败时走 "观察错误 → 修正 → 重试" 的 critic-actor 循环。

TDD 是最自然的 verifier —— 测试就是需求的可执行版本。

**补充**：Verifier 不只是"成功/失败"的二元信号，**好的 verifier 会返回结构化的失败原因**，让 LLM 能基于此修正。比如：

```
❌ Bad verifier: "测试失败"
✓ Good verifier: "测试 'should return user id' 失败：预期 'user-123'，实际 undefined。可能原因：getUserById 未处理传入的 id 参数。"
```

### 3.5 "状态详细记录 + 中断恢复" → **State is the Backbone**

你的这一条对应生产 Agent 最核心的基础设施：**State Management**。

细化几条：

**(a) 状态的粒度分层**
- **任务级状态**：每个 subtask 的 status / result / errors
- **步级状态**：每个 LLM 调用的 input / output / tokens / latency
- **事件级状态**：每个 tool call 的参数、返回、耗时
- **会话级状态**：全局元信息（user_id, session_id, budget_used）

生产级 Agent 要能"放大"看任意粒度 —— 这是**可观测性（Observability）**的基础。

**(b) 中断恢复的三个层次**
1. **Crash Recovery**（程序崩了）：checkpointer 存到 Redis/Postgres，重启后加载
2. **Human Pause Recovery**（HITL 暂停）：`interrupt()` + `resume`，你学过
3. **Long-task Resume**（几小时/几天的任务跨天执行）：每个子任务完成就持久化，避免重做

**(c) 状态本身就是文档**
一个设计良好的 agent state，**打印出来应该能让一个新加入的工程师看懂"现在在干什么、干到哪一步了"**。这是一个很好的设计 sanity check。

---

## 四、你没提到但同样关键的原则

### 4.1 Budget Control（预算控制）

Agent 容易"做得太久"。需要在三个维度设预算：

- **Token 预算**：整个任务累计 token 上限（超了就强制 summary 或放弃）
- **Step 预算**：最多循环 N 次（对应 LangGraph 的 `recursionLimit`）
- **Wall-time 预算**：墙钟时间上限（AbortSignal 实现）

任一超出 → 走降级路径（部分交付 / 告知用户 / 转交人工）。

### 4.2 Test-Time Compute（推理期计算扩展）

对于关键决策点，**花更多 token 换更高质量**：

- **Best-of-N**：同一个 prompt 生成 N 个答案，选最好的
- **Self-Consistency**：多次采样，取一致性最高的
- **Tree-of-Thought**：分支探索不同解法
- **Debate**：两个 LLM 互相 critique

这些不是学术玩具，Claude Code 在关键决策（比如"这段代码改对了吗"）会用类似思路。

### 4.3 错误是信号，不是终点

初级 harness 遇到错误 → 重试相同操作（没用）  
中级 harness 遇到错误 → 换参数重试  
**高级 harness 遇到错误 → 让 LLM 看错误详情，重新规划**

把错误作为上下文的一部分喂回去，是 Agent 展现"智能"的关键场景。

### 4.4 Memory 的三种尺度

| 尺度 | 保留什么 | 实现 |
|------|---------|------|
| **Working Memory** | 当前任务的近期消息 | 原始对话（滑动窗口） |
| **Episodic Memory** | 历史任务的摘要 | 压缩后的 summary + 关键事实 |
| **Semantic Memory** | 长期知识 | 向量存储，按需检索 |

长对话 / 跨会话的 Agent 必须设计三层，不能只靠 context window。
（下一篇 `context-compaction.md` 展开讲）

### 4.5 Tool Design 的"少即是多"

**给 Agent 20 个工具 ≠ Agent 能做 20 种事**。太多工具会：

- 稀释注意力（每个 turn 都要过一遍选择）
- 相似工具混淆（read_file vs load_file 到底选哪个）
- 描述互相干扰

原则：
- 单个 agent 绑定的工具 **保持在 10 个以下**
- 相似能力合并（一个 `file_operation` tool，用 `op` 参数区分读/写/删）
- 大工具集用**多 Agent 路由**（supervisor 决定用哪个子 Agent）

### 4.6 Observability-First

生产 Agent 必须从第一天就接 tracing。推荐：

- **LangSmith**（LangChain 家族原生）—— 看每一步的 input/output/耗时
- **OpenTelemetry**（通用方案）
- **自己的 event log**（最少要有这个）

**没有观测的 Agent 是黑盒**，debug 全靠运气。

---

## 五、你的观点最终精修版

> **Harness Engineering 的核心信念**：
>
> 1. **Context Engineering**：每个 token 都为当前子任务服务，反对 context stuffing
> 2. **Workflow + Agent 混合**：宏观流程写死、微观决策放开，LangGraph 这种 StateGraph 天然适合
> 3. **Plan-Then-Execute**：先让 LLM 澄清 + 规划，输出**结构化任务列表**
> 4. **Verifier Loop**：每个子任务必须有可靠的客观验证，失败时结构化反馈
> 5. **Fine-grained State**：分层的持久化状态，支持任意粒度观测、中断恢复、审计
> 6. **Budget Control**：token/step/时间三维预算，超限降级
> 7. **Errors as Context**：把错误作为新信息让 LLM 重新规划，而非傻重试
> 8. **Memory Hierarchy**：工作记忆 / 情景记忆 / 语义记忆三层分工
> 9. **Sparse Tools**：少而精的工具集，复杂能力走多 Agent 路由
> 10. **Observability-First**：从第一天就有 tracing，不接受黑盒

---

## 六、实战映射：你已经学过的 LangGraph 能力覆盖了哪些

| Harness 原则 | 对应 LangGraph 能力 |
|-------------|-------------------|
| Context Engineering | 节点里自由控制塞给 model 的 messages |
| Workflow + Agent 混合 | StateGraph + 子图（第 10 课） |
| Plan-Then-Execute | 一个 plan 节点 → 一个 execute 节点，plan 输出到 state |
| Verifier Loop | Conditional edge + 循环回到 plan 节点（第 7、8 课） |
| Fine-grained State | StateSchema + reducer（第 8 课） |
| Budget Control | `recursionLimit` + `signal`（第 11 课） |
| Errors as Context | 把 error 塞进 state 的某个字段，下一轮 LLM 看得到 |
| Memory Hierarchy | MemorySaver + 自定义 summarize 节点（下一篇讨论） |
| Observability | LangSmith 的 tracing 自动接入 |

你学的每一个 LangGraph 原语都对应一个 harness 设计维度。这就是为什么我说"先学底层再学最佳实践" —— 因为 harness 不是神秘知识，是这些原语的组合应用。

---

## 七、自学推荐

1. **读源码**：Claude Code 的 agent.md / Cursor 的开源 pieces / Aider 的 coder 实现
2. **看论文**：`Toolformer`、`ReAct`、`Reflexion`、`Self-Consistency`、`Tree-of-Thought`
3. **跟产品**：Devin / Cognition / Manus / Replit Agent 的 demo，观察它们怎么"展示进度"
4. **自己造一个**：挑一个你熟悉的领域（比如自动写测试）做一个 mini harness，就能理解所有权衡
