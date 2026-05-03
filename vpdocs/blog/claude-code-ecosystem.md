---
title: Claude Code 可编程生态：Skills、MCP 与 Hook 体系全解
date: 2026-05-03
category: AI/LLM
tags: [Claude Code, Skills, MCP, Plugins, Hooks, AI编程]
---

# Claude Code 可编程生态：Skills、MCP 与 Hook 体系全解

Claude Code 上手一两周后，你大概率会遇到同一个瓶颈：每次都要手动描述内部框架的用法、每次都要提醒它"别用 npm，用 pnpm"、每次改完代码都要自己跑一遍 typecheck。

CC 提供了五件套来解决这个问题：**Skills、Plugins、Subagents、MCP、Hooks**。很多人把它们混为一谈，其实一个是"知识/SOP"，一个是"打包分发单位"，一个是"隔离执行角色"，一个是"外部系统连接器"，一个是"事件触发器"。这篇逐一拆解。

## 1. 五件套的关系（一张图看清）

```
        ┌────────── Plugin (分发/安装单位) ──────────┐
        │                                             │
        │ 可包含：Skills + Subagents + MCP + Hooks    │
        │          + Slash commands                    │
        └─────────────────────────────────────────────┘

Skill    = 一份 SKILL.md，告诉 CC "遇到 X 场景该怎么做" (SOP)
Subagent = 一个专门角色 (只读探索 / 测试执行 / 代码审查)
MCP      = 连接外部系统 (数据库 / Jira / 监控 / wiki)
Hook     = 事件钩子 (编辑前后、工具调用前后触发脚本)
```

结论直给：

- "我要让 CC 在遇到 X 场景时按 Y 步骤做" → 写 **Skill**
- "我要让 CC 连上公司 Jira/监控/数据库" → 配 **MCP**
- "我要一个只读探索、不污染主上下文的角色" → 造 **Subagent**
- "我要每次改代码后自动跑 lint" → 配 **Hook**
- "我要把以上几样打包分发给团队" → 打成 **Plugin**

## 2. Skills：按需注入的 SOP

### Skill 的本质

一个 Skill 就是一个目录，里面至少有一个 `SKILL.md`，前置 frontmatter 声明名字和触发描述。CC 在处理任务时扫描所有可用 Skills 的描述，**按需加载**——这是核心价值：不常驻上下文，只在相关时注入。

最小骨架：

```
my-skill/
├── SKILL.md            # 必需
├── templates/          # 可选：代码模板
├── scripts/            # 可选：辅助脚本
└── references/         # 可选：详细文档（按需再读）
```

SKILL.md 示例：

```markdown
---
name: internal-rpc-handler
description: |
  创建或修改公司内部 InternalRPC 框架的 handler。
  USE WHEN: 用户要求添加 RPC 接口、涉及 @company/rpc 相关代码。
  DO NOT USE FOR: 外部 HTTP API（用 rest-api skill）。
allowed-tools: Read Edit Bash(pnpm test:rpc *)
---

# InternalRPC Handler 创建规范

## 步骤
1. 在 `packages/rpc/handlers/` 下创建 `<name>.handler.ts`
2. 继承 `BaseHandler`，实现 `handle(ctx, req)` ...
```

**关键：description 写得越具体、触发条件越清晰，CC 越准确地知道什么时候加载它。** 建议用 USE WHEN / DO NOT USE FOR 两段式。

### 写 Skill 的五条黄金法则

1. **description 是索引**：把用户可能说的话、可能触发的文件类型全写进去
2. **SKILL.md 自己精简**：核心 SOP 放主文件，大段示例/模板放 `templates/`、`references/`
3. **写命令清单而不是散文**："Step 1 → Step 2" 的 checklist 比大段说明有效
4. **包含反例**："不要这样做"比"要这样做"更能防止事故
5. **绑定到可验证的产物**：例如"生成后必须跑 `pnpm test:rpc`"

### 放在哪里

- 个人全局：`~/.claude/skills/<name>/SKILL.md`（只对你生效）
- 项目级：`.claude/skills/<name>/SKILL.md`（随仓库提交，团队共享）
- 通过 Plugin 分发：跨项目共享

**强烈建议：团队约定的东西走项目级（进 git），个人习惯走全局。**

**小结：** Skills 是整个 CC 可编程体系里 ROI 最高的部分——零运维成本，纯 markdown，写完就生效。内部框架越闭源、团队规范越特殊，Skills 的价值越大。

## 3. Subagents：保护主会话上下文的隔离执行

主会话的上下文是最宝贵的资源。把一个任务派给 subagent 去跑——比如"扫描 200 个文件找出所有用了老配置的地方"——它会用光自己的上下文，但**只把摘要返回**给你。主会话还是干净的，继续推进高层决策。

### 定义一个 Subagent

路径：`.claude/agents/<name>.md`

```markdown
---
name: code-explorer
description: 只读代码探索；用于快速回答"X 功能在哪实现"
tools: Read, Grep, Glob
model: haiku                   # 探索用 Haiku 4.5，又快又便宜
isolation: worktree            # 在临时 worktree 里跑，零改动自动清理
permissionMode: plan           # 强制只读
maxTurns: 30
effort: low
---

你是代码考古专家。硬规则：
1. 只读，不改任何文件
2. 输出结构化：文件清单 / 关键函数 / 调用关系
3. 不要把大段源码贴回主会话，用"文件:行号"
4. 不确定的地方标 UNKNOWN，不要猜
```

**关键坑**：`tools` 字段省略 = 继承全部工具。想真正限制权限必须显式写白名单。

CC 自带几个内置 subagent：`Explore`（只读探索）、`Plan`（出实施计划）、`code-reviewer`（阶段性收尾 review）、`general-purpose`（兜底）。日常用法很简单——自然语言："让 code-explorer 去找所有调用 `PaymentService.charge` 的地方，只返回清单。"

**小结：** Subagent 解决的核心问题是上下文预算隔离。主会话开 Sonnet/Opus 做高层决策，脏活累活派给 Haiku subagent 去跑——成本降一个量级，主会话永远清爽。

## 4. MCP：把内部系统安全地接进 Agent

MCP (Model Context Protocol) 是一套让 Agent 安全调用外部工具/数据源的协议。对资深工程师而言，MCP 的意义是：**终于可以让 CC 安全地"看到"公司内部系统，而不是把敏感数据贴进 prompt**。

MCP server 提供三类能力（很多教程只讲 tools，漏了后两者）：

| 能力 | 含义 | 典型用法 |
|------|------|---------|
| **Tools** | Agent 能调用的函数 | 查 Jira、跑 SQL、发 PR comment |
| **Resources** | Agent 能读取的数据 | 把内部 wiki/设计文档当 `@` 引用 |
| **Prompts** | 可复用的 prompt 模板 | 团队共享的"按规范生成 RFC" |

安装命令（推荐用 CLI 而不是手写 JSON）：

```bash
# stdio 类（本地子进程）
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest

# HTTP 类（远端服务）
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# 团队共享：加 --scope project，写入 .mcp.json 进 git
claude mcp add --transport http rpc-docs --scope project https://mcp.internal/mcp
```

**安全三原则**：只读连接优先、用环境变量而不是明文 token、限制 `allowedTools` 防止越权。

**小结：** MCP 是 CC 从"单机工具"升级到"企业级 Agent"的关键一步。优先接入 GitHub/Jira（工作流闭环）、DB 只读连接（让 CC 看 schema 写 SQL 质量直线上升）、内部 wiki（架构文档随手可查）。

## 5. Hooks：事件驱动的自动化护栏

在以下时机自动跑脚本（约 29 个事件，挑最常用的）：

| 事件 | 触发时机 | 典型用法 |
|------|---------|---------|
| `PostToolUse` | CC 调用工具后 | 改代码后自动 typecheck + lint |
| `PreToolUse` | CC 调用工具前 | 拦截 `rm -rf`、`git push -f` |
| `SessionStart` | 会话开始 | 注入环境信息 |
| `Stop` | 会话结束 | 提醒沉淀 CLAUDE.md |

最有价值的 Hook 配置——**自动反馈环**：

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm -s typecheck && pnpm -s lint --max-warnings 0 || exit 2"
          }
        ]
      }
    ]
  }
}
```

效果：CC 每次改完 `.ts` 文件，自动跑 typecheck。**`exit 2` 是关键**——它表示阻塞错误，stderr 会反馈给 CC 让它自己修。这是从"人手动验证"到"Agent 自我纠正"的质变。每个有类型系统的项目都应该配一个。

**小结：** Hooks 是基础设施层的"护栏"——不是用来教 CC 怎么干活，而是防止它搞破坏。typecheck hook + 危险命令拦截 = 基本的安全网。

## 6. Plugins：打包分发上述所有能力

Plugin 就是 Skills/Subagents/MCP/Hooks 的打包壳子，带 `plugin.json` 元数据，通过 marketplace 分发。安装：

```bash
/plugin marketplace add anthropics/claude-code    # 加 marketplace
/plugin install github@claude-plugins-official    # 装具体 plugin
/plugin                                          # 打开交互界面
```

**选型建议**：只是自己/一个仓库用 → 直接放 `.claude/skills/` 或 `.claude/agents/` 即可，不要打包 plugin。跨多个仓库复用 → 才打成 plugin，放到公司内部 git。

## 推荐引入顺序（按 ROI，团队级）

对于一个 5-20 人的后端/全栈团队：

1. **项目级 CLAUDE.md**（0 成本，立刻有效）
2. **1-2 个 Subagent**：`code-explorer`、`test-runner`
3. **PostToolUse typecheck/lint Hook**（挡掉 70% 低级错误）
4. **2-5 个内部框架 Skill**（公司越闭源 ROI 越高）
5. **GitHub / Jira MCP**（工作流闭环）
6. **DB 只读 MCP**（让 CC 看 schema）
7. **把上面打包成内部 Plugin**，新人 onboard 一条命令装完

## 总结

CC 的可编程体系本质上做三件事：**灌上下文（Skills）、装能力（MCP/Subagents）、定规则（Hooks/CLAUDE.md）**。理解了这个框架，你就知道每个新需求该往哪个方向走。

最重要的是：不要一开始全上。先配 typecheck hook 和 1-2 个 Skill，把基础打牢，再按需扩展。插件装得越多不等于越强——每个 Skill/Hook 都消耗 attention。少而精。

[返回博客列表](./index)
