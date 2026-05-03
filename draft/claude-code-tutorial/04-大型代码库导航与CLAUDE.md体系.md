# 04 · 大型代码库导航与 CLAUDE.md 体系

> 场景：几十万行 ~ 数百万行代码、几十个模块、跨多个团队维护多年的仓库。
> 目标：读完这篇，你能让 CC 在这种规模下**快速定位、精准改动，且不烧光你的 token 预算**。

## 1. 先认清一个事实：上下文就是钱

Claude 的上下文窗口再大也有上限，而且：

- **越长越贵、越慢、越容易遗忘中间部分**（attention dilution 是真实存在的）。
- 你塞 30 万行源码进去，不会让它变强，反而会让它抓不住重点。

所以处理大仓的核心原则永远是：

> **让 CC 在需要的时候，看到需要的那部分。**

围绕这个原则，CC 给了四种工具：

1. **分层 CLAUDE.md**（常驻、按目录作用域）
2. **Skills**（按触发条件加载）
3. **`@` 引用**（显式加载）
4. **Subagent 探索**（隔离探索，返回摘要）

下面逐一展开。

## 2. 分层 CLAUDE.md 体系

### 2.1 加载规则（心智模型）

CC 的 CLAUDE.md 加载方向有两个：

- **向上聚合**（启动时一次性）：从 `cwd` 一路向上找所有 CLAUDE.md，全部加载。
- **向下按需**（运行时增量）：当 CC **读取/操作某个子目录里的文件**时，那个子目录链路上的 CLAUDE.md 会被自动追加进上下文。

```
~/.claude/CLAUDE.md                  # 全局（启动时加载，你个人跨所有项目）
<repo>/CLAUDE.md                     # 项目级（启动时加载）
<repo>/backend/CLAUDE.md             # CC 操作 backend/ 下文件时按需追加
<repo>/backend/billing/CLAUDE.md     # 操作 billing/ 下文件时再追加
```

> 还可以在任意 CLAUDE.md 里用 **`@path/to/file`** import 语法把另一份 md 按需引入（例如 `@docs/architecture.md`、`@~/secrets/team.md`）。**嵌套上限是 5 层**（hops），超过会被静默忽略；监控仓库不要套太深。
>
> 第一次遇到外部 import 时 CC 会弹批准对话框，拒绝后该 import 就一直关闭、不再问。

> **关于 `CLAUDE.local.md`**：它**仍然是官方支持的特性**（用于个人/不进 git 的项目级偏好，配合 `.gitignore`），不是被废弃的。和 `@path/to/file` import 语法二选一即可——前者文件名硬编码、加载顺序固定；后者更灵活，可以引用 `~/` 下的私有文件。

**一个根 CLAUDE.md 不够用**，因为：

- 一条规则可能只对某个模块适用（如"计费模块的数字一律用 Decimal 不得用 number"）
- 写进根会让它常驻所有会话 → 浪费 token
- 屎山历史可能只集中在某些模块 → 应该写在那个模块里

### 2.2 分层结构模板

推荐四层：

| 层级 | 文件 | 内容 |
|------|------|------|
| 全局 | `~/.claude/CLAUDE.md` | **个人偏好**：喜欢的 commit 风格、默认语言、默认模型 |
| 项目 | `<repo>/CLAUDE.md` | 项目铁律 + 目录地图 + Skills 索引 + 风格锚点 + 命令速查 |
| 子系统 | `<repo>/<area>/CLAUDE.md` | 该子系统特有的架构、依赖、命令 |
| 模块 | `<repo>/<area>/<module>/CLAUDE.md` | 该模块的历史坑、兼容约束、"动这里前先看 X" |

### 2.3 每一层写什么（模板）

#### 根 `CLAUDE.md`（项目地图）

```markdown
# <项目> 项目地图

## 这是什么
<两句话业务 + 技术>

## 顶层目录地图
- `apps/web/`           用户端前端 (Next.js 14)  - owner: @team-web
- `apps/admin/`         后台前端                  - owner: @team-web
- `services/api/`       主 REST API               - owner: @team-platform
- `services/billing/`   计费服务（高风险）         - owner: @team-billing
- `services/worker/`    异步任务                  - owner: @team-platform
- `packages/domain/`    跨服务共享领域模型         - owner: @team-platform
- `packages/ui/`        设计系统                  - owner: @team-web
- `infra/`              Terraform / k8s            - owner: @team-sre
- `tools/`              一次性脚本                - 无 owner，随便加

## 全局铁律
（见 03 篇的常见条目）

## 命令
pnpm dev:web | dev:api | test | test:int | lint | typecheck

## Skills 索引
...

## 怎么找代码（给 CC 的导航提示）
- 找 API 入口：从 `services/api/src/routes/**` 开始
- 找后台入口：从 `services/api/src/admin-routes/**`
- 找领域模型：先看 `packages/domain/src/<aggregate>/`
- 找外部集成：`services/api/src/integrations/<provider>/`
- 找定时任务：`services/worker/src/jobs/**`
```

> 重点：**"怎么找代码"**这一节是给 CC 看的导航提示，等同于人类的 README。它会大幅减少无谓的 glob/grep 次数。

#### 子系统 `services/billing/CLAUDE.md`

```markdown
# Billing 服务

## 风险级别：高
这是收钱的服务，任何改动都要：
- 附单测 + 集成测试
- 涉及金额一律 Decimal.js，**严禁 JS number**
- 涉及货币一律显式 ISO 4217 code

## 子目录
- `src/pricing/`       定价计算（纯函数）
- `src/invoice/`       账单生成
- `src/gateway/`       对接支付网关（Stripe / 国内多家）
- `src/reconcile/`     对账（每晚批量跑）

## 关键不变量
1. 账单一旦 issued，金额不可修改，只能开 credit note
2. 对账差额超 0.01 必须报警（见 `reconcile/alert.ts`）
3. 所有金额运算必须通过 `Money` value object

## 踩坑记录（动代码前先看）
- Stripe webhook 的 `invoice.paid` 有时会在 `invoice.finalized` 之前到达，必须兼容乱序
- 国内某支付通道退款查询延迟 > 30min，对账要加 grace period
- 汇率表每天 00:05 UTC 更新，跨日计算要用对应日期的汇率
```

#### 模块 `services/billing/src/reconcile/CLAUDE.md`

```markdown
# 对账模块

**警告：动这里前必读**

## 为什么这个模块这么丑
2023 年紧急上线应付监管审计，架构被迫妥协。有重构计划（见 RFC-128），但暂时冻结。

## 禁止事项
- 禁止重构 `legacy-matcher.ts`（还在给财务部月报用）
- 禁止改 `schema/reconcile_v1.sql`（下游 BI 依赖）

## 允许的改动方向
- 在 `v2/` 下加新代码，不动 legacy
- Bug 修复走最小改动，附回归 test
```

### 2.4 CLAUDE.md 维护方法

#### 先澄清：CC **不会**自动更新 CLAUDE.md

这是故意的设计——记忆文件会常驻上下文（花 token）、会影响之后所有会话的行为，所以必须由人类显式决定往里写什么。同理，`/init` 是**初始化**命令，**不是**日常更新手段：新仓库跑一次就够了。已有 CLAUDE.md 时它会询问而不是无脑覆盖，但仍会改动结构，日常增量更新请走下面的四种方式。

#### 日常更新的四种方式（按方便程度排序）

| 方式 | 用法 | 典型场景 |
|------|------|---------|
| `#` 前缀 | 会话里直接发 `# Billing 模块金额一律用 Decimal` | 最顺手，临时想到一条规则 |
| 让 CC 帮你写 | "把刚才关于 X 的决策提炼成 2-3 条追加到 CLAUDE.md 的'踩坑记录'一节" | 任务结束时批量沉淀 |
| `/memory` | 打开专用编辑视图 | 做结构化整理 |
| 直接编辑文件 | 当普通 md 改 | 大范围重构 |

#### 什么改动需要回写？（判断标准）

**不是每次改动都要写**。只在满足以下任一条件时才值得回写：

1. 你在**不同会话里对 CC 讲过同一件事 ≥ 2 次** → 该写进去了
2. 发现了一条**你希望未来所有改动都遵守**的约束（不变量、禁止事项、命名）
3. 修 bug 时挖出的**历史坑**（如"Stripe webhook 会乱序到达"）→ 写进对应模块的 CLAUDE.md
4. **目录结构 / 命令 / 技术栈**发生变化（新增子系统、换包管理器、新 script）
5. 新增了 **Skill / Subagent / MCP** → 在"Skills 索引"一节登记

**不要**回写：

- 本次任务的具体实现细节（那是代码的事）
- 一次性的调试过程
- 个人临时偏好（这类应该进 `~/.claude/CLAUDE.md` 全局，而不是项目级）

#### 想要"半自动化"？用 Stop Hook

如果希望每次任务结束系统主动提醒你一下，加个 `Stop` hook（注意正确的嵌套层级：`<event> → matcher 对象 → 内层 hooks 数组 → handler 必须有 type`）：

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '[提醒] 本次会话是否有值得写进 CLAUDE.md 的规则？(y/N)'; read -r a; [ \"$a\" = \"y\" ] && $EDITOR CLAUDE.md || true"
          }
        ]
      }
    ]
  }
}
```

或更激进：让 CC 在 Stop 时**自己**判断并给出 diff 建议（但**不自动写**，交给你 confirm）：

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "claude -p '回顾本次会话，如产生值得沉淀到 CLAUDE.md 的规则/坑/决策，给出建议 diff；否则只回复 NO_UPDATE。不要修改文件。' --allowedTools Read"
          }
        ]
      }
    ]
  }
}
```

#### 大仓有多个 CLAUDE.md 时，怎么精确更新到哪一层？

`#` 前缀的选择器只给你两个**作用域层级**，不会让你选具体的子目录文件：

| 选项 | 实际文件 |
|------|---------|
| **User memory** | `~/.claude/CLAUDE.md`（全局） |
| **Project memory** | **当前工作目录往上最近的** `CLAUDE.md`（通常是项目根） |

> `CLAUDE.local.md` **仍然是官方支持**的（用于私有/不进 git 的项目级偏好，记得加 `.gitignore`）。要写"私有/不进 git"的记忆，两条路：

**a) 直接写 `CLAUDE.local.md`** — 文件名固定、自动按目录加载顺序拼接，最简单。

**b) 用 `@path/to/file` import** — 在某个 CLAUDE.md 里写 `@~/secrets/team.md`，可引用任意位置（包括家目录）的文件，更灵活。

也就是说，当你有 `<repo>/CLAUDE.md`、`<repo>/services/billing/CLAUDE.md`、`<repo>/services/billing/src/reconcile/CLAUDE.md` 三层时，`#` 默认只会写到**根**那一份。两种实战做法：

**a) 最稳：直接用自然语言指定文件**（推荐日常用）

```
把下面这条追加到 `services/billing/CLAUDE.md` 的"踩坑记录"一节：
Stripe webhook 的 invoice.paid 可能早于 invoice.finalized 到达，消费者必须幂等。
```

可以精确到**文件 + 章节**，CC 还会帮你保持格式一致。我个人 90% 的回写都走这条路。

**b) 任务结束批量沉淀**（最高效）

```
回顾本次会话，挑出值得沉淀的规则/坑/决策。然后：
- 通用规则 → 追加到根 CLAUDE.md 的"全局铁律"
- 只和计费相关 → 追加到 services/billing/CLAUDE.md 的"踩坑记录"
- 只和对账模块相关 → 追加到 services/billing/src/reconcile/CLAUDE.md

给出 diff 让我 review，不要直接写文件。
```

让 CC 自己做"归档到哪一层"的分类，你只管 confirm。

#### 一个小原则

**越模块化、越专有的规则，越要往深层子目录的 CLAUDE.md 里放**；只有全局铁律才进根。否则根 CLAUDE.md 会迅速膨胀，无关的会话也要为它付 token。

#### 三条维护原则

1. **规则是踩坑攒出来的，不是一次写完的**。发现 CC 偏了、发现它不知道某条历史包袱 → 立刻回写到最合适的那一层 CLAUDE.md。
2. **沉淀的最佳时机是任务刚结束**，而不是"等以后集中整理"——事后会忘。
3. **定期瘦身**：每季度 review 一次，删除过时条目（已完成的迁移、已废弃模块）。CLAUDE.md **不是堆积场**。

### 2.5 CLAUDE.md 不该放什么

- **大段 API 文档** → 放 `docs/`，让 CC `@` 引用
- **某种场景才用的 SOP** → 写成 Skill
- **敏感信息** → 严禁（CLAUDE.md 会进上下文）
- **机器生成的目录树/文件清单** → 浪费，CC 自己能 ls
- **废话客套** → 每一 token 都是钱

### 2.6 `.claude/rules/`：分层 CLAUDE.md 之外的另一种切分方式

大仓里把所有规则塞进一个 `CLAUDE.md` 会膨胀；分目录写多个 CLAUDE.md 又有"边界粒度不够细"的问题（一个 `services/api/CLAUDE.md` 里同时写了 controller 规范和 migration 规范，但前者不需要在你改 SQL 时常驻）。

官方方案是 `.claude/rules/`：每个文件一个主题，**支持 `paths` frontmatter 做路径作用域**——只有 CC 读到匹配的文件时才加载到上下文。

```text
your-project/
├── .claude/
│   ├── CLAUDE.md              # 主入口，全局铁律
│   └── rules/
│       ├── code-style.md      # 无 paths，全局加载
│       ├── api-handlers.md    # paths: src/api/**/*.ts
│       └── migrations.md      # paths: db/migrations/**/*.sql
```

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 开发规范
- 所有入口必须先做 zod 校验
- 错误用 AppError，不抛裸 Error
- ...
```

**什么时候用 `.claude/rules/` 而不是子目录 CLAUDE.md？**

| 用 `.claude/rules/` | 用子目录 CLAUDE.md |
|--------------------|-------------------|
| 规则按"文件类型 / glob 模式"组织（`*.test.ts`、`migrations/**`） | 规则按"业务模块边界"组织（billing 模块全套规范） |
| 同类规则跨多个目录复用 | 规则是单个目录强本地的踩坑记录 |
| 想细到"只在改 React 组件时加载"这种粒度 | 模块级"动这里前先看 X" |

两套机制不冲突，可以并存。`~/.claude/rules/` 也存在——放个人级的、所有项目通用的规则。

> **rules vs Skill 的 `paths`**：两者的 `paths` glob 看起来很像，但语义不同——**rule 是常驻片段**，匹配时把整段 markdown 拼进 system prompt；**Skill 是按需触发**，匹配时把 description 注入索引但 SKILL.md 正文要等到 CC 决定调用才加载。规则该常驻就用 rules，是 SOP 步骤就写 Skill，**不要把 SOP 塞进 rules**——会无谓占 token。

### 2.7 Auto Memory（v2.1.59+）：和 CLAUDE.md 互补的"自动记笔记"

CC 还有一个独立于 CLAUDE.md 的记忆系统——**auto memory**：CC 在会话过程中会自己判断"这条信息以后还有用"并写到 `~/.claude/projects/<project>/memory/MEMORY.md` 里，**每次新会话自动加载前 200 行 / 25KB**。

| | CLAUDE.md | Auto Memory |
|---|---|---|
| 谁写 | 你 | Claude 自己 |
| 内容 | 规范、铁律、架构 | 它发现的 build 命令、调试经验、你纠正过的偏好 |
| 作用域 | 项目 / 用户 / 组织 | 单个 git 仓库（所有 worktree 共享） |
| 文件 | `CLAUDE.md`、`CLAUDE.local.md`、`.claude/rules/*.md` | `~/.claude/projects/<project>/memory/*.md` |

**对资深工程师的含义：**

- 你不必再手动把"build 命令是 `pnpm dev:billing`"写进 CLAUDE.md——CC 会自己记。
- **但是**：auto memory 是 CC 的视角，可能写进一些你不希望的内容。**定期 `/memory` 打开 auto memory 文件夹 review、删错误条目**。
- 把它当成"低优先级补充"，**铁律仍然必须进 CLAUDE.md**——auto memory 只是上下文，不是强约束。
- 关闭：`{ "autoMemoryEnabled": false }` 或环境变量 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`。需要 CC v2.1.59+。

#### auto memory 文件结构

```
~/.claude/projects/<project-slug>/memory/
├── MEMORY.md              # 索引：每条 1 行，`- [Title](file.md) — hook`
├── user_role.md           # 单条记忆，frontmatter 含 type
├── feedback_testing.md
├── project_freeze.md
└── reference_grafana.md
```

每条记忆的 frontmatter：

```yaml
---
name: 简短记忆名
description: 一行触发条件描述（用于决定下次会话相关性）
type: user | feedback | project | reference
---
```

#### 四种 memory type（关键判断口诀）

| Type | 写什么 | 何时写 | 例子 |
|------|--------|--------|------|
| `user` | 用户角色、专业背景、偏好 | 第一次了解到 | "10 年 Go 经验、第一次碰 React" |
| `feedback` | 你纠正过 / 称赞过 CC 的方式 | 任何时候用户说"别这样"或"对就这样" | "测试不要 mock DB，因为 Q3 出过 mock 通过但生产挂的事故" |
| `project` | 当前在做的事、deadline、决策动机 | 新事实出现 | "2026-03-05 起前端冻结 merge" |
| `reference` | 外部系统在哪 | 用户提到 Linear/Grafana/Slack 频道 | "管线 bug 在 Linear `INGEST` 项目" |

> 别滥用 auto memory 写"代码 / 架构"——那些 git 和文件本身就是答案。auto memory 只记**从代码里看不出来的事**。

### 2.8 何时走 CLAUDE.md vs auto memory 的决策口诀

| 信息特征 | 该走哪 |
|---------|--------|
| 项目级铁律、所有团队成员都该知道 | `CLAUDE.md`（进 git） |
| 个人偏好、不该污染团队 | `~/.claude/CLAUDE.md` 或 auto memory |
| 上下文驱动（"今天才知道"、"这次发生过"） | auto memory |
| 路径敏感（只对某 glob 生效） | `.claude/rules/` 加 `paths` |
| SOP / 多步骤 | Skill |
| 外部系统访问 | MCP |

## 3. 大仓定位代码的 SOP

大仓里"这个需求涉及哪些代码"、"这个 bug 在哪"是最高频问题。下面是经过实战验证的两套 SOP。

### 3.1 需求型："我要做 X 功能，涉及哪些模块？"

```
1. /clear
2. @CLAUDE.md（根；如果你清楚涉及哪个子系统，也 @ 子系统 CLAUDE.md）
3. 描述需求，然后：

   "先进入 plan 模式。ultrathink。不要改代码。
    调用 code-explorer subagent 去做调研，只把清单和调用链返回，不要把源码贴给我。
    产出以下结构：
    a) 新需求的业务流程（3-8 步）
    b) 每一步涉及的现有代码位置（文件:行）
    c) 需要新增的文件/类/函数
    d) 需要修改的现有文件
    e) 风险点（并发、兼容、性能）
    f) 测试计划（单测、集成、e2e 各加哪些）
    g) 建议的 PR 拆分"
```

为什么这么做：

- `code-explorer` 把脏活累活（grep、read 大量文件）**隔离**到子代理里，主会话只拿到结论。
- Plan 模式防止它冲动改代码。
- 结构化产出便于你 review。

### 3.2 Bug 型："这个错误在哪触发的？"

```
1. /clear
2. 贴完整错误信息（stack trace、日志、复现步骤）
3. 如果有相关模块 @<area>/CLAUDE.md
4. 输入：

   "ultrathink. 先不要改代码。步骤：
    a) 从 stack trace 定位最上面的业务代码帧
    b) 读那个文件，找到可能触发路径
    c) 提出 3 个最可能的根因假设，每个假设给出：
       - 证据（代码行号）
       - 不成立的反证
       - 最小验证方法（跑什么命令 / 读哪个文件）
    d) 排序给出优先验证顺序
    不要修复，等我选一个再继续。"
```

这个两段式（先假设 → 再验证）比直接让它修 bug 效果好很多。**资深工程师自己查 bug 也是这么想的，只是把这个过程显式化给 CC**。

## 4. 文档化仓库知识的三层

大仓的"隐性知识"要主动文档化，让 CC 可见：

| 层级 | 形态 | 何时用 |
|------|------|-------|
| L1：常驻 | CLAUDE.md | 铁律、目录地图、owner |
| L2：按需 | `docs/` 里结构化 md | 框架文档、领域知识、历史决策 |
| L3：代码里 | 关键模块顶部注释、ADR | 为什么这样设计（Architecture Decision Record） |

特别建议：

- **建立 `docs/adr/` 目录**，用 ADR 模板（Context / Decision / Consequences）记录重大决策。CC 在改相关代码前 `@` 进来，能显著减少"不知道历史只会按通用最佳实践乱改"的问题。
- **建立 `docs/runbook/`**：常见故障处理流程。CC 查线上问题时可以直接 `@`。

## 5. 让 CC 高效"认识"仓库的 3 个具体动作

### 5.1 建一个 `code-explorer` subagent（每个大仓标配）

`.claude/agents/code-explorer.md`：

```markdown
---
name: code-explorer
description: 只读代码探索，返回文件清单、函数签名、调用链摘要
tools: Read, Grep, Glob
model: haiku                 # Haiku 4.5，探索任务又快又便宜
isolation: worktree          # 跑在临时 worktree，零改动自动清理
permissionMode: plan
maxTurns: 30
effort: low
---

你是代码考古专家。硬规则：
1. 只读，不改任何文件
2. 输出必须结构化：文件清单 / 关键函数 / 调用关系 / 不确定点
3. 不要把大段源码贴回主会话，用"文件:行号"代替
4. 你不知道的地方明确说 UNKNOWN，不要猜
5. 单次任务预算有限，发现代码量太大先汇报边界，不要一头扎进去
```

用法："让 code-explorer 去找所有对 PaymentIntent 状态机的修改点。"

### 5.2 建一个 `repo-map` Skill（半自动维护目录地图）

当仓库目录频繁变动时，手动维护根 CLAUDE.md 的目录地图很烦。可以写个 Skill：

```markdown
---
name: repo-map-refresh
description: 扫描仓库顶层结构，更新 CLAUDE.md 中"顶层目录地图"一节
---

步骤：
1. 读当前 CLAUDE.md 的"顶层目录地图"小节
2. ls 顶层目录，对比差异
3. 对每个新增目录：读里面 README 或前几个文件推断用途
4. 对每个消失目录：标红提醒用户
5. 产出 diff 给用户 confirm 再写入
```

### 5.3 利用 git 信号

告诉 CC 可以用 git 信号做判断（写进 CLAUDE.md 的"怎么找代码"一节）：

```markdown
## 寻找代码时可用的 git 信号
- 最近改得多的热点文件：`git log --since=3.months --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20`
- 某个特性的历史起源：`git log -S"<关键字>" --oneline`
- 最近一次改 X 的人：`git log -p <file> | head -50`
- 某 glob 范围的最近活动：`git log --since=1.month -- 'services/billing/**'`
- 改动规模分布：`git diff --shortstat origin/main...HEAD`
```

> **进阶**：跨多个子目录做"考古"时，用 `/batch` 派发多个 worktree subagent 并行跑 git log（每个限定一个 path glob），再把结论合并——比串行扫一个大仓快几倍。

这样 CC 会主动用这些命令做侦察，而不是只会 grep。

## 6. 针对 monorepo 的特别建议

- 根 CLAUDE.md 写清 **包之间的依赖方向约束**（谁能 import 谁）
- 每个 package 独立 CLAUDE.md，声明对外 API 边界
- 配置 Hook：当 CC 在 `packages/domain/` 下改代码时，强制 `pnpm --filter domain test` 过
- 利用 `pnpm --filter ...<path>` 这类命令做"受影响子集"测试，别让 CC 跑全量
- **`claudeMdExcludes`**（在 `.claude/settings.local.json`）：在巨型 monorepo 里，往上走会捞到其他团队的 CLAUDE.md，污染上下文又费 token。用 glob 排掉：

  ```json
  {
    "claudeMdExcludes": [
      "**/monorepo/CLAUDE.md",
      "/abs/path/other-team/.claude/rules/**"
    ]
  }
  ```

  managed policy 层的 CLAUDE.md 不能被排除（公司级铁律强制可见）。

- **小技巧**：CLAUDE.md 里 **块级 HTML comment（`<!-- ... -->`）会在注入 context 前被剥离**——给人类维护者留笔记不花 token，正合适。代码块里的注释保留。

## 7. 针对多语言混合仓库（后端 + 前端 + infra）

- 按"技术栈"分子目录 CLAUDE.md，各自写自己的语言规范
- 根目录只放**跨语言共识**（命名、日志、i18n、时间）
- 为每种语言配专属 Hook（TS typecheck、Py mypy、Go vet、Tf fmt）

## 8. 最后：一个"大仓定位代码"的日更小贴士

每天第一个任务开始前，让 CC 先做一分钟"本日热点报告"：

```
claude -p "/clear && 运行 git log --since=yesterday --stat，
           总结昨天合入的 PR 涉及哪些模块、引入了什么变化。
           如果我今天的任务可能和这些有冲突，提醒我。"
```

配合 cron 或 shell alias，你每天早上打开电脑就能知道"昨晚队友动了哪儿"。

---

下一步：[05 · 进阶技巧与认知外知识](./05-进阶技巧与认知外知识.md)
