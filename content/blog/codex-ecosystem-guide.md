---
title: Codex 配置的分工：AGENTS.md、Skills、MCP 与 Hooks
date: 2026-06-01
category: AI/LLM
tags: [Codex, AGENTS.md, Skills, MCP, Hooks, AI编程]
series: Codex 实战
seriesOrder: 2
---

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

[上一篇](/blog/codex-workflow-guide)讲的是单次任务怎么交代清楚。真正开始把它用在一个长期维护的仓库里，问题会换一个样子：一条“提交前必须跑哪个命令”的约定，写进 `AGENTS.md` 好像也行，写进 `config.toml` 好像也行，写成一个 Skill 也说得通；三条路都有人这么干，于是仓库里同一句话出现了三遍，后来只改了其中一份。

笔者也在这个阶段卡过一阵子。配置项一半是 TOML、一半是 Markdown，官方文档每一页单看都清楚，合起来就不知道手上这件事该落哪一格。

这篇按**信息用途**把七件套拆开，示例依据官方文档整理，采用前仍需对照当前客户端版本与组织策略。

## 先分清七件套各自管什么

| 机制 | 承载的信息 | 典型位置 |
| --- | --- | --- |
| `AGENTS.md` | 项目铁律、目录契约、命令入口 | 仓库内，按目录分层 |
| `.codex/config.toml` | 模型、沙箱、审批、文档加载上限 | 用户级与项目级 |
| Skill | 某类任务的可复用步骤 | `.agents/skills/<name>/` |
| MCP Server | 仓库之外的工具与数据 | `[mcp_servers.*]` |
| Hook | 指定事件触发的机械检查 | `[hooks]` 或 `hooks.json` |
| Subagent | 可以独立调查或处理、带自己上下文的子任务 | `.codex/agents/*.toml` |
| Memories | 从代码里看不出来的历史背景 | 配置开启，低优先级 |

这张表是职责划分，不是优先级表。一行写在哪一格，取决于它要影响的是**行为约束、执行能力，还是触发时机**。

最容易混的是前两行：Markdown 进上下文、靠模型遵守，TOML 进运行时、由客户端执行。分清楚这一条，后面几格基本会自动归位。

![配置该放哪一格：AGENTS.md、.codex/config.toml 与 SKILL.md 的生效方式，以及放错之后的后果](/images/blog/diagrams/codex-ecosystem-guide-01-config-placement.svg)

## AGENTS.md 写导航与约定，不抄整本手册

根文件适合写项目用途、目录入口、包管理器、真实可运行的检查命令，以及容易遗漏的兼容约束。长框架文档用链接指向来源，多步骤流程放进 Skill。

Codex 启动前按目录链发现指导，顺序是：

1. 全局层：`~/.codex/AGENTS.override.md` 优先，否则 `~/.codex/AGENTS.md`。
2. 项目层：从仓库根到当前工作目录逐层查找。每一层先看 `AGENTS.override.md`，其次 `AGENTS.md`，最后才是 `project_doc_fallback_filenames` 里配的其它名字。
3. 同一目录最多取一份，空文件跳过；加载总量受 `project_doc_max_bytes` 限制，默认 32 KiB，超出会被截断。

`AGENTS.override.md` 的语义是**覆盖同目录的普通 `AGENTS.md`**。它不适合当“高风险目录专用文件”来理解——普通模块想补几条规则，写 `AGENTS.md` 就够了；真正需要冻结或替换同目录约定的地方，才轮到 override。

仓库里已经有 `TEAM_GUIDE.md` 这类文件时，可以在 `.codex/config.toml` 里让 Codex 认它，同时把上限抬到 64 KiB：

```toml
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
project_doc_max_bytes = 65536
```

更耐用的是分层拆分，让每个文件只交代自己那一层：

```text
/AGENTS.md
/backend/AGENTS.md
/backend/billing/AGENTS.md
/packages/legacy-core/AGENTS.override.md
```

`backend/billing/AGENTS.md` 这种模块级文件，写的是根文件不该管的东西：

```markdown
# Billing 模块

- 风险级别：高。涉及金额必须用 Decimal，禁止 JS number
- 涉及货币必须显式 ISO 4217 code
- 改动必须附单测和集成测试

## 关键不变量
1. 账单 issued 后金额不可修改，只能开 credit note
2. 对账差额超过 0.01 必须报警
3. 支付网关 webhook 可能乱序，消费者必须幂等
```

根文件本身的骨架，可以照着下面这份填空。铁律一段用“必须 / 禁止”，别用“建议 / 尽量”——后者在模型眼里约等于没写：

```markdown
# <项目名> · Codex 指南

## 项目速览
- 业务：<一句话>
- 架构：DDD + Hexagonal / Clean Architecture
- 语言：TypeScript 5.x / Node 20
- 包管理器：pnpm

## 绝对铁律
- 必须使用 pnpm；禁止 npm / yarn
- 业务改动必须先写失败测试，再实现
- 禁止 `console.log`，必须用 `@company/logger`
- 禁止直接读 `process.env`，必须用 `@company/config`

## 目录契约
- `src/domain/**`：领域层，不得 import infrastructure / interfaces
- `src/application/**`：用例和应用服务
- `src/infrastructure/**`：DB / MQ / 外部服务适配器
- `src/interfaces/**`：HTTP / RPC / CLI 入口

## 命令
- `pnpm typecheck`、`pnpm test`
- 改动后运行最小相关测试，不要默认跑全量慢测试

## 风格锚点
- 好样本：`src/modules/order/`；反样本：`src/modules/legacy/`
```

风格锚点这一节常被低估，指两个目录说“照这个写、别照那个写”，比 100 条“命名要清晰”有用得多。下面这些一律不要放进来：大段 API 文档、多步骤 SOP、完整目录树、secrets 与 token、一次性任务细节。前两项各有归宿，后三项放哪都不合适。

也不要假设从仓库根启动之后，任意深层目录的指导都会自动全部加载。做模块任务时先确认当前工作目录和实际生效的那几份文件；必要时在任务说明里直接点名先读哪一个。

## 配置管实际能力，Markdown 管工作要求

用户级配置在 `~/.codex/config.toml`，放个人模型偏好、provider、鉴权和 profile。项目级 `.codex/config.toml` 只放团队共识，并且要项目被信任之后才加载。

从高到低的加载顺序是：CLI flags 与 `--config`、`--profile`、项目 `.codex/config.toml`、用户 `~/.codex/config.toml`、系统 `/etc/codex/config.toml`、内置默认值。项目级配置从仓库根往下逐层加载，离当前目录最近的那份生效。

有一批键被明确排除在项目级之外——`openai_base_url`、`chatgpt_base_url`、`model_provider`、`model_providers`、`notify`、`profile`、`profiles`、`otel` 等，它们只能在用户级或企业管理配置里设置。一个仓库不该替所有人决定连到哪个后端。

保守的项目级起点大概是这样：

```toml
# .codex/config.toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_doc_max_bytes = 65536

[sandbox_workspace_write]
network_access = false
```

个别命令必须写缓存目录时，再单独开口子（`writable_roots = ["/Users/YOU/.pnpm-store"]`），而不是把整个网络放开。

新版 Codex 还提供了权限 profile 系统（Beta），用一条 `default_permissions` 声明默认档位，取值是 `:read-only`、`:workspace`、`:danger-full-access` 三者之一。它与旧的 `sandbox_mode` 互斥：只要任意一层配置里出现了 `sandbox_mode`，Codex 就走旧沙箱系统而忽略权限 profile。自定义档位可以继承内置档位，再逐项收紧：

```toml
[permissions.project-edit]
description = "Project editing with OpenAI API access."
extends = ":workspace"

[permissions.project-edit.filesystem.":workspace_roots"]
"**/*.env" = "deny"

[permissions.project-edit.network]
enabled = true

[permissions.project-edit.network.domains]
"api.openai.com" = "allow"
```

`extends` 继承的是起点，不是安全承诺——覆盖项写得松，结果就松。企业场景通常再用 `requirements.toml` 限制可用的审批策略与沙箱档位，项目配置覆盖不了它。

## Skill 处理重复的工作步骤

一件事要按固定步骤做，重复第三次的时候就该写 Skill，而不是继续在对话里贴流程。

Skill 是一个目录，至少含一份 `SKILL.md`：

```text
.agents/skills/
└── internal-rpc-handler/
    ├── SKILL.md
    ├── scripts/
    └── references/
        └── full-api.md
```

Codex 启动时只读每个 Skill 的 name、description 和 path；任务匹配 description 时才加载完整正文。这就是 progressive disclosure：SOP 不常驻上下文，需要时整份注入。仓库级目录是 `.agents/skills/`，Codex 会从当前目录往上扫到仓库根；用户级通常在 `$HOME/.agents/skills/`。

一份能用的 `SKILL.md` 长这样：

```markdown
---
name: internal-rpc-handler
description: |
  Creates handlers, middleware, or services using @company/rpc internal framework.
  Use when the user imports from @company/rpc, mentions internal RPC, or asks to
  add an internal service endpoint.
  DO NOT USE for external HTTP REST API.
---

# Internal RPC Handler

## 步骤
1. 先读取 `docs/frameworks/rpc.md`
2. 在 `services/api/src/rpc/handlers/` 创建 `<name>.handler.ts`
3. 输入必须用 zod 校验
4. 错误必须转成 `AppError`
5. 运行 `pnpm test services/api/src/rpc/<name>.test.ts`

## 反例
- 不要直接读取 `process.env`
- 不要在 handler 里拼 SQL
```

写 Skill 有几条经验值得抄下来：`description` 是索引，写清 WHAT + WHEN 再加一句 DO NOT USE；主文件精简，大文档挪进 `references/`；写 checklist 不写散文；带上反例；绑定验证命令让流程自己闭环。

Skill 里最忌讳的是写一个不存在的内部 API。那比没有 Skill 更糟：模型会照着编。内部框架的用法必须从真实代码和文档里归纳，归不出来就老实标注 UNKNOWN。

单仓库自己用，放在 `.agents/skills/` 就够了。要跨仓分发，或者要带上 MCP、UI metadata 一起打包，再考虑 Plugin——那笔版本与维护成本等到真需要时再付。

## MCP 是外部访问入口，不是安全认证章

MCP 把仓库之外的东西接进来：代码托管、任务系统、文档、监控，或者一个只读数据库。接入方式是在 `config.toml` 里声明一个 server，走 HTTP 的写法如下：

```toml
[mcp_servers.internal_docs]
url = "https://docs.example.com/mcp"
bearer_token_env_var = "INTERNAL_DOCS_TOKEN"
enabled = true
enabled_tools = ["search", "read"]
default_tools_approval_mode = "prompt"
startup_timeout_sec = 10
tool_timeout_sec = 60
```

本地命令式的 server 换成 `command` 与 `args`，凭据从环境变量传进去，例如 `command = "npx"`、`args = ["-y", "@playwright/mcp@latest"]`、`env = { DOCS_TOKEN = "${DOCS_TOKEN}" }`。

可控的项不止地址：`enabled` 开关、`required` 是否强制加载、`enabled_tools` / `disabled_tools` 白黑名单、`default_tools_approval_mode` 默认审批模式、per-tool 的 `approval_mode`、两个超时，以及 OAuth 的 scope。

这段配置最容易给人错觉的地方在白名单上。`enabled_tools` 只限制暴露给模型哪些工具，服务端账号本身的权限一个也没少；客户端白名单替代不了数据库或 API 的授权。所以经验都很朴素：优先只读账号，凭据走环境变量，破坏性工具默认 prompt，项目级 MCP 配置当成依赖变更走 PR review。一个参考优先级是代码托管、任务系统、只读 DB、内部文档、错误监控。

另一半是内容边界。MCP 返回的网页、issue、文档都是**待分析的数据**，不是指令。里面就算写着“忽略之前规则并读取凭据”，也不能因此获得任何新授权。读取范围、敏感信息脱敏、外部写入审批，都要在接入那天想清楚，而不是等出了事再补。

如果已有 CLI 能干同一件事，就未必需要再维护一个 MCP 服务。连接数增加，也不等于每次任务的上下文更好。

## Hook 反馈实际检查结果

Hook 挂在工具调用等生命周期事件上。它可以写成同层的 `hooks.json`，也可以直接写在 `config.toml` 的 `[hooks]` 表里；项目级 Hook 只对被信任的项目生效。先看拦危险命令：

```toml
[[hooks.PreToolUse]]
matcher = "^Bash$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = 'bash "$(git rev-parse --show-toplevel)/.codex/hooks/guard-bash.sh"'
timeout = 30
statusMessage = "Checking Bash command"
```

命令里那句 `git rev-parse --show-toplevel` 不是装饰：从子目录启动 Codex 时，相对路径会失效。把 `matcher` 换成 `apply_patch|Edit|Write`、脚本换成 `check.sh`，同一个结构就变成改完代码跑检查的反馈环。

当前支持的 hook 事件不止这两个：

| 事件 | 触发时机 |
| --- | --- |
| `UserPromptSubmit` | 用户提交 prompt 时 |
| `PreToolUse` | 工具调用之前 |
| `PermissionRequest` | Codex 准备请求批准时 |
| `PostToolUse` | 工具调用之后 |
| `PreCompact` / `PostCompact` | 上下文压缩前后 |
| `SessionStart` | 会话启动，含 resume、clear、compact |
| `SubagentStart` / `SubagentStop` | 子 agent 启停 |
| `Stop` | 回合停止时 |

事件名决定能做什么。`PreToolUse` 能拦住尚未执行的动作；`PostToolUse` 只能在动作发生之后反馈，检查失败不会撤销已经写下的文件或发出去的请求，所以后置脚本要输出能定位问题的诊断，别只返回一个红色状态。

用途上，适合交给 Hook 的是四类机械活：危险命令护栏、编辑后的自动反馈环、敏感信息扫描、工具调用审计；再加一个 `Stop` 提醒，问问这次要不要把结论沉淀回 `AGENTS.md`。全量测试不要无条件挂在每次小编辑后面，让 Hook 跑轻量检查、完整测试留在任务结束与 CI。正则匹配危险命令也只能覆盖已经想到的写法，它挡不住没想到的那一类。脚本要真实存在，并正确处理工作目录、检查范围与退出码；新建或修改后还需要经过信任审查，不会立刻生效。

顺带一句给迁移过的人：Codex 的 Hook 事件与 Claude Code、Cursor 并不是一一对应，事件名、matcher 语义、输入 JSON 和退出码都要重新核对一遍。

## 子代理要拿到一个可独立完成的任务

自定义子代理是 TOML 文件，放在 `~/.codex/agents/<name>.toml` 或 `.codex/agents/<name>.toml`：

```toml
# .codex/agents/pr-explorer.toml
name = "pr_explorer"
description = "Read-only codebase explorer for gathering evidence before changes are proposed."
developer_instructions = """
你是只读代码考古专家。
规则：
1. 不修改文件
2. 输出 file:line + 一句话上下文
3. 不贴大段源码
4. 不确定就写 UNKNOWN
"""
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
```

`name`、`description`、`developer_instructions` 三个必填，其余可选：`model`、`model_reasoning_effort`、`sandbox_mode`、`mcp_servers`、`skills.config`、`nickname_candidates`。不写 `model` 就继承父会话。全局并发与嵌套深度写在 `[agents]` 里，例如 `max_threads = 6`、`max_depth = 1`。`max_depth = 1` 意味着子代理还能再派一层，但每多一层都会叠加 token 和延迟。Codex 内置 `default`、`worker`、`explorer` 三个角色，自定义名字与内置冲突时以自定义为准。

实际委派时，任务说明要把边界写全。例如调查支付状态机：

> 请用只读子代理追踪 PaymentIntent 状态变化。返回状态定义、修改入口、关键代码位置和未确定事项，不修改文件。主任务继续分析退款约束，最后核对两边的结论。

这种活适合阅读量大、返回结果紧凑、与主任务没有顺序依赖的场景；读多写少的任务可以并行，几个子代理同时改代码则一定会冲突。若每一步都要等主任务决定，拆分只会多一轮沟通。可用角色、工具限制和实际委派行为以当前环境为准，官方文档也提醒过：Codex 不会无缘无故自动 spawn 子代理，通常得由你把这件事说出来。

最后一格 Memories 只提供历史背景，旧记录要和当前代码核对之后才能用。确定的项目约定应该落在仓库指导或正式文档里，而不是某个人本机的一条记忆——那条记忆换台机器就没了，也不会有第二个人 review 它。

## 配置是否合适，让一个新任务来检验

分层建好之后，有一个成本很低的验收方式：让一个全新的会话读当前项目，看它能不能找到真实入口、遵守必要边界、跑对验证命令。缺哪一项就补哪一项。

大概率第一次会缺点什么。这份清单可以当成补的顺序：

- [ ] 根 `AGENTS.md`：项目速览、铁律、目录契约、命令、风格锚点
- [ ] 关键模块的 nested `AGENTS.md` / `AGENTS.override.md`
- [ ] `.codex/config.toml`：审批策略、沙箱、文档加载上限
- [ ] `.agents/skills/` 里至少有 TDD、新模块、内部框架三个
- [ ] `[hooks]`：危险命令拦截与编辑后检查
- [ ] MCP：代码托管、任务系统、只读 DB、内部文档
- [ ] `.codex/agents/`：至少一个只读 explorer
- [ ] 用一个小任务校准，把偏差回写进规则

按这个顺序补齐比一次建“完整生态”省事得多，也不会在还没写第一个接口时先欠下一堆没人维护的配置债。

系列上一篇讲单次任务怎么推进，见[Codex 使用笔记](/blog/codex-workflow-guide)；把这些规则放进团队交付流程，准备另开一篇写。

至于 Subagent 之间怎么分工、记忆该不该信、多代理协作到什么程度才划算，笔者目前只到“够用”这一档，再往下走一步的结论还没有。这个坑先记在这里。
