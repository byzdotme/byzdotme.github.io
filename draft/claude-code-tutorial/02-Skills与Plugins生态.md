# 02 · Skills 与 Plugins 生态

> 目标：读完这篇，你能分清 **Skills / Plugins / Subagents / MCP / Hooks** 这五件套在做什么事，知道什么场景选什么、怎么装、怎么写自己的。

## 0. 先搞清楚五件套的关系

很多人把 Skills 和 Plugins 混为一谈，其实它们**一个是"知识/SOP"，一个是"打包分发单位"**。下面这张图是正确的心智：

```
            ┌───────────── Plugin (分发/安装单位) ─────────────┐
            │                                                   │
            │   可包含：Skills  +  Subagents  +  MCP servers   │
            │            +  Hooks  +  Slash commands            │
            │                                                   │
            └───────────────────────────────────────────────────┘

    Skill      = 一份 SKILL.md，告诉 Claude "遇到 X 场景该怎么做" (SOP)
    Subagent   = 一个专门角色 (只读探索 / 测试执行 / 代码审查 ...)
    MCP Server = 连接外部系统 (数据库 / Jira / 内部监控 / 公司 wiki)
    Hook       = 事件钩子 (编辑前/后、工具调用前/后 触发脚本)
    Slash Cmd  = 已合并到 Skill：旧 .claude/commands/<x>.md 与
                  .claude/skills/<x>/SKILL.md 都创建 /<x>，前者继续
                  兼容但新写法都用 Skill（支持子文件、frontmatter、
                  自动触发）。同名时 Skill 优先。
```

结论：

- **"我要让 CC 在遇到 X 场景时按 Y 步骤做"** → 写一个 **Skill**
- **"我要让 CC 能连上我们公司 Jira/监控/数据库"** → 配一个 **MCP Server**
- **"我要把一堆相关能力发给团队共享"** → 打包成 **Plugin**
- **"我要在每次改代码后自动跑 lint"** → 配一个 **Hook**
- **"我要一个专门只读探索代码、不污染主上下文的角色"** → 造一个 **Subagent**

## 1. Skills 深度

### 1.1 Skill 本质

一个 Skill 就是一个目录，里面至少有一个 `SKILL.md`，前置 frontmatter 声明**名字 + 触发描述**。CC 在处理用户任务时，会扫描所有可用 Skills 的描述，**按需加载**对应的 SKILL.md 内容到上下文中——这是 Skills 的核心价值：**按需注入上下文**，而不是常驻上下文。

最小骨架：

```
my-skill/
├── SKILL.md                # 必需
├── templates/              # 可选：代码模板、脚手架
├── scripts/                # 可选：辅助脚本
└── references/             # 可选：详细文档
```

`SKILL.md` 前言示例：

```markdown
---
name: internal-rpc-handler
description: |
  创建或修改公司内部 InternalRPC 框架的 handler。
  USE WHEN: 用户要求添加 RPC 接口、修改 handler、暴露内部服务、
           涉及 @company/rpc、@company/rpc-gateway 相关代码。
  DO NOT USE FOR: 外部 HTTP API (用 rest-api skill)。
allowed-tools: Read Edit Bash(pnpm test:rpc *)
paths: packages/rpc/**, services/*/handlers/**
disable-model-invocation: false
---

# InternalRPC Handler 创建规范

## 步骤
1. 在 `packages/rpc/handlers/` 下创建 `<name>.handler.ts`
2. 继承 `BaseHandler`，实现 `handle(ctx, req)` ...
...
```

**关键点：description 写得越具体、触发条件越清晰，CC 越准确知道什么时候加载它。**

#### 完整 frontmatter 字段表（截至 2026/04）

| 字段 | 作用 | 备注 |
|------|------|------|
| `name` | 显示名（省略则用目录名）；只允许小写字母/数字/连字符，≤ 64 字符 | 决定斜杠命令名 |
| `description` | 何时该用——CC 据此决定是否自动加载 | 与 `when_to_use` 合计上限 1536 字符，前置关键词 |
| `when_to_use` | 触发短语 / 例句的补充 | 拼接进 description 一并参与索引 |
| `argument-hint` | 自动补全时显示的参数提示 | `[issue-number]` 之类 |
| `arguments` | 命名位置参数列表 | 配合 `$name` 替换 |
| `disable-model-invocation` | `true` 则 CC 不会自动调，只能用户手敲 `/name` | 适合 deploy / commit 这种有副作用的 |
| `user-invocable` | `false` 则 `/` 菜单里隐藏，只让 CC 内部用 | 背景知识型 skill |
| `allowed-tools` | 此 skill 激活期间免授权的工具白名单 | 不限制可用工具，只是免弹窗 |
| `model` | 此 skill 激活期间临时切模型 | `inherit` 保持当前 |
| `effort` | 此 skill 激活期间临时切 effort 档 | low / medium / high / xhigh / max |
| `context` | `fork` 时跳到子代理执行 | 见 §3 |
| `agent` | `context: fork` 时用哪种 subagent | Explore / Plan / general-purpose / 自定义 |
| `hooks` | 该 skill 生命周期上的钩子 | 与全局 hooks 同 schema |
| `paths` | glob 模式，CC 只在动到匹配文件时才自动加载 | 与 `.claude/rules/` 路径作用域类似 |
| `shell` | `bash`（默认）或 `powershell` | Windows + PowerShell tool 时用 |

#### 字符串替换（被很多人忽略的能力）

SKILL.md 正文里能用的占位符：

| 占位符 | 含义 |
|--------|------|
| `$ARGUMENTS` | 用户输入的全部参数（一字符串） |
| `$ARGUMENTS[N]` / `$N` | 第 N 个位置参数（0-based）；`$0` 是第一个 |
| `$<name>` | 命名参数，配合 frontmatter `arguments: [issue, branch]` |
| `${CLAUDE_SESSION_ID}` | 当前会话 ID，写日志时常用 |
| `${CLAUDE_EFFORT}` | 当前 effort 档，可让 skill 自适应 |
| `${CLAUDE_SKILL_DIR}` | 该 skill 自己的目录绝对路径，用来引用同目录脚本 |
| `` !`<command>` `` | **预处理**：先在本地跑 shell，把 stdout 替换进 prompt 后再发给 Claude（不是让 Claude 跑） |

多行版本：

````markdown
## 当前环境
```!
node --version
git status --short
```
````

> 关掉这个能力（managed settings）：在 `settings.json` 设 `"disableSkillShellExecution": true`。

#### Skill 的生命周期：一旦加载，常驻到会话结束

调用一次 `/my-skill` 之后，渲染后的 SKILL.md 内容作为一条用户消息进入会话历史，**不会**在下一轮重读盘——所以：

- Skill 写"标准指令"，不要写"这一次的步骤"。
- 文件改了想生效，要**重新调用**这个 skill（或开新会话）。
- 触发 auto-compact 时，CC 会保留每个 skill 最近一次调用的前 5000 token，全部 skill 共享 25000 token 预算；超出的旧 skill 会被丢弃，可手动重调恢复。


### 1.2 Skill 放在哪里

| 作用域 | 路径 | 共享方式 |
|-------|------|---------|
| 个人全局 | `~/.claude/skills/<skill-name>/SKILL.md` | 只对你自己生效 |
| 项目级 | `<repo>/.claude/skills/<skill-name>/SKILL.md` | 随仓库提交，团队共享 |
| 通过 Plugin 分发 | 打包到 plugin 的 `skills/` 目录 | 跨项目共享 |

> 强烈建议：**团队约定的东西走项目级**（进 git），**个人习惯走全局**。

### 1.3 Skill 写作的 5 条黄金法则

1. **description 是索引**：把用户可能说的话、可能触发的文件类型全写进去（USE WHEN / DO NOT USE FOR 两段式）。
2. **SKILL.md 自己要精简**：核心 SOP 放主文件，大段示例/模板放 `templates/`、`references/`，让 CC 按需再读。
3. **写命令清单而不是散文**：资深工程师写的 skill 往往太啰嗦，不如写成"Step 1 → Step 2"的 checklist。
4. **包含反例**："不要这样做"比"要这样做"更能防止事故。
5. **绑定到可验证的产物**：例如"生成后必须跑 `pnpm test:rpc`"，让 CC 自带闭环。

### 1.4 值得推荐 / 值得自建的 Skills 清单

**通用官方 / 社区生态中典型的**（具体清单随时间变，这里列的是"类型"）：

- 各种文件格式处理：PDF、Excel、DOCX、PowerPoint 提取/生成
- 图像/视频处理：OCR、缩图、转码
- Git/PR 工作流：babysit-pr（追 CI、回复 review）
- Canvas / 图表渲染
- 特定框架脚手架（Next.js / Django / Rails route 生成）

**团队自建的高 ROI Skill 示例**（强烈建议你部门各搞一批）：

| Skill 名 | 用途 |
|---------|------|
| `internal-<框架>-<动作>` | 如 `internal-rpc-handler`、`internal-orm-model`、`internal-feature-flag` |
| `ddd-aggregate-new` | 按团队 DDD 规范新建聚合根（含目录结构、事件、仓储接口） |
| `add-test-tdd` | 强制 TDD：先写 failing test，再实现，并跑测试 |
| `bugfix-postmortem` | Bug 修复完自动生成根因 + 回归测试 + 事后总结模板 |
| `release-checklist` | 发版前自检：changelog、兼容性、迁移脚本 |
| `observability-add` | 为新模块统一加公司监控 SDK 的埋点、日志、trace |

### 1.5 怎么让 CC 帮你写 Skill

元操作：让 CC 帮你写 Skill 本身。Prompt 模板：

> "我们团队有一个内部框架 `@company/xxx`，核心用法如下 `<粘文档或 @docs/xxx.md>`。
> 帮我为这个框架生成一个 Skill，放在 `.claude/skills/` 下。要求 description 精准、SKILL.md 是 checklist 风格、templates 目录里放一个最小可用示例。ultrathink。"

## 2. Plugins

### 2.1 Plugin 是什么

Plugin 就是 **Skills / Subagents / MCP / Hooks / Slash commands 的打包壳子**，带 `plugin.json` 元数据，可以通过 **marketplace** 分发。

典型目录：

```
my-plugin/
├── plugin.json
├── skills/
│   └── foo/SKILL.md
├── agents/
│   └── test-runner.md
├── commands/
│   └── ship.md         # /ship 斜杠命令定义
├── hooks/
│   └── pre-commit.sh
└── mcp/
    └── servers.json
```

### 2.2 怎么装

> 命令是 **`/plugin`**（单数）。Plugin 走的是"先加 marketplace 再装 plugin"的两步模型，**不能**像旧版那样直接给一个 git URL 就装。

```bash
# Step 1：加一个 marketplace（catalog）
/plugin marketplace add anthropics/claude-code           # GitHub: owner/repo
/plugin marketplace add https://gitlab.com/foo/bar.git   # 任意 git URL
/plugin marketplace add ./my-marketplace                 # 本地目录

# Step 2：从该 marketplace 装具体 plugin
/plugin install commit-commands@anthropics-claude-code

# 官方 marketplace（claude-plugins-official）默认已加，可直接装：
/plugin install github@claude-plugins-official
```

或者直接 `/plugin` 打开交互界面，里面有四个 tab：**Discover / Installed / Marketplaces / Errors**，新手用 UI 更直观。

管理（命令式）：

```bash
/plugin disable <name>@<marketplace>
/plugin enable  <name>@<marketplace>
/plugin uninstall <name>@<marketplace>

/plugin marketplace list
/plugin marketplace update <marketplace>
/plugin marketplace remove <marketplace>

/reload-plugins                  # 安装/启用/禁用后无需重启，热加载
```

> 安装 scope 三档：**user**（你自己跨所有项目）/ **project**（写入 `.claude/settings.json`，团队共享）/ **local**（仅当前仓库且不共享）。CLI 用 `--scope` 指定，例如 `claude plugin install formatter@your-org --scope project`。

### 2.3 选型建议

| 决策 | 推荐做法 |
|------|---------|
| 只是自己 / 一个仓库用 | **不要打包 plugin**，直接放 `.claude/skills/` 或 `.claude/agents/` 即可 |
| 跨多个仓库复用 | 打成 plugin，放到公司内部 git，建一个内部 marketplace 让团队 `/plugin marketplace add` |
| 想从社区直接抄 | 先克隆到本地看 SKILL.md 和 hook 脚本，**不要盲装带 hook 的 plugin**——hook 会以你自己的权限跑脚本，是潜在攻击面 |

> 团队用法：在仓库 `.claude/settings.json` 里写 `extraKnownMarketplaces`，团队成员第一次信任目录时 CC 会主动提示安装这些 marketplace 和 plugin，省一道手动配置。

### 2.4 值得关注的 Plugin 类别

- **语言生态脚手架类**（Rails / Django / Next / Spring 等）
- **代码审查类**（给 /review 扩展更严格的规则集）
- **专有 SaaS 集成类**（Linear / Jira / Sentry / Datadog via MCP）
- **AI 工程化类**（evals、prompt 回归测试、LLM 可观测）

## 3. Subagents（子代理）

### 3.1 为什么需要它

主会话的上下文是**最宝贵的资源**。Subagent 的核心价值是**卸载任务并保护主上下文**：

- 让 subagent 去"读 200 个文件找出所有用了老配置的地方"——它会用光自己的上下文，但**只把总结返回**给主会话。
- 主会话还是干净的，继续推进高层决策。

### 3.2 定义 Subagent

路径：`.claude/agents/<name>.md` 或 `~/.claude/agents/<name>.md`

```markdown
---
name: code-explorer
description: 只读代码探索；用于快速回答"X 功能在哪实现"这类问题
tools: Read, Grep, Glob     # 白名单（省略 = 继承父会话全部工具，不是"无工具"）
model: haiku                # 探索类用 Haiku 4.5，又快又便宜
isolation: worktree         # 在临时 git worktree 里跑，零改动自动清理
permissionMode: plan        # 强制只读
maxTurns: 30
effort: low
---

你是一个只读探索专家。你的输出必须是：
1. 涉及的关键文件清单
2. 每个文件的关键函数
3. 调用链
不要做任何修改。
```

> **关键坑**：`tools` 字段**省略**和**写空字符串**含义不同——省略=**继承全部工具**，想真正限制必须显式写白名单。

#### Subagent frontmatter 完整字段（截至 2026/04）

| 字段 | 作用 |
|------|------|
| `name` / `description` | 同 skill |
| `tools` / `disallowedTools` | 工具白名单 / 黑名单 |
| `permissionMode` | 该 subagent 跑在哪个权限档（`plan` 强制只读最常用） |
| `model` | 切到更便宜的模型（探索/审查首选 Haiku 4.5） |
| `effort` | 该 subagent 的 effort 档 |
| `maxTurns` | 单次派发最多多少轮 |
| `skills` | 启动时预加载的 skill 列表（注入到 system prompt） |
| `mcpServers` | 限定可见哪些 MCP server |
| `hooks` | subagent 自己的钩子 |
| `memory` | 是否能写 auto memory（默认 false 更安全） |
| `background` | 是否后台跑（不阻塞主会话） |
| `isolation: worktree` | 在 `.claude/worktrees/<auto>/` 临时 worktree 里跑；无改动时自动删 |
| `color` | UI 显示色 |
| `initialPrompt` | 启动时先注入的固定 prompt |

### 3.3 内置 Subagent（开箱即用，不需要自己写）

CC 自带几个常用 subagent，`/agents` 里能看到：

| Agent | 用途 | 默认模型 |
|-------|------|---------|
| `Explore` | 只读代码探索（Glob/Grep/Read），最常被 skill 的 `context: fork` 调用 | Haiku 4.5 |
| `Plan` | 软件架构师，专门出实施计划，配合 plan mode | 继承 |
| `general-purpose` | 兜底通用 agent，未指定时默认 | 继承 |
| `statusline-setup` | 配置 statusline | — |
| `code-reviewer` | 阶段性大改完之后的整体 review | 继承 |

**何时该用谁**：

- "X 在哪实现 / 谁调用了 Y" → **Explore**
- "帮我设计加缓存的方案" → **Plan**（结合 plan mode）
- 跨多模块大改后做收尾 review → **code-reviewer**
- 其他复杂多步任务 → **general-purpose**

### 3.4 什么时候主动造 subagent

- **探索类**：`code-explorer`、`dep-graph-auditor`
- **验证类**：`test-runner`（跑测试并只返回失败摘要）
- **审查类**：`security-reviewer`、`perf-reviewer`、`a11y-reviewer`
- **搜集类**：`log-digger`、`trace-analyzer`（配合 MCP）

### 3.5 在会话里怎么用

自然语言即可："让 code-explorer 去找出所有调用 `PaymentService.charge` 的地方，只给我返回清单"。CC 会自动派发。

`/agents` 可以查看和管理。

## 4. MCP Servers（接入内部系统的关键）

### 4.1 什么是 MCP

MCP (Model Context Protocol) 是一套**让 Agent 安全调用外部工具/数据源**的协议。一个 MCP server 就是一个对接某个系统的小服务。

对资深工程师而言，MCP 的意义是：**终于可以让 CC 安全地"看到"公司内部系统，而不是把敏感数据贴进 prompt**。

**MCP server 提供三类能力**（很多教程只讲 tools，漏了后两者）：

| 能力 | 含义 | 典型用法 |
|------|------|---------|
| **Tools** | 让 Agent 能调用的函数（最常见） | 查 Jira 卡片、跑 SQL、发 PR comment |
| **Resources** | 让 Agent 能读取的"文件/数据" | 把内部 wiki / 设计文档当 `@` 引用 |
| **Prompts** | MCP 提供可复用的 prompt 模板，会出现在 `/` 菜单里 | 团队共享的"按规范生成 RFC" prompt |

### 4.2 值得优先接入的 MCP

| 类型 | 典型用法 |
|------|---------|
| 仓库托管 | GitHub / GitLab / 内部 Gitea：查 PR、issue、CI |
| 任务系统 | Jira / Linear：读需求卡片、关联 commit |
| 监控/APM | Datadog / Sentry / 内部监控：查报错、看 trace |
| 数据库 | Postgres / MySQL 只读连接：让 CC 看 schema（而不是猜） |
| 内部 wiki | Confluence / Notion / 内部 docs：查架构文档 |
| 可观测 | 日志平台（ELK / Loki 只读） |

### 4.3 安装

官方推荐用 `claude mcp add` 命令，而不是手写 JSON：

```bash
# stdio 类（本地子进程）
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest

# HTTP 类（远端服务）
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# SSE 类
claude mcp add --transport sse asana https://mcp.asana.com/sse

# 团队共享：加 --scope project，会写到仓库根的 .mcp.json，应当 commit 进 git
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

`/mcp`（在会话里）打开管理界面查看已注册的 MCP server、连接状态和工具列表。

**三种 scope** 分别落地到不同文件：

| scope | 共享 | 存储位置 |
|-------|------|---------|
| `local`（默认） | 否（仅你自己 + 当前项目） | `~/.claude.json`（按项目路径区分） |
| `project` | **是**（团队共享，进版本控制） | 项目根的 `.mcp.json` |
| `user` | 否（你自己跨所有项目） | `~/.claude.json` |

`.mcp.json` 是团队共享 MCP 的标准位置，结构如下（支持 `${ENV_VAR}` 展开）：

```json
{
  "mcpServers": {
    "internal-docs": {
      "command": "npx",
      "args": ["-y", "@company/mcp-docs"],
      "env": { "DOCS_TOKEN": "${DOCS_TOKEN}" }
    }
  }
}
```

> 注意：项目级 `.mcp.json` 的 server 第一次被使用时，CC 会**弹窗征求批准**（防供应链攻击）。要重置批准记录用 `claude mcp reset-project-choices`。

### 4.4 安全建议（非常重要）

- **只读连接优先**：数据库/监控都先用 readonly 账号。
- **用环境变量**：别把 token 写死在 `settings.json`。
- **限制 `allowedTools`**：即使装了 MCP，也可以在 `/permissions` 里限定哪些工具会被 CC 用。
- **审计**：配合 Hook 记录所有 MCP 调用（见第 05 篇）。

## 5. Hooks（事件钩子）

### 5.1 能做什么

在以下时机自动跑脚本（事件类型是**固定**的一组，不能自定义）。官方目前提供约 **29 个事件**，下面挑你最常用的（完整列表见官方 hooks 文档）：

| 事件 | 触发时机 |
|------|---------|
| `SessionStart` / `SessionEnd` | 会话开始 / 结束 |
| `UserPromptSubmit` | 你每次提交 prompt 时（先于 Claude 处理） |
| `PreToolUse` / `PostToolUse` | CC 调用工具前 / 后 |
| `Stop` / `SubagentStop` | 主会话 / 子代理 turn 结束 |
| `PreCompact` / `PostCompact` | 上下文压缩前 / 后 |
| `Notification` | CC 发通知时（权限弹窗、空闲提醒等） |
| `FileChanged` | 监听文件落盘变化 |
| `InstructionsLoaded` | CLAUDE.md / rules 文件加载时（调试上下文加载用） |

> 还有一批与权限、子代理、worktree、TaskCreate 相关的事件（`PermissionRequest` / `PermissionDenied` / `SubagentStart` / `WorktreeCreate` / `TaskCreated` 等），按需查文档。Hook handler 类型有 5 种：`command`（跑 shell）、`http`（POST 到 URL）、`prompt`（让 Claude 单轮判定）、`agent`（起 subagent 校验）、`mcp_tool`（调 MCP server 上的工具）。日常 99% 用 `command`。

### 5.2 典型用法

1. **自动化护栏**：`PreToolUse` 拦截破坏性 bash 命令（如 `rm -rf`）。
2. **自动化验证**：`PostToolUse` 当 CC 改完 `.ts` 文件后自动跑 `pnpm typecheck`，失败就把错误返回给 CC 让它修。
3. **审计**：把所有工具调用记录到本地日志。
4. **通知**：任务完成后发钉钉/Slack 通知。
5. **敏感信息扫描**：提交前扫 diff 看有没有 key 泄露。

### 5.3 配置示例

`.claude/settings.json`：

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "pnpm -s typecheck" }
        ]
      }
    ]
  }
}
```

注意官方 schema 的层级：**`<event>` → matcher 对象 → 内层 `hooks` 数组 → 每个 handler 必须有 `type`**。常见误写（少了内层 `hooks` 数组、或加了不存在的 `failOnError` 字段）会被 CC 静默忽略。

**怎么把错误回传给 Claude？** 不是靠任何字段，而是靠 **exit code**：

- `exit 0`：成功；stdout 可选携带 JSON 决策（见下）。
- `exit 2`：**阻塞错误**——stderr 会被反馈给 Claude，让它自己修。这是 typecheck/lint 类 hook 想要的效果。
- 其它非零 code：非阻塞错误，CC 继续执行，只在 transcript 里提示。

或者 `exit 0` + 输出 JSON 做更细的决策控制：

```bash
echo '{"decision":"block","reason":"typecheck failed: ..."}'
exit 0
```

> 推荐：**每个有 TS/类型系统的项目都加一个 PostToolUse typecheck hook**（脚本里 typecheck 失败就 `exit 2`），能挡掉 70% 的低级错误让 CC 自己修。

## 6. 选型决策树（一张图总结）

```
我想让 CC 获得某个能力 …

  这个能力是"一段 SOP / 规范"吗？              → 写 Skill
  是"连接外部系统 / 拿数据"吗？                 → 配 MCP Server
  是"一个专门角色，而且想隔离上下文"吗？         → 造 Subagent
  是"事件触发的自动化 / 护栏"吗？               → 写 Hook
  是"自定义一个 /xxx 命令"吗？                  → 还是写 Skill（旧 commands 已合并）

需要在临时 worktree 隔离做实验 …                → Subagent + isolation: worktree
                                                  或 /batch 派发多个
我想把以上几样一起分发给团队/多个项目 …          → 打包成 Plugin

我想让 CC 在特定场景自动触发 …                    → 用 Skill (description 精准)
我想让 CC 永远遵守某条项目规则 …                  → 写进 CLAUDE.md (见第 04 篇)
```

## 7. 我的推荐清单（按 ROI 排序，团队级）

对于一个典型 5-20 人的后端/全栈团队，按引入顺序：

1. **项目级 `CLAUDE.md`**（0 成本，立刻有效）
2. **1-2 个 Subagent**：`code-explorer`、`test-runner`
3. **PostToolUse typecheck/lint Hook**
4. **2-5 个内部框架 Skill**（公司越闭源，ROI 越高）
5. **GitHub / Jira MCP**
6. **DB 只读 MCP**（让 CC 看 schema，写 SQL 质量会直线上升）
7. **把上面 4-6 打成一个内部 plugin**，新人 onboard 一条命令装完

---

下一步：[03 · 新项目落地与团队规范对齐](./03-新项目落地与团队规范对齐.md)
