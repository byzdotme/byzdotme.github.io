---
title: Codex 使用笔记：任务边界、权限与验证
date: 2026-05-22
category: AI/LLM
tags: [Codex, AI编程, 开发工具, 工作流]
series: Codex 实战
seriesOrder: 1
---

第一次认真配 Codex，笔者把审批和沙箱当成了一件事。

当时的推理很朴素：它每次要动手都得问笔者，那肯定比不问安全。于是笔者把审批弹得最勤的那档留着，心里踏实。结果跑一个只读的排查任务，它连着停下来三次，每次都是同一类请求；笔者烦了，顺手把审批关掉，又觉得哪里不对——关掉的那个开关，究竟管着什么？

后来才理清：那两次拧的其实不是同一个旋钮。审批管「停下来问不问」，沙箱管「问了也做不了的事，本来就不允许做」。把它们叠在一起看，才会出现「审批开得很勤，权限却给得很宽」这种局面。

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

这篇从那次配置的摩擦往回捋，写下笔者现在每天在用的那一套：入口怎么选、装完怎么鉴权、审批和沙箱各有哪些取值、配置放在哪一层、模型和推理强度怎么配。命令与配置项以本机客户端帮助和官方文档为准，版本不同的话，`codex --help`、`codex exec --help` 和 TUI 里的 `/help` 比任何教程都准。

项目里的长期规则和团队协作准备另开两篇写，这篇只谈单次任务怎么推进。任务怎么交代、计划怎么 review、验证怎么跑，这套纪律笔者之前用 Claude Code 时已经练过一遍，记在[Claude Code 使用笔记](/blog/claude-code-workflow-guide)里；换成 Codex 之后，真正需要重新学的是配置和权限这一层。

## 选入口，先看工作环境在哪一边

Codex 不止一个入口。它们的区别不在界面好不好看，而在任务跑在哪、能碰什么：

| 入口 | 运行位置 | 适合什么 |
| --- | --- | --- |
| TUI：`codex` | 本机终端，当前仓库 | 陪跑式开发、调研、查 bug、跑测试 |
| headless：`codex exec` | 本机或 CI，当前仓库 | 脚本化 review、日志分析、定时任务 |
| IDE 扩展 | 编辑器内，当前 workspace | 边写边问，从编辑器派任务 |
| Codex cloud | OpenAI 托管环境，独立 branch | 长任务、并行任务、本机不方便跑的环境 |
| GitHub `@codex` | PR / issue 上下文 | `@codex review`、修 CI、跟进评审意见 |

判断依据可以是「需要什么才能干活」：要随时补一句日志、纠正它的理解、盯着 diff 的，留在本机 TUI；目标、上下文、验收都已经写在纸上的，交给 cloud。比如「这个支付状态机为什么会卡在待确认」就该在本地做，因为你多半会在它给出第一个结论后想起还有一段日志没有贴。反过来，「把这个 PR 的 CI failure 修掉并开一个小 PR」，目标清晰、验收可写，云端跑完再回来看就行。

云端环境有自己的 checkout、依赖和凭据配置。它不会自动获得本机那些还没提交的改动，也未必连得上你内网的测试服务——这条比「任务多久」更能决定一个任务该扔到哪边。

GitHub 集成是另一条路。仓库启用 Codex code review 之后，在 PR 评论里写 `@codex review` 就是一次审查请求。它是不是等于授权修改，取决于仓库怎么配。PR 上那条评论本身只申请了审查。

## 安装与鉴权：三种装法，两条凭据路径

装法按自己机器上已经有什么挑：

```bash
# macOS / Linux
curl -fsSL https://chatgpt.com/codex/install.sh | sh

# Homebrew
brew install --cask codex

# npm
npm i -g @openai/codex && codex
```

```powershell
# Windows PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

凭据路径主要两条。一条是 ChatGPT 登录，日常 TUI、IDE 和 cloud 都走这条，适合有个人或团队订阅的人。另一条是 `OPENAI_API_KEY`，用在 API 调用、CI 和一切非交互环境。企业版还有托管配置，可以通过 `requirements.toml` 把危险配置项从组织层面锁掉。

凭据默认落在 `~/.codex` 下，也可以用 `CODEX_HOME` 换位置；存哪由 `cli_auth_credentials_store` 决定，可选 `file`、`keyring` 或 `auto`。CI 里不要复用个人的浏览器登录态，用专门的 API key 或 workspace 账号，额度归属和审计记录才分得清。

## TUI 里值得记住的几条命令

启动就是敲 `codex`。真正每天会敲的 flag 不多：

```bash
codex --model gpt-5.5                            # 临时换模型
codex --profile deep-review                      # 套一个配置 profile
codex --sandbox read-only                        # 只读起步
codex --ask-for-approval on-request              # 审批策略
codex --config sandbox_workspace_write.network_access=true   # 临时开网络
```

`--config` 能覆写任意一个配置键，值是按 TOML 解析的。上面最后一条就是在单次会话里打开工作区网络，而不去改配置文件。

会话里还有一类斜杠命令。命令集会随版本变化，所以「哪个命令叫什么」不该背，记住有哪几类就够：`/model` 换模型，`/permissions` 调整本轮的审批与沙箱，`/review` 对当前改动做一次审查（可以用 `review_model` 单独指定模型），`/raw` 切到原始输出模式好复制长结果，`/skills` 看有哪些 Skill。`/permissions` 容易被忽略，但它是把前面那两条命令在会话中途改掉的地方，不用退出来重开。

## 审批和沙箱是两个维度

回到开头那次混乱。这是两组独立的旋钮，各管一段。

`approval_policy` 决定「要不要停下来问你」：

| 取值 | 行为 | 什么时候用 |
| --- | --- | --- |
| `untrusted` | 只自动跑已知安全的只读命令，其余都要问 | 陌生仓库、第一次启动 |
| `on-request` | 由模型按风险决定何时请求批准 | 日常本地开发的主力档 |
| `never` | 不弹批准提示 | 受控的 CI 与自动化 |
| `{ granular = { ... } }` | 对各类批准分别允许或拒绝 | 企业、团队的细粒度策略 |

`sandbox_mode` 决定「就算它想干，文件系统和网络允许它干到哪」：

| 取值 | 行为 | 什么时候用 |
| --- | --- | --- |
| `read-only` | 文件系统只读 | 调研、review、CI 检查 |
| `workspace-write` | 可写当前 workspace，默认不开网络 | 日常改代码 |
| `danger-full-access` | 没有沙箱 | 仅当外层已经有容器或虚拟机隔离 |

`workspace-write` 还有一层细项：

```toml
[sandbox_workspace_write]
network_access = false
writable_roots = ["/Users/YOU/.pnpm-store"]
exclude_tmpdir_env_var = false
exclude_slash_tmp = false
```

`writable_roots` 是给工作区之外的目录开口子。装依赖经常要写到全局 store，与其把整个沙箱放开，不如只加这一条。

![approval_policy 与 sandbox_mode 的五个典型组合：每种组合下 Codex 能做什么、什么时候会停下来问](/images/blog/diagrams/codex-workflow-guide-01-approval-sandbox-matrix.svg)

图里刻意留了一个反直觉的格子：审批关掉之后，只有 `read-only` 是「无提示执行」。换成可以写的沙箱，它会停下来等你确认——因为「不问」只是审批轴上的一个取值，沙箱轴并不会跟着变宽。这也解释了为什么 `approval_policy = "never"` 常常被高估：它省掉的是提问这一步，让出去的东西一点没多。

还有两个细节值得写下来。旧文档里出现过的 `on-failure` 现在应视为已弃用，交互场景用 `on-request`，非交互场景用 `never` 配强沙箱。另外自然语言里的「不要访问生产」需要凭据隔离来兜底：模型记不记得住是一回事，那把钥匙在不在环境里是另一回事。

## 配置分五层，冲突时从下往上找

权限相关的怪事，多半出在层与层之间：

1. CLI flag 和 `--config`
2. `--profile` 选中的那一段
3. 项目里的 `.codex/config.toml`（从 repo root 到当前目录，越近的优先；只有受信任的项目才会加载）
4. 用户级 `~/.codex/config.toml`
5. 系统级 `/etc/codex/config.toml`

上面压下面。于是「本机明明试过是只读的」这种困惑，答案常常是项目里那份配置把它盖住了，或者这个仓库还没被标记为受信任，项目配置压根没生效。

项目级配置只该放团队共享、跟着仓库走的东西：

```toml
# .codex/config.toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_doc_max_bytes = 65536
project_doc_fallback_filenames = ["TEAM_GUIDE.md", ".agents.md"]
```

`openai_base_url`、`chatgpt_base_url`、`model_provider` 与 `[model_providers]`、`notify`、`profile` 与 `[profiles]`、`otel` 这些不要写进项目配置。它们和机器本地环境、凭据、遥测有关，放进去要么被忽略，要么直接报警告，应该留在用户级配置里。

用户级配置放日常默认环境，profile 那段放按任务切换的那几套：

```toml
# ~/.codex/config.toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.deep-review]
model = "gpt-5.5"
model_reasoning_effort = "high"
sandbox_mode = "read-only"

[profiles.fast-impl]
model = "gpt-5.4-mini"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
```

`codex --profile deep-review` 就是用这种方法把「高推理 + 只读」一起端上来，不用每次手敲两个 flag。

## 模型和推理强度按「要减少哪个不确定性」来配

模型菜单变动很快，具体 ID 以客户端里能看到的为准。常见的几个键是 `model`、`review_model`、`model_reasoning_effort`、`plan_mode_reasoning_effort`，`model_reasoning_effort` 的档位是 `minimal` / `low` / `medium` / `high` / `xhigh`。

| 任务 | 推荐 |
| --- | --- |
| 日常实现、补测试、普通重构 | `gpt-5.5`，effort `medium` |
| 架构设计、疑难 bug、并发与一致性 | `gpt-5.5`，effort `high` / `xhigh` |
| 大范围探索、摘要、文档整理 | `gpt-5.4-mini`，effort `low` / `medium` |
| PR review | `review_model` 单独设高一档 |
| CI 批量检查 | 较低 effort + `read-only`，非交互 |

经验上，写代码的活用 `medium`，判断「该怎么写」的活升到 `high`。升档的理由应该是它减少了某个具体的不确定性——比如跨模块的状态流转、并发时序、反复排不掉的根因。默认开到 `xhigh` 的代价是延迟和成本一起上去，结论未必更准。旧脚本或 profile 里如果还留着已弃用的模型名，该更新就更新，用 `codex debug models` 能看到当前客户端实际可用的目录。至于「哪类任务配哪一档」有没有通用答案，笔者暂时给不出：任务怎么切、上下文给得干不干净、验收手段够不够，这几件事的影响都不比模型档位小，质量问题也未必都能归到模型不够强上。

## 非交互任务要同时管住输入、输出和失败

`codex exec` 是脚本里的入口。一个能直接跑的例子：检查工作区里还没提交的改动。

```bash
codex exec \
  --sandbox read-only \
  --ask-for-approval never \
  "读取当前 git diff，检查正确性、安全、并发和测试缺口。只报告有证据的问题，不修改文件。"
```

输入也可以从管道来。把脱敏后的日志喂进去：

```bash
codex exec --sandbox read-only --ask-for-approval never \
  "分析输入日志，区分证据和假设，不修改文件" < test-output.log
```

这里有个容易踩的区分：同时给了 prompt 和 stdin 数据时，stdin 的内容是补充上下文；写成 `codex exec -` 时，stdin 整体就是那条 prompt。两种写法的语义不一样。

输出方面，`--json` 给的是 JSONL 事件流，不是一份最终报告的 JSON。下游要稳定字段就用 `--output-schema`，拿到结果再校验一遍；`-o` 可以单独把最后一条回复存成文件；只是跑一次、不需要回看这次会话的话，加 `--ephemeral` 就不会在本地留下 session rollout。

机器消费的报告至少要能区分三种状态：发现问题、没发现问题、检查没有完成。少了第三种，一次失败的检查会被读成一切正常。

失败处理是这套流程里最容易漏的一环。如果上游是测试命令，管道要保住测试本身的退出码——不能因为摘要生成成功就把一次红灯标成绿灯。CI 里还要注意凭据：依赖安装脚本、测试脚本、第三方 action 都可能读环境变量，长期个人凭据放进一个会运行不受信任代码的 job 里，等于把钥匙插在门上。作用范围和外部写入权限交给 CI 与服务端控制。

## 日更工作流：三条线，同一套纪律

新需求：

```text
1. 新开一个干净会话或 worktree
2. 确认 sandbox = workspace-write、approval = on-request
3. 描述需求并引用相关目录，先只要计划：涉及文件、风险点、测试计划、实现顺序
4. 你 review 计划，补约束
5. 分步实现，每步后跑最小测试
6. 让它 review 自己的 diff
7. 你跑最终验证
8. 让它基于 diff 写 commit message 草稿
```

第 3 步是这套流程的支点。计划不用长，但必须落到文件和顺序上——Codex 出问题的地方，往往在影响半径的估计上，代码本身倒是写得出来。

查 bug：

```text
1. 用 codex --sandbox read-only 起步
2. 贴完整报错、复现步骤、近期相关 commit 或 diff
3. "先不要修复。给几个根因假设，每个都说清证据、反证、最小验证方法。"
4. 你挑最像的那个
5. 切到 workspace-write，做最小修复和回归测试
6. review + 验证
```

第 3 步不要写成「先列三个根因」。数字一旦被规定，凑数就有了空间。更合适的问法是：每个假设都给证据、反证和下一项验证，证据不够就保留不确定性。只读的检查可以连着推进，真正要改文件或换环境时再谈权限。

PR 评审这条线在本地可以这么跑：

```bash
git diff origin/main...HEAD | codex exec --sandbox read-only \
  "Review this diff as a senior engineer. Findings first, ordered by severity."
```

要在 GitHub 上做就是 `@codex review`，前提是仓库里有明确的 review 准则，否则它给出的多半是风格偏好。想让准则生效，得写进 `AGENTS.md`，那是另一个话题，准备后面单独写一篇。

## 收尾看 diff 和实际验证，不只看总结

完成报告里要说清改动范围、实际跑过的命令、结果，以及哪些部分没有验证。「建议运行测试」不等于「测试通过」，进程起来了也不等于功能验收过。

长任务还要看工作区当前的状态。中断、上下文压缩、重新开会话，都不会自动撤销已经发生的修改。回到任务的第一件事是看 diff，而不是接着往下说——否则很容易重复实现，或者把先前的工作覆盖掉。

真正交付前，把 diff 对回最初那段任务说明：行为改对了吗，有没有顺手改了不该改的地方，失败路径和兼容场景验过没有。生成提交说明、commit、push、merge 是四个不同的动作，授权也该分开给。

最后留个坑：`approval_policy = { granular = { ... } }` 那几个类别，笔者目前只用到过其中一两个，剩下的组合还没试出什么心得。等哪天在团队里真需要按类别分权了，再回来补这段。
