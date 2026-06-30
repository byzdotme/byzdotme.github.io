---
title: Codex 团队落地实践：从项目 Onboarding 到 Spec-driven 工作流
date: 2026-06-18
category: AI/LLM
tags: [Codex, 团队协作, TDD, OpenSpec, AI编程]
series: Codex 实战
seriesOrder: 3
---

# Codex 团队落地实践：从项目 Onboarding 到 Spec-driven 工作流

个人用 Codex，追求的是效率。团队用 Codex，追求的是一致性。

如果一个团队里每个人都用自己的 prompt、自己的权限配置、自己的隐性规范，Codex 很快会变成“每个人手里不同脾气的外包同事”。有的人让它先写测试，有的人让它直接改；有的人限制只读，有的人默认 full access；有的人把内部框架文档贴进 prompt，有的人让它靠猜。

团队落地的关键，不是让每个人更会 prompt，而是把团队的工程判断沉淀成可复用的系统：`AGENTS.md` 写铁律，`.codex/config.toml` 写安全边界，Skills 写流程，OpenSpec 写需求语义，Hooks 和 review 做验收。

## 1. 四类信息分开承载

团队规范通常有四类，不要全塞进一份 `AGENTS.md`：

| 信息类型 | 承载物 | 例子 |
|----------|--------|------|
| 铁律 | `AGENTS.md` | 必须 pnpm、禁止 PII 日志、金额必须 Money |
| 安全/执行策略 | `.codex/config.toml` / 管理配置 | sandbox、approval、MCP、hooks |
| SOP | Skills | 新建模块、TDD、内部 RPC、review 流程 |
| 参考资料 | `docs/` / Skill `references/` / MCP | 框架文档、领域手册、历史 RFC |

一个简单判断：

- “Codex 每次都必须知道” → `AGENTS.md`
- “Codex 遇到某类任务时才需要按步骤做” → Skill
- “这是工具能力或权限边界” → config
- “这是长文档或外部事实” → docs / MCP

**小结：** 团队落地第一步是分类。放错地方，后面所有 prompt 都会变胖。

## 2. 新项目 Day 1：先定骨架，再写业务

新项目最容易犯的错，是第一天就让 Codex 实现业务。目录结构、测试策略、边界分层一旦歪了，后面会一路带偏。

更稳的 Day 1 流程是：

```text
1. 明确鉴权、计费、安全边界
2. 让 Codex 只读当前目录，规划 skeleton
3. review 目录结构、测试框架、lint/typecheck 命令
4. 写根 AGENTS.md
5. 写项目级 .codex/config.toml
6. 加最小 hooks：危险命令、基础检查
7. 建第一批 Skills：TDD、新模块、commit style
8. 用一个小任务校准输出风格
```

Prompt 可以这样写：

```text
我要用 TypeScript 搭一个支付后台服务。
团队规范是 DDD / TDD / Clean Architecture。
先不要实现具体业务。
请阅读当前目录，给出最小可运行 skeleton 的计划：
1. 文件结构
2. 测试框架
3. lint/typecheck 命令
4. 第一批验收测试
5. 风险和非目标
```

你 review 计划后再让 Codex 执行。不要跳过这一步。Codex 写代码很快，写错方向也很快。

**小结：** 新项目先固化工程骨架，再写业务。目录和测试策略是最早也最贵的决策。

## 3. 存量大仓：先考古，再落规则

老仓库更复杂。它可能有内部闭源框架、历史遗留模块、风格断层、没人敢碰的上帝文件。此时 Codex onboarding 的第一步不是写 `AGENTS.md`，而是考古。

用只读模式启动，让 Codex 先生成项目考古报告：

```text
先不要改代码。请作为新入职资深工程师，生成项目考古报告：

1. 识别语言、构建系统、包管理器、测试框架
2. 识别顶层目录职责
3. 识别内部包及典型用法
4. 找出历史沉淀：deprecated、TODO、风格断层
5. 识别测试策略分布
6. 识别危险区域：热点文件、循环依赖、无测试核心模块

不要猜。不确定处写 UNKNOWN。
如果需要读超过 20 个文件，先派只读 subagent 分目录探索。
```

根据报告再写规则：

- 根 `AGENTS.md`：项目速览、铁律、目录地图、命令
- 子目录 `AGENTS.md`：模块特有规范
- `AGENTS.override.md`：高风险目录的覆盖规则
- `.agents/skills/`：内部框架和方法论
- `docs/frameworks/`：长文档索引

内部框架尤其不能让 Codex 猜。三种做法按 ROI 排序：

1. 写 Skill，带 references
2. 同步真实 docs，让根 `AGENTS.md` 只放索引
3. 让 Codex 从真实代码归纳 Skill 草稿，再人工 review

**小结：** 存量项目要先“读懂历史”，再“写下规则”。没有考古就写指导，很容易把错误理解制度化。

## 4. 用风格锚点代替抽象说教

团队规范里最难写清楚的，是风格。命名、分层、错误处理、日志粒度、测试组织方式，这些东西写成 100 条自然语言规则也不一定准。

更好的方式是引用标准答案文件：

```markdown
## 风格锚点
实现新模块时，优先模仿：
- src/modules/order/：命名、分层、错误处理
- src/modules/inventory/：测试组织方式

不要模仿：
- src/modules/legacy-pricing/：历史遗留，即将废弃
```

Codex 模仿已有代码的能力，通常强于按抽象规则凭空生成风格。好样本比长篇规范更接近“可执行的团队品味”。

风格锚点也适合写进 prompt：

```text
参考 src/modules/order/ 的结构、命名、错误处理、日志粒度，
为 PaymentService 添加同风格的退款用例。
```

**小结：** 抽象规则告诉 Codex “应该像什么”，风格锚点直接给它“标准答案”。后者通常更有效。

## 5. 把 TDD / DDD 写成硬约束

如果团队真的重视 TDD，就不要写“建议先写测试”。Agent 对软建议的执行力很弱，要写成硬约束：

```markdown
## TDD 强制流程
写任何业务代码前必须：
1. 先写覆盖验收条件的失败测试
2. 运行测试确认失败
3. 写最小实现让测试通过
4. 重构并保持测试绿

跳过 1-2 直接写实现视为严重违规，必须重做。
```

DDD 也一样：

```markdown
## DDD 约束
- 领域层不得 import infrastructure / interfaces
- Entity 只能通过 Repository 持久化
- 业务不变量必须通过 Entity / ValueObject 表达
- 每个聚合根必须有 invariant 测试
```

更进一步，把这些流程做成 Skill，比如 `add-test-tdd`、`new-module-ddd`、`billing-change`。这样 Codex 遇到对应任务时，不只是“知道规则”，而是按步骤执行：先读哪些文件、先写哪些测试、跑哪些命令、输出什么验收结果。

**小结：** 团队方法论要变成硬约束和可执行流程。不要指望一句“请注意 TDD”能稳定改变行为。

## 6. Spec-driven：让 Codex 知道“做什么”

很多 Codex 翻车不是实现能力问题，而是需求语义太薄。

“支持退款”这四个字缺太多信息：几天内能退？部分退款吗？履约后能退吗？重复请求怎么办？支付网关乱序回调怎么办？订单状态怎么变？错误码是什么？

Spec-driven 的价值，是把这些语义写成可 review 的资产。目录名不重要，可以叫 OpenSpec，也可以叫 `specs/`、`docs/specs/`、`.changes/`。关键是每次行为变化都有：

- 为什么改
- 改什么
- 不改什么
- 怎么验收
- 哪些能力被改变

一个 change 可以长这样：

```text
openspec/
└── changes/
    └── add-refund-window/
        ├── proposal.md
        ├── tasks.md
        └── specs/
            └── billing/
                └── spec.md
```

`proposal.md` 写意图和边界：

```markdown
# add-refund-window

## Why
用户支付后发现下错单，需要在订单未履约前自助退款。
当前只能人工客服处理，响应慢且运营成本高。

## What Changes
- 新增 7 天自助退款窗口
- 只允许 PAID 且未履约订单退款
- 退款请求必须幂等
- 退款成功后订单进入 REFUNDED

## Non-Goals
- 不支持部分退款
- 不改支付网关 SDK
- 不重构历史对账任务
```

`spec.md` 写行为，不写实现：

```markdown
### Requirement: Self-service refund window
系统 MUST allow a customer to request a full refund when:
- the order status is PAID
- fulfillment has not started
- the payment time is within 7 calendar days

#### Scenario: duplicate refund request is idempotent
- GIVEN a refund request with idempotency key abc
- WHEN the same request is submitted twice
- THEN only one gateway refund is created
- AND both responses return the same refund id
```

这类 scenario 对 Codex 非常友好，因为它可以自然映射到测试。

**小结：** Spec-driven 不是形式主义。它把“需求语义”变成 Codex 可以读取、测试可以覆盖、review 可以对照的东西。

## 7. Codex × Spec 的执行流程

有了 spec，不要直接说“照着实现”。更稳的是五步：

### Step 1：只读理解

```text
先不要改代码。请阅读：
- AGENTS.md
- openspec/project.md
- changes/add-refund-window/proposal.md
- tasks.md
- specs/billing/spec.md

输出：
1. 需求摘要
2. 需要澄清的问题
3. 可能涉及代码位置
4. 测试计划
5. 风险和非目标
不确定处写 UNKNOWN。
```

### Step 2：spec 到测试映射

```text
请把每个 Scenario 映射到具体测试：
- 测试文件路径
- 测试名
- Given/When/Then 如何落到代码
- 需要 mock 或 fake 的边界
- 哪些测试必须先失败
只输出计划，不改文件。
```

### Step 3：TDD 执行

```text
按 tasks.md 一次只做一项：
1. 先写失败测试
2. 运行该测试，确认失败原因是行为缺失
3. 写最小实现
4. 运行相关测试
5. 更新 tasks.md 勾选完成项
```

### Step 4：完成前验收

```text
逐条对照 spec：
1. What Changes 是否全部实现
2. 每个 Scenario 是否有测试覆盖
3. tasks.md 是否全部完成
4. Non-Goals 是否被越界修改
5. 运行相关测试和 typecheck
6. 输出残余风险
```

### Step 5：review 查偏差

```text
Review 当前 diff，重点找：
1. 实现是否偏离 spec
2. 是否偷偷实现 Non-Goals
3. 是否缺少 Scenario 覆盖
4. 幂等、并发、安全、数据一致性风险
```

**小结：** Spec 定义目标，TDD 定义路径，verification 定义完成标准。三者缺一，Codex 都容易跑偏。

## 8. 团队落地 Checklist

可以按这个顺序逐步引入：

- [ ] 根 `AGENTS.md`：项目速览、铁律、目录契约、命令、风格锚点
- [ ] 关键模块 nested `AGENTS.md` / `AGENTS.override.md`
- [ ] `.codex/config.toml`：approval、sandbox、project doc limit
- [ ] `.agents/skills/`：TDD、新模块、内部框架、commit style
- [ ] Hooks：危险命令、secrets 扫描、最小 typecheck
- [ ] MCP：GitHub / 任务系统 / docs / DB 只读
- [ ] `.codex/agents/`：code explorer、CI investigator、test runner
- [ ] PR review 准则写进 `AGENTS.md`
- [ ] 高风险业务改动引入 spec-driven change
- [ ] 首轮小任务校准，把偏差回写进规则

不要一口气全上。最推荐的顺序是：根 `AGENTS.md` → 项目 config → 1-2 个 Skill → 最小 hooks → PR review → spec-driven。每一步都能带来真实收益。

**小结：** 团队落地不是装一堆插件，而是逐步把隐性工程判断固化进工具链。

## 总结

个人用 Codex，看的是“它能不能帮我快一点”。团队用 Codex，看的是“它能不能按我们的方式稳定交付”。

这需要三层东西：

1. **规则层**：`AGENTS.md`、config、hooks，定义边界和铁律。
2. **流程层**：Skills、TDD、review、verification，定义怎么做。
3. **语义层**：Spec / OpenSpec，定义到底做什么、哪些不做、怎么验收。

Codex 不会天然理解团队历史、领域不变量和架构品味。资深工程师的价值，就是把这些隐性判断翻译成它能执行的规则、流程和验收标准。

当这套系统跑起来，Codex 才不只是每个人私用的效率工具，而会变成团队知识管理和工程交付的一部分。

[返回博客列表](/blog/)
