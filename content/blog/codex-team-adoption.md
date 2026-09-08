---
title: Codex 团队落地：把需求和验收写清楚
date: 2026-06-11
category: AI/LLM
tags: [Codex, 团队协作, TDD, OpenSpec, AI编程]
series: Codex 实战
seriesOrder: 3
---

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

同一个退款需求交给两个人用 Codex 做，出来的东西往往不像同一件事：一个实现了全额退款，另一个顺手把部分退款也支持了；一个把网关超时当成失败直接回滚，另一个保留了处理中状态。两份代码都可能让自己生成的那套测试变绿，因为测试也是照着各自的实现写出来的。

笔者从 0 到 1 带过一个平台治理方向。那几年最花力气的部分不在架构图上，而在把一句「下单以后可以退」写成能被验收的东西——写清楚谁在什么状态下能做什么、失败返回什么、哪些事这次不做。当时靠文档、评审和反复的口头确认撑着。现在多了一个执行很快、但只会照着字面理解的同事，这件事的性价比突然变高了。

配置机制在[上一篇](/blog/codex-ecosystem-guide)，这里谈的是怎么把它们放进真实的交付过程。

## 先分清哪些信息该被共享

团队规范混着四种颗粒度的信息，全塞进一份 `AGENTS.md` 是最常见的起点，也是最早出问题的地方：

| 信息类型 | 承载物 | 例子 |
| --- | --- | --- |
| 每次都要知道的铁律 | `AGENTS.md`，按目录分层 | 必须用 pnpm；金额必须用 Decimal |
| 工具的能力与权限边界 | `.codex/config.toml`、`requirements.toml` | 默认沙箱、审批策略、MCP 与 hooks |
| 某类任务的固定步骤 | `.agents/skills/` | 新建聚合根、TDD（Test-Driven Development，测试驱动开发）、领域变更 |
| 长文档与外部事实 | `docs/`、Skill 的 `references/`、MCP | 内部 RPC 手册、历史 RFC、issue |

分格的判断标准是这句话会被谁、在什么时候读到：「Codex 每次都必须知道」的进根 `AGENTS.md`；「遇到某类任务才按步骤做」的写成 Skill，靠 description 触发；权限与执行策略归配置；长文档和仓库外的事实放 `docs/` 或 MCP（Model Context Protocol）。

放错格的代价很具体：铁律堆多了，常驻上下文变胖，真正关键的那几条被稀释；反过来，把「提交前必须跑哪个命令」留在某个人的提示词里，换个人接手就失效。

## 新项目 Day-1：先定骨架，再写业务

新项目最诱人的地方是第一天就能让 Codex 写业务代码，最容易埋雷的也是这一天。目录结构、测试策略、分层边界一旦歪掉，后面每个任务都会沿着歪掉的方向加速。

```text
1. 说清鉴权、计费与安全边界
2. 只读扫一遍目录，给出骨架计划，review 之后再动手
3. 写根 AGENTS.md
4. 提交项目级 .codex/config.toml
5. 挂最小 Hooks 护栏
6. 建团队 Skill 最小集
7. 用一个小任务校准，把偏差写回 AGENTS.md 或 Skill
```

第 1 步跟写代码无关，但它决定了后面所有自动化能不能开。日常交互走 ChatGPT 或 Codex 登录；CI 与定时任务用专用的 `OPENAI_API_KEY` 或企业凭据，不要把个人 session、token 带进去。共享仓库默认 `sandbox_mode = "workspace-write"` 且不开网络；第一次打开的陌生仓库用 `approval_policy = "untrusted"` 配 `sandbox_mode = "read-only"`；非交互的 CI 任务用 `approval_policy = "never"` 加只读沙箱。secrets 既不写进 `AGENTS.md`，也不写进 Skill。

第 2 步只让它出计划，review 过再动手：

> 我要用 `<技术栈>` 搭一个 `<业务>`，团队规范是 DDD（Domain-Driven Design，领域驱动设计）/ TDD / Clean Architecture。
> 先不要实现具体业务。请阅读当前目录，给出目录骨架、工具链和最小可运行 skeleton 的计划，
> 必须包含文件结构、测试框架、lint / typecheck 命令和第一批验收测试。

骨架和测试策略是这段时间里最贵的两个决定：定下来只用几行字，返工要赔上很多个任务。

第 3 步写根 `AGENTS.md`，骨架在[上一篇](/blog/codex-ecosystem-guide)里已经给过，这里只补一条经验：铁律用「必须 / 禁止」写，「建议」「尽量」在模型眼里约等于没写。第 4 步提交项目级 `.codex/config.toml`，只放团队共识，比如 `approval_policy = "on-request"`、`sandbox_mode = "workspace-write"`、`project_doc_max_bytes = 65536`，再把 `[sandbox_workspace_write]` 里的 `network_access` 关掉。provider、鉴权、telemetry 和个人模型偏好留在 `~/.codex/config.toml`：一个仓库不该替所有人决定连到哪个后端。

第 5 步挂最小护栏，`PreToolUse` 拦危险命令，`PostToolUse` 在 `apply_patch` 之后跑一次 typecheck；事件名和 matcher 以当前 Codex hooks 文档为准，从别的工具迁移过来时要重新核对。第 6 步是 Skill 最小集，`.agents/skills/` 下三个就能起手：`add-test-tdd`、`new-module-ddd`、`commit-style`，每个目录一份 `SKILL.md`。

`add-test-tdd` 的正文可以短成这样：

```markdown
# Strict TDD
1. 先写或修改测试，覆盖用户验收条件
2. 运行测试，确认失败原因是预期行为缺失
3. 写最小实现让测试通过
4. 运行相关测试和 typecheck
5. 如需重构，保持测试绿

严禁：先写实现再补测试、skip / only 测试、修改测试来迎合实现。
```

第 7 步用一个小 bug 或小重构走完整循环：先要计划，review 计划，让它实现，严格 review diff，把偏差沉淀回 `AGENTS.md`、Skill 或 Hook，再找第二个小任务验证一遍。第一周真正要拿到的东西，是把团队里那些只存在于口头和肌肉记忆里的规则喂准；多写出多少代码反倒是次要的。

## 老仓库先考古

新项目像搬进一间空房子，按自己的习惯摆家具就行；老仓库更像半夜接手别人住了十年的房子，灯在哪、哪根线不能碰，都得先摸清楚。里面可能有内部闭源框架、历史遗留模块、风格断层，还有几个没人敢碰的上帝文件。

所以第一件事是只读考古，还不到写 `AGENTS.md` 的时候。用 `codex --sandbox read-only --ask-for-approval untrusted` 启动，让它交一份报告：

```text
先不要改代码。请作为新入职的资深工程师，生成一份项目考古报告：
1. 识别语言、构建系统、包管理器、测试框架、lint / typecheck 工具
2. 识别顶层目录职责与内部包（如 @company/*）的典型用法
3. 找出历史沉淀：重复实现、deprecated、TODO、风格断层
4. 识别测试策略：单测 / 集成 / e2e 的分布
5. 识别危险区域：上帝文件、热点文件、循环依赖、无测试覆盖的核心模块
6. 输出 ARCHAEOLOGY.md 草稿，但不要写文件，只给内容建议

不要猜。不确定的地方写 UNKNOWN。
```

仓库大的话再加一句：需要读超过 20 个文件时先派只读 subagent 分目录探索，主会话只收 file:line 清单和摘要，不贴大段源码。

报告只是初稿，要交给熟悉模块的人校验一次。目录结构只是线索，不能直接当成设计意图；一份误读的报告写进 `AGENTS.md` 之后，会被之后所有任务反复遵守，而且没人记得它是猜的。

校验完再分层写：`/AGENTS.md`、`/backend/AGENTS.md`、`/backend/billing/AGENTS.md`、`/packages/legacy-core/AGENTS.override.md`。模块级文件写的是根文件管不到的东西：

```markdown
# Billing 模块

## 风险级别：高
- 涉及金额必须用 Decimal，禁止 JS number
- 涉及货币必须显式 ISO 4217 code

## 关键不变量
1. 账单 issued 后金额不可修改，只能开 credit note
2. 支付网关 webhook 可能乱序，消费者必须幂等

## 禁止事项
- 禁止重构 legacy-reconcile.ts，除非有单独 RFC
```

风格那一格用锚点比用形容词划算：直接指两个目录，说照这个写、别照那个写，模型读代码比读一百条「命名要清晰」准确。锚点文件自己会变，指向它的说明要跟着一起维护。

内部框架这一格最不能让它猜。三种做法按投入产出排序：写 Skill 并把完整 API 放进 `references/`；同步真实 `docs/`，根文件只放索引；或者让它从真实代码归纳一份 Skill 草稿，人再 review。Skill 里写一个不存在的内部 API，比不写 Skill 更糟——模型会把编出来的用法当成真的，而且写得很自信。

## Superpowers：把流程变成闸门

Superpowers 是一组可以复用的 Skill，常见的有 brainstorming、writing-plans、test-driven-development、systematic-debugging、verification-before-completion、requesting-code-review。它要解决的是流程问题：在几个关键节点上，Codex 必须交出一份能 review 的中间物才能往下走。写一句「用 superpowers 帮我实现退款功能」当魔法词，等于什么也没约束住。

好用法是把它当成阶段闸门：

```text
使用 brainstorming，先不要改代码。
目标：增加订单退款窗口，用户支付后 7 天内可自助退款。
请先阅读 billing / order / payment 相关的 AGENTS.md 和代码，输出：
1. 需要澄清的问题
2. 两到三种实现方案与取舍
3. 推荐方案
4. 风险点和验收条件
```

按任务类型，编排大致是固定的：

```text
需求不清楚      → brainstorming → writing-plans → test-driven-development → verification-before-completion → requesting-code-review
Bug 没定位      → systematic-debugging → test-driven-development → verification-before-completion
收到 review 意见 → receiving-code-review → systematic-debugging（涉及 bug 或行为不确定时）→ verification-before-completion
大任务          → dispatching-parallel-agents，主会话只做汇总和决策
```

这套约定要落到 `AGENTS.md` 里才有约束力：

```markdown
## Superpowers 使用约定
- 新功能、业务行为变更、复杂重构必须先走 brainstorming 或等价的设计流程。
- Bug 修复必须先给出根因假设、证据、反证和最小验证方法，禁止直接猜修。
- 业务代码必须走 TDD：先失败测试，再最小实现，再重构。
- 完成前必须走 verification-before-completion 或等价验收流程。
- 涉及 5 个以上文件的探索，优先派只读 subagent，主会话只收 file:line 摘要。
```

哪些任务不用走这套也值得写清楚：纯格式化、拼写修复、局部重命名、不影响行为的内部小整理，直接改完看 diff 就行。中间的判断可以落成四条：改变外部行为的至少要有一句验收条件；只改内部结构不改行为的要有非目标和回归测试；涉及钱、权限、数据迁移、并发或安全的先写 spec 再实现；两小时 review 不完的 diff 先拆 spec 或拆 PR。

流程产物的价值有一半在于有人看。全开一遍却没人 review 中间物，等于把交付拖慢了一倍。

## OpenSpec 三段：proposal、spec、tasks

很多 Codex 翻车的原因在于需求语义太薄，跟实现能力关系不大。「支持退款」这四个字里藏着太多没定的东西：几天内能退、能不能部分退、履约之后怎么办、重复提交怎么认、网关回调乱序怎么收敛。

Spec-driven 的做法是把这些语义变成可以 review 的资产。目录名不是重点，叫 `openspec/`、`specs/` 还是 `.changes/` 都行，具体工具的目录与命令以所用版本为准；重要的是每次行为变更都留下三份东西：

```text
openspec/changes/add-refund-window/
├── proposal.md
├── tasks.md
└── specs/billing/spec.md
```

`proposal.md` 写意图和边界，具体到四节：

```markdown
# add-refund-window

## Why
用户支付后发现下错单，需要在订单未履约前自助退款；现在只能走人工客服。

## What Changes
- 新增 7 天自助退款窗口，只允许 PAID 且未履约的订单退款
- 退款请求必须幂等，成功后订单进入 REFUNDED
- 超出窗口返回业务错误 REFUND_WINDOW_EXPIRED

## Non-Goals
- 不支持部分退款，不改支付网关 SDK
- 不重构历史对账任务

## Risks
- 支付网关回调乱序，退款与发货状态并发竞争
```

`Why` 防的是它只按字面实现，`Non-Goals` 防的是它顺手扩大范围。后者是一条针对本次变更的边界，别把「这次先不改网关 SDK」写成永久禁令。

`spec.md` 写行为，不写实现。需求用 `### Requirement` 起头，下面挂 GIVEN / WHEN / THEN 的场景：

```markdown
### Requirement: Self-service refund window
系统 MUST allow a customer to request a full refund when:
- the order status is `PAID`
- fulfillment has not started
- the payment time is within 7 calendar days

#### Scenario: refund succeeds inside window
- GIVEN an order paid 3 days ago
- WHEN the customer requests a refund
- THEN the order status becomes `REFUNDED`
- AND exactly one refund request is sent to the gateway

#### Scenario: duplicate request is idempotent
- GIVEN a refund request with idempotency key `abc`
- WHEN the same request is submitted twice
- THEN only one gateway refund is created
- AND both responses return the same refund id
```

`tasks.md` 写可验收的步骤，一条一条单独能做完：

```markdown
# Tasks

- [ ] 1. 在 services/billing 下补退款窗口的测试
- [ ] 2. 加领域规则，拒绝超出窗口的退款请求
- [ ] 3. 给退款命令加幂等处理
- [ ] 4. 把 API 入口接到应用服务
- [ ] 5. 为重复提交补集成测试
- [ ] 6. 跑 billing 的测试和 typecheck
- [ ] 7. 更新 API 文档与 changelog
```

粒度要能让执行者一项一项做完并验证。「实现退款功能」这种大筐条目，勾不勾选都不说明任何事——勾选记的是执行者的自述，一条「已完成退款」得能对应到代码和实际测试结果。

Spec 的价值在于它是一份可评审的行为说明，落到哪个目录、用什么工具都是次要的。两个反模式值得提前说破：proposal 写得像口号、spec 里没有 Scenario，模型还是只能猜；先让它实现再补 spec，spec 就变成了事后解释，约束力也没了。

## 用一份退款说明检查需求是否足够明确

「支持七天内退款」这句话至少还缺这些决定：七天怎么算，能不能部分退，履约开始之后怎么办，重复请求怎么识别，网关超时要不要继续占着额度。

下面这份说明是为讲方法编的，不代表通用退款规则：

```markdown
# 自助全额退款

## 目标
让订单所有者在满足条件时自行申请全额退款。

## 行为
- 仅支持已支付且尚未开始履约的订单。
- 以服务端时间判断：申请时间早于支付时间加 7 × 24 小时。
- 恰好到达截止时间时，不再接受自助申请。
- 同一幂等键和相同参数返回同一退款记录。
- 同一幂等键但参数不同，返回冲突。
- 网关结果未知时保留处理中状态，通过查询或回调收敛。
- 只有确认退款成功后，才更新为已退款。

## 非目标
- 不支持部分退款。
- 不更换网关 SDK。
- 不重构历史对账任务。
```

这里刻意写成 7 × 24 小时，而不是「七个自然日」，因为前者把时区和日历边界一起消掉了。产品如果确实要按自然日算，就得补一句按哪个业务时区。

拿这份东西去问产品，通常会在两处卡住：跨时区的大促订单，以及履约与退款并发。后一条更麻烦，得先定下谁先取得处理资格，否则两边可能都读到「尚未开始履约」，然后各自往下走。把它交给 Codex 之前，最好先确认团队自己回答过这一条。

## Codex × OpenSpec：从只读到验收

三段材料齐了，执行顺序也值得固定下来。下面这条链上每一步都有产物，也都有人过目：

![从提案到验收：每一步产出什么、由谁评审](/images/blog/diagrams/codex-team-adoption-01-spec-pipeline.svg)

第一步只读理解，不要改代码：

```text
请阅读 AGENTS.md、openspec/project.md、这次 change 的 proposal.md、tasks.md
和 specs/billing/spec.md，输出：
1. 需求摘要与需要澄清的问题
2. 可能涉及的代码位置
3. 测试计划
4. 风险和非目标
不确定的地方写 UNKNOWN，不要猜。
```

第二步把场景映射到测试，仍然只出计划：每个 Scenario 落到哪个测试文件、测试名叫什么、Given / When / Then 怎么落到代码、哪些边界要 mock、哪些测试必须先失败。

第三步按 `tasks.md` 一次只做一项：先写失败测试，确认失败原因是行为缺失，再写最小实现，跑相关测试，最后更新勾选状态，每一步都给出命令和结果摘要。

第四步收工前逐条对 spec：What Changes 是否全部实现、每个 Scenario 是否有测试覆盖、`tasks.md` 是否全部完成、Non-Goals 有没有被越界修改，跑一遍相关测试和 typecheck，输出残余风险。

第五步 review 盯的是偏差，findings first：实现是否偏离 spec、有没有偷偷实现 Non-Goals、是否缺少 Scenario 覆盖、幂等与并发与安全与数据一致性风险，按严重程度排序。

这五步里最先被省掉的通常是第四步。测试变绿说明实现跑通了，不说明 spec 里那句业务承诺被覆盖过——测试很容易只覆盖实现走过的那条路径。

## 执行中只在有意义的边界停下来

每一步都要点头的话，团队很快就会放弃这套流程。值得停下来的其实不多：需求有歧义时先澄清；涉及数据迁移、公开 API 变更或权限扩大时，方案先评审；已经定好范围的实现让它连续跑完。走 TDD 时还要确认失败测试失败在目标行为缺失上——看到红色就往下写实现，等于把测试变成了装饰。

审查可以让它对着需求说明查 diff：

> 对照退款行为说明检查当前 diff。优先报告状态、幂等、并发、授权和兼容风险，附代码位置与触发条件。指出未覆盖的验收场景，不修改代码。

最后那句「不修改代码」是有意加的。审查和修改是两次授权，PR 评论里一句「顺便修一下」会把两件事混在一起。接了 Codex Cloud 的话，`@codex review` 和 `@codex fix the CI failures` 的语义也要提前写清楚：前者只做审查，后者才会派云端任务。审查准则一并写进 `AGENTS.md`：findings first，按 Critical / Suggestion / Nice-to-have 三档排序，每条发现都带 `file:line`、为什么是问题和最小修复建议。

## 先跑一个小任务，再决定共享什么

首轮不用把上面这些全建起来。准备三样东西就够开工：一份准确的项目指导、一份具体的需求说明、一个能跑起来的验证入口。

然后观察返工的原因。信息缺失、理解错误、测试不足、配置没生效，这四种的修法完全不同：第一种补 `AGENTS.md`，第二种拆细 Skill 的步骤，第三种补验收条件，第四种去查配置到底加载了哪一层。返工原因还没看清就先加配置，多半会加在错的地方。

后续顺序大致是：根 `AGENTS.md` → 项目级 config → 一到两个 Skill → 最小 Hooks → PR review 准则 → spec-driven。每一步都能单独带来收益，也就都能单独验证。别为了「配置完整」先装一堆 MCP、建固定数量的子代理，每项新增能力都要占维护、权限审查和升级验证的额度。

交付时拍板的仍然是团队。Codex 能加快调查和实现，但谁批准需求、谁审查代码、谁负责发布，这些角色不会因为流程变顺而消失。这套流程在一个多人团队里跑久之后会不会退化回一长串提示词，笔者还没有答案，先记在这里。

[返回博客列表](/blog/)
