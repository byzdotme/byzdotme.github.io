---
title: 让 Claude Code 读懂你的代码库：CLAUDE.md 分层与团队落地实践
date: 2026-05-03
category: AI/LLM
tags: [Claude Code, CLAUDE.md, 团队协作, 代码库管理, AI编程]
---

# 让 Claude Code 读懂你的代码库：CLAUDE.md 分层与团队落地实践

Claude Code 最大的优势是它有工具、能改代码。但它最大的盲区也很明显：它不认识你们公司的内部框架，不知道你们团队三年沉淀下来的"不写进文档的约定"，更不懂那个 2000 行的 `legacy-pricing.ts` 为什么碰不得。

所有这些隐性知识，都需要你主动编码进 CC 的"记忆系统"。核心载体就是 CLAUDE.md——但这不意味着把所有东西塞进一个文件。真正高效的做法是**分层设计**。

## 1. 不是只有一个 CLAUDE.md

CC 的 CLAUDE.md 加载有两层逻辑：

- **向上聚合**（启动时一次性）：从当前目录一路向上找所有 CLAUDE.md，全部加载
- **向下按需**（运行时增量）：当 CC 操作某个子目录里的文件时，那子目录链路上的 CLAUDE.md 自动追加

```
~/.claude/CLAUDE.md                  # 全局（你个人跨所有项目的偏好）
<repo>/CLAUDE.md                     # 项目级（启动时加载）
<repo>/backend/CLAUDE.md             # CC 操作 backend/ 下文件时按需追加
<repo>/backend/billing/CLAUDE.md     # 操作 billing/ 下文件时再追加
```

为什么根 CLAUDE.md 不够用？一条规则可能只对计费模块适用（"金额一律 Decimal，禁止 JS number"）——写进根会让它常驻所有会话，浪费 token。

### 推荐四层结构

| 层级 | 文件 | 内容 |
|------|------|------|
| 全局 | `~/.claude/CLAUDE.md` | 个人偏好：commit 风格、默认语言 |
| 项目 | `<repo>/CLAUDE.md` | 铁律 + 目录地图 + Skills 索引 + 风格锚点 |
| 子系统 | `<repo>/<area>/CLAUDE.md` | 该子系统特有架构、依赖、命令 |
| 模块 | `<repo>/<area>/<module>/CLAUDE.md` | 历史坑、兼容约束、"动这里前先看 X" |

**原则：越模块化、越专有的规则越往深层子目录放；只有全局铁律才进根。** 否则根 CLAUDE.md 迅速膨胀，无关会话也要为它付 token。

### 维护策略

CC 不会自动更新 CLAUDE.md——这是故意的，因为记忆文件会常驻上下文、影响后续所有会话。日常更新走四种方式：

- `#` 前缀：会话里直接发 `# Billing 模块金额一律用 Decimal`，最顺手
- 自然语言："把刚才关于 X 的决策追加到 `services/billing/CLAUDE.md` 的踩坑记录一节"
- `/memory`：打开专用编辑视图
- 直接编辑文件：大范围重构

**什么值得回写？** 你在不同会话里对 CC 讲过同一件事 ≥ 2 次、发现了一条希望未来所有改动都遵守的约束、修 bug 时挖出的历史坑。

**小结：** CLAUDE.md 不是一次写完的，是踩坑攒出来的。发现 CC 偏了、发现它不知道某条历史包袱 → 立刻回写到最合适的那一层。最佳时机是任务刚结束，而不是"等以后集中整理"。

## 2. `.claude/rules/`：另一种切分维度

当规则更适合按"文件类型"而不是"业务模块"组织时，用 `.claude/rules/`。它支持 `paths` frontmatter 做路径作用域——只有 CC 读到匹配的文件时才加载：

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 开发规范
- 所有入口必须先做 zod 校验
- 错误用 AppError，不抛裸 Error
```

| 用 `.claude/rules/` | 用子目录 CLAUDE.md |
|--------------------|-------------------|
| 规则按 glob 模式组织（`*.test.ts`、`migrations/**`） | 规则按业务模块边界组织 |
| 同类规则跨多个目录复用 | 模块级"动这里前先看 X" |
| 细到"只在改 React 组件时加载" | 模块级全套规范 |

两套机制可以并存。关键区别：rule 是常驻片段（匹配时整段注入 system prompt），Skill 是按需触发（正文只在调用时才加载）。不要把 SOP 塞进 rules——会无谓占 token。

**小结：** CLAUDE.md 管"这个模块的规矩"，`.claude/rules/` 管"这类文件的规矩"。两者配合才能覆盖大仓的全部场景。

## 3. Auto Memory：让 CC 自己记笔记

v2.1.59+ 引入的 auto memory 系统：CC 在会话中会自己判断"这条信息以后还有用"，写到 `~/.claude/projects/<project>/memory/`。每次新会话自动加载前 200 行。

| | CLAUDE.md | Auto Memory |
|---|---|---|
| 谁写 | 你 | CC 自己 |
| 内容 | 规范、铁律、架构 | 它发现的命令、纠正过的偏好 |
| 角色 | 宪法 | 备忘录 |

**实战建议**：把 auto memory 当成低优先级补充——铁律仍然必须进 CLAUDE.md。定期 `/memory` review 自动生成的记忆、删除错误条目。

**小结：** Auto Memory 节省了"手动记 build 命令是 `pnpm dev:billing`"这种琐事，但它不是强约束。不要让 auto memory 替代 CLAUDE.md 里的关键规范。

## 4. 存量项目的 6 步 Onboarding

手里的老仓库 CC 完全不认识？按下面这套流程。

### Step 1：让 CC 做"考古侦察"

进入 Plan 模式（只读），派给 Explore subagent：

> "你是新入职的资深工程师。生成一份项目考古报告：识别语言/构建系统/包管理器、目录结构及职责、内部包使用情况、历史沉淀（废弃代码/风格断层）、测试策略分布、危险区域（循环依赖/上帝文件/热点文件）。不要修改任何代码，不确定处标 UNKNOWN。"

仓库很大时，用 `/batch` 派 5-10 个 Explore subagent 各盯一块，并行考古，主代理合并报告。子代理把脏活跑完只返回摘要，主会话上下文不爆。

### Step 2：根据侦察报告分层写 CLAUDE.md

至少要有：项目级铁律 + 目录地图、关键子模块特有规则、遗留代码警告（"这别重构，只加不改"）。

### Step 3：给内部框架"教教科书"

三种方式，按 ROI 从高到低：

- **方式 A（强推）**：为每个内部框架写一个 Skill。主文件 ≤ 200 行，详细 API 放 `references/`。description 写清楚"遇到 import '@company/rpc' 时触发"
- **方式 B**：框架文档同步到 `docs/frameworks/`，根 CLAUDE.md 只列索引
- **方式 C**：让 CC 从代码里自学归纳——"扫描所有使用 @company/rpc 的文件，归纳典型骨架和反模式，输出为 Skill 草稿。"然后你人工 review

### Step 4：用"学习示例"锚定风格

在 CLAUDE.md 里写：

```markdown
## 风格锚点
- 好样本：`src/modules/order/OrderService.ts`
- 好样本：`src/modules/inventory/` 整个模块
- 反样本（不要学）：`src/modules/legacy-pricing/`（历史遗留，即将废弃）
```

**这比写 100 条风格规则都有效**——代码里已经把所有隐含规范固化了，CC 模仿能力极强。

### Step 5：为方法论写硬约束

DDD 铁律示例：

```markdown
## DDD 约束
- 领域层不得 import 任何 infrastructure/interfaces 代码
- Entity 只能通过 Repository 持久化，禁止应用层直接拼 SQL
- 业务不变量用 ValueObject 或 Entity 方法表达，禁止在 Service 里散落校验
```

**铁律用"禁止/必须"句式，不要用"建议/尽量"**——Agent 对硬约束执行力更强。

### Step 6：首轮小任务校准

不要直接让 CC 上手做大需求。挑一个简单 bug 走 plan 模式，你对它的产出做严格 diff review，不符合团队风格的 → 反馈进 CLAUDE.md 或对应 Skill。再让它做第二个，迭代到产出基本符合预期。走 1-2 天，后面几个月都受益。

**小结：** 新项目落地难的不是"配 CLAUDE.md"，而是把你脑子里的隐性工程判断显式化。这套 6 步流程的精髓是：先考古、再分层、用示例锚定风格、小任务迭代校准——而不是一口气写完然后指望它完美。

## 5. 大仓定位代码的日更 SOP

### 需求型："我要做 X 功能，涉及哪些模块？"

```
1. /clear
2. @CLAUDE.md（明确涉及哪个子系统也 @ 对应 CLAUDE.md）
3. "进入 plan 模式。ultrathink。不要改代码。
   调 code-explorer 去做调研，只把清单返回。
   产出：业务流程(3-8步) / 每步涉及的文件:行号 / 需新增的文件 /
         需修改的文件 / 风险点 / 测试计划 / 建议的 PR 拆分"
```

### Bug 型："这个错误在哪触发的？"

```
1. /clear + 贴完整错误信息
2. "ultrathink。先不要改代码。
   a) 从 stack trace 定位最上面的业务代码帧
   b) 提出 3 个最可能的根因假设，每个给出证据、反证、最小验证方法
   c) 排序给出优先验证顺序
   等我选一个再继续。"
```

**关键：两段式（先假设 → 再验证）比直接让它修 bug 效果好得多。** 把你自己查 bug 的思维过程显式化给 CC。

**小结：** 大仓导航的核心原则是"让 CC 在需要的时候看到需要的那部分"。Explorer subagent 做脏活 + plan 模式防冲动 + 结构化产出便于 review——这是反复验证过的高效组合。

## 6. 一个"从零让 CC 符合团队要求"的 Checklist

- [ ] 根目录 CLAUDE.md：项目速览 + 铁律 + 目录地图 + 风格锚点 + Skills 索引
- [ ] 关键子模块 `*/CLAUDE.md`：模块特有规则、踩坑记录
- [ ] `.claude/skills/` 至少 3 个：内部框架 × N + 团队方法论
- [ ] `docs/frameworks/` 同步内部框架文档（或让 CC 从代码归纳）
- [ ] `.claude/settings.json` 配好 PostToolUse typecheck/lint hook
- [ ] 配好 `/permissions`：限制危险 bash、限定工作区
- [ ] 接入 1-2 个 MCP（至少 Git 托管 + 任务系统）
- [ ] 选 2-3 个"好样本文件/模块"写进风格锚点
- [ ] 走一次小任务校准，把发现的偏差回写到 CLAUDE.md
- [ ] 提交到 git 并让团队成员也 pull 一份

## 总结

让 CC 真正理解你的代码库，本质上是三件事的层层推进：

1. **编码隐性知识**：把团队规范、内部框架用法、历史遗留约束从人脑搬到 CLAUDE.md 和 Skills
2. **精准上下文管理**：分层 CLAUDE.md + `.claude/rules/` + auto memory 三层互补，确保 CC 在该看到的时候看到该看的
3. **迭代校准**：别指望一次写对。小任务跑起来，发现偏差就回写，两周下来准确度会有质的飞跃

这套体系一旦搭好，新同事 clone 仓库后开 CC 就能直接干活——架构约束、代码风格、踩坑记录全部内化在工具链里。这才是 AI 时代的团队知识管理。

[返回博客列表](./index)
