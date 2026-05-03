# Claude Code 资深工程师速成教程

> 面向已经有多年大型项目经验、但**第一次系统使用 Claude Code (后称 CC)** 的工程师。
> 目标：用最短的时间把 CC 纳入到你既有的工作流里，而不是反过来被它牵着走。

## 阅读顺序建议

如果你只有 30 分钟，按 `01 → 04 → 03` 的顺序读；
如果你希望把 CC 长期变成团队生产力工具，请完整读完 6 篇。

| 编号 | 文件 | 你能带走的东西 |
|------|------|------|
| 01 | [核心命令与高效工作流](./01-核心命令与高效工作流.md) | 真正每天都会用到的斜杠命令（含 bundled skills）、快捷键、thinking / effort / fast 三轴、会话管理、plan 模式、headless |
| 02 | [Skills 与 Plugins 生态](./02-Skills与Plugins生态.md) | Skills / Plugins / Subagents / MCP / Hooks 五件套的区别、选型、安装、自研，含完整 frontmatter |
| 03 | [新项目落地与团队规范对齐](./03-新项目落地与团队规范对齐.md) | 让 CC 遵守 DDD/TDD、团队风格、内部框架的完整 onboarding 流程 |
| 04 | [大型代码库导航与 CLAUDE.md 体系](./04-大型代码库导航与CLAUDE.md体系.md) | 屎山仓库下分层 CLAUDE.md、`.claude/rules/` 路径作用域、auto memory、子代理探索 SOP |
| 05 | [进阶技巧与认知外知识](./05-进阶技巧与认知外知识.md) | Worktree 并行、Token 经济学、Hooks 自动化、CI 中跑 CC、OTEL、IDE 边界 |
| 06 | [近半年新特性附录（2026/04）](./06-2026-04新特性附录.md) | bundled skills 全景、agent teams、Cloud / Desktop / Chrome / Teleport / Remote Control、permission 六档 |

## 一张图先建立心智模型

```
┌─────────────────────────── 你 (资深工程师) ─────────────────────────┐
│                                                                      │
│   输入层：              斜杠命令 /  |  自然语言  |  @文件  |  !shell │
│                                   ↓                                  │
│   记忆层：   CLAUDE.md (项目/子目录/全局)  +  auto memory  +  历史   │
│                                   ↓                                  │
│   能力层：   Skills  Plugins  Subagents  MCP Servers  Hooks          │
│                                   ↓                                  │
│   调度层：   model × effort × permission mode（决定速度/成本/胆量）  │
│                                   ↓                                  │
│   执行层：   Read / Edit / Bash / Grep / Glob / Task(子代理) ...     │
│                                   ↓                                  │
│   产出层：              文件修改  |  PR  |  报告  |  评审             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

记住三件事就够了：

1. **CC 不是"更聪明的自动补全"**，它是有工具调用能力的 Agent，你给它什么上下文、什么工具、什么规则，它就在什么边界里干活。
2. **所有让 CC 变强的动作，本质都是在做三件事：灌上下文 / 装能力 / 定规则**。后面六篇都是这三件事的具体落地。
3. **速度 / 成本 / 质量是三轴可调的**：`/model`（Opus 4.7、Sonnet 4.6、Haiku 4.5）× `/effort`（low → max）× `/fast`（关闭推理特效）。学会这三个旋钮，比纠结 prompt 重要。

## 几个最容易踩的坑（先打预防针）

- **不要把 CC 当 ChatGPT 用**：它会真的改你代码、真的跑命令。第一天先把 `permission mode`（六档：default/acceptEdits/plan/auto/dontAsk/bypassPermissions）、`allowedTools`、`hooks` 搞清楚，见 [01](./01-核心命令与高效工作流.md) 与 [05](./05-进阶技巧与认知外知识.md)。
- **不要一个 session 干到底**：上下文会爆。学会 `/clear`、`/compact`、子代理卸载，见 [01](./01-核心命令与高效工作流.md) 与 [04](./04-大型代码库导航与CLAUDE.md体系.md)。
- **不要忽略 effort 与 fast**：`/effort xhigh` 与 `/fast` 是过去半年新加的成本杠杆，简单任务开 `/fast` 立省；架构难题 `ultrathink` + `xhigh` 一起上。见 [01](./01-核心命令与高效工作流.md) 与 [06](./06-2026-04新特性附录.md)。
- **不要只写一个根 `CLAUDE.md`**：大仓要分层 + `.claude/rules/` 路径作用域。见 [04](./04-大型代码库导航与CLAUDE.md体系.md)。
- **不要在 CC 里手写大段框架说明**：内部框架/中间件应该用 Skills 或 `docs/` 里的结构化文档承载，按需加载而不是常驻。见 [02](./02-Skills与Plugins生态.md) 与 [03](./03-新项目落地与团队规范对齐.md)。

---

版本说明：本教程**截至 2026/04 复核定稿**，依据官方文档（`https://code.claude.com/docs/`）核对了所有命令名、frontmatter 字段、文件路径。**心智模型与方法论稳定，但命令名、frontmatter 字段、bundled skills 列表会持续演化**——遇到不确定时 `/help`、`claude --help`、官方 docs 三件套是第一手。
