---
title: Claude Code 自定义模型接入指南：环境变量、网关与切换工具
date: 2026-06-19
category: AI/LLM
tags: [Claude Code, LLM Gateway, Claude Code Router, AI编程, 开发工具]
series: Claude Code 实战
seriesOrder: 4
---

# Claude Code 自定义模型接入指南：环境变量、网关与切换工具

前阵子听到一个很典型的故事：朋友本地已经装好了 Claude Code CLI，公司也提供了可用的模型服务，但他不知道怎么把公司模型接进 CC。最后为了走完初始化和登录流程，硬是买了一个 Claude Pro。

这件事有点荒诞，但并不罕见。Claude Code（后面简称 CC）默认体验确实围绕 Anthropic 自家账号和 Claude 模型展开；而国内很多团队的现实是：直连 Claude 不稳定，或者公司已经统一采购了模型网关、DeepSeek、OpenRouter、硅基流动、火山、Ollama、私有化模型。于是问题就变成：

**CC 能不能继续用？能。关键是分清三件事：认证给谁、请求发到哪、模型名怎么映射。**

这篇把 CC 接入自定义模型的几种方案拆清楚，重点梳理环境变量的作用，再讲 Claude Code Router、Claude Code Proxy、`cc-switch` 这类工具到底在帮你省什么事。

## 1. 先分清：代理、网关、模型不是一回事

很多配置失败，根源是把三个层次混在一起：

| 层次 | 解决什么问题 | 典型配置 |
|------|--------------|----------|
| 网络代理 | 让请求能出网 | `HTTP_PROXY`、`HTTPS_PROXY` |
| LLM Gateway | 统一鉴权、审计、限流、路由 | `ANTHROPIC_BASE_URL`、各云厂商 base URL |
| 模型路由/协议适配 | 把 CC 请求转成别的模型能懂的格式 | Claude Code Router、Claude Code Proxy |

网络代理只是“帮你走到目标服务器”。它不会把 Anthropic Messages 协议变成 OpenAI Chat Completions，也不会把 `claude-sonnet-4-6` 自动变成 `deepseek-chat`。

LLM Gateway 是“公司统一入口”。它通常仍然提供 Anthropic Messages、Bedrock、Vertex 这类 CC 能理解的 API 形态，只是把鉴权、审计、模型路由放到网关层。

协议适配工具则更像“翻译官”。当你的模型服务只支持 OpenAI-compatible API，而 CC 发的是 Anthropic 风格请求时，中间必须有人翻译请求、响应、流式输出、工具调用、模型名。

**小结：** 先判断你手里的服务是哪一类。能提供 Anthropic Messages API 的，优先走 `ANTHROPIC_BASE_URL`；只有 OpenAI-compatible API 的，需要 Router/Proxy 这类适配层。

## 2. 最小可用：直连 Anthropic-compatible 网关

如果公司已经提供了兼容 Anthropic Messages 的网关，最小配置通常只有三行：

```bash
export ANTHROPIC_BASE_URL="https://llm-gateway.example.com"
export ANTHROPIC_API_KEY="your-gateway-key"
export ANTHROPIC_MODEL="claude-sonnet-4-6"
claude
```

这里的关键点：

- `ANTHROPIC_BASE_URL`：把 CC 的模型请求发到自定义 API endpoint，而不是默认的 Anthropic endpoint。
- `ANTHROPIC_API_KEY`：作为 `X-Api-Key` 发送。官方文档明确说，设置它后会优先使用 API key，而不是你已登录的 Pro/Max/Team/Enterprise 订阅。
- `ANTHROPIC_MODEL`：指定默认模型。`--model` 和 CC 内部的 `/model` 会覆盖它。

如果网关用 Bearer token，而不是 `x-api-key`，则用：

```bash
export ANTHROPIC_BASE_URL="https://llm-gateway.example.com"
export ANTHROPIC_AUTH_TOKEN="your-gateway-token"
export ANTHROPIC_MODEL="claude-sonnet-4-6"
claude
```

`ANTHROPIC_AUTH_TOKEN` 会变成 `Authorization: Bearer <token>`。不要自己把 `Bearer ` 写进去，否则很容易变成 `Bearer Bearer xxx`。

有些网关会把 Claude 模型名映射到内部模型，比如：

```text
claude-opus-4-6   -> company-coding-large
claude-sonnet-4-6 -> company-coding-balanced
claude-haiku-4-5  -> company-coding-fast
```

这时你的本地仍然可以写 Claude 风格模型名，真实模型由网关决定。

**小结：** 如果公司网关已经兼容 Anthropic Messages，别急着上复杂工具。三类变量先配对：`BASE_URL` 管请求去哪，`API_KEY/AUTH_TOKEN` 管怎么鉴权，`MODEL` 管默认用谁。

## 3. 环境变量总表：每个变量到底管什么

下面这张表按“接模型相关度”排序，而不是按字母排序。

| 变量 | 作用 | 什么时候用 |
|------|------|------------|
| `ANTHROPIC_BASE_URL` | 覆盖 Anthropic API endpoint | 接入 Anthropic-compatible 网关、LiteLLM、Bifrost、自建代理 |
| `ANTHROPIC_API_KEY` | 作为 `X-Api-Key` 发送 | 网关或 Anthropic API 使用 API key 鉴权 |
| `ANTHROPIC_AUTH_TOKEN` | 作为 `Authorization: Bearer` 发送 | 网关使用 Bearer token 鉴权 |
| `ANTHROPIC_MODEL` | 设置默认模型 | 想固定默认模型，或跳过 `/model` 手动选择 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | 给 `/model` 增加一个自定义模型入口 | 网关模型名不是 CC 内置模型名 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME` | 自定义模型在 `/model` 里显示的名字 | 想让模型选择列表更友好 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION` | 自定义模型描述 | 团队共享时标注用途 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 覆盖 Opus 档默认模型 | 企业网关希望把 Opus 档指向内部强模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 覆盖 Sonnet 档默认模型 | 最常用，适合日常编码模型 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 覆盖 Haiku 档默认模型 | 后台摘要、标题、轻量任务 |
| `ANTHROPIC_SMALL_FAST_MODEL` | 旧版小模型变量，已 deprecated | 老教程里常见，新配置尽量不用 |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | 启用网关 `/v1/models` 发现 | 网关支持模型列表，希望出现在 `/model` |
| `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT` | 对自定义模型也发送 effort 参数 | 网关模型支持 effort，但模型名不是 CC 已知 ID |
| `CLAUDE_CODE_DISABLE_THINKING` | 不发送 `thinking` 参数 | 网关或第三方模型不认识 thinking 字段 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 去掉 Anthropic beta 头和实验字段 | 网关报 `anthropic-beta` 或额外字段错误 |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | 设为 `0` 可去掉 CC 归因块 | 自建网关按完整 body 做 prompt cache 时 |
| `API_TIMEOUT_MS` | API 请求超时时间 | 慢网关、本地模型、长思考任务容易超时 |
| `API_FORCE_IDLE_TIMEOUT` | 控制流式响应空闲超时 | 慢模型长时间不吐 token 时 |
| `HTTP_PROXY` / `HTTPS_PROXY` | 网络代理 | 公司网络要求所有出站流量走代理 |

一个比较稳的企业网关配置像这样：

```bash
export ANTHROPIC_BASE_URL="https://llm-gateway.example.com"
export ANTHROPIC_AUTH_TOKEN="your-token"
export ANTHROPIC_MODEL="claude-sonnet-4-6"

# 网关兼容性开关：按需打开，不要一上来全开
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
export API_TIMEOUT_MS=900000
```

注意两条经验：

1. CC 启动时读取环境变量，改完变量要重启 `claude`。
2. 真实 token 不要写进项目仓库，也不要放进博客、截图、日志。个人本地可以放 shell profile；团队共享时用占位符和公司密钥管理系统。

**小结：** 环境变量不是越多越好。先配请求地址、鉴权、默认模型；只有遇到网关兼容性问题，再逐个打开 beta/thinking/timeout 相关开关。

## 4. Bedrock、Vertex、Foundry：官方第三方云路径

如果公司不是给你一个 Anthropic-compatible 网关，而是走云厂商托管 Claude，CC 也有专门开关。

### Amazon Bedrock

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1
claude
```

如果公司还有一层 Bedrock 网关：

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export ANTHROPIC_BEDROCK_BASE_URL="https://llm-gateway.example.com/bedrock"
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
claude
```

`CLAUDE_CODE_SKIP_BEDROCK_AUTH=1` 的意思是：AWS 鉴权由网关处理，本机不用再签 SigV4。

### Google Vertex AI

```bash
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=us-east5
export ANTHROPIC_VERTEX_PROJECT_ID="your-project-id"
claude
```

走 Vertex 网关时：

```bash
export CLAUDE_CODE_USE_VERTEX=1
export ANTHROPIC_VERTEX_BASE_URL="https://llm-gateway.example.com/vertex"
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1
claude
```

### Microsoft Foundry

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_RESOURCE="your-resource"
export ANTHROPIC_FOUNDRY_API_KEY="your-api-key"
claude
```

走 Foundry 网关时：

```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_BASE_URL="https://llm-gateway.example.com"
export CLAUDE_CODE_SKIP_FOUNDRY_AUTH=1
claude
```

这些变量和 `ANTHROPIC_BASE_URL` 不是同一个入口。`ANTHROPIC_BASE_URL` 面向 Anthropic Messages；`ANTHROPIC_BEDROCK_BASE_URL`、`ANTHROPIC_VERTEX_BASE_URL`、`ANTHROPIC_FOUNDRY_BASE_URL` 面向对应云厂商 API 形态。

**小结：** 云厂商路径优先用官方开关，不要硬套 `ANTHROPIC_BASE_URL`。Bedrock、Vertex、Foundry 的 API 形态不同，CC 需要知道自己正在和哪类 provider 说话。

## 5. OpenAI-compatible 模型：为什么需要 Router/Proxy

国内最常见的模型服务是 OpenAI-compatible：

```text
POST /v1/chat/completions
Authorization: Bearer xxx
model: deepseek-chat
```

但 CC 不是普通聊天客户端。它要处理：

- Anthropic Messages 请求格式
- streaming response
- tool use / tool result
- thinking / beta header
- prompt cache
- 大小模型分工
- `/model` 动态切换

所以你不能只写：

```bash
export ANTHROPIC_BASE_URL="https://api.deepseek.com"
```

这通常会失败，因为 DeepSeek API 并不直接暴露 Anthropic Messages 协议。你需要中间层把 CC 的请求翻译成模型服务能懂的格式。

社区常见有两类工具：

| 工具类型 | 代表 | 适合谁 |
|----------|------|--------|
| 路由器 | Claude Code Router | 想接多个 provider、按任务路由、动态切模型 |
| 简单代理 | Claude Code Proxy | 只想把 Claude 模型档位映射到 OpenAI-compatible 模型 |

**小结：** OpenAI-compatible 不是 Anthropic-compatible。名字里都有 “API”，但协议细节不同。CC 这种 agent 工具对协议细节非常敏感。

## 6. Claude Code Router：多 provider、多模型路由

Claude Code Router（CCR）的心智模型是：本地启动一个兼容 CC 的服务，CC 把请求发给 CCR，CCR 再按配置转发给不同模型 provider。

安装后一般有两种使用方式：

```bash
# 方式一：通过 ccr 包装启动
ccr code

# 方式二：让当前 shell 的 claude 命令自动走 CCR
ccr start
eval "$(ccr activate)"
claude
```

核心配置在 `~/.claude-code-router/config.json`。一个简化例子：

```json
{
  "PROXY_URL": "http://127.0.0.1:7890",
  "LOG": true,
  "API_TIMEOUT_MS": 600000,
  "Providers": [
    {
      "name": "deepseek",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "$DEEPSEEK_API_KEY",
      "models": ["deepseek-chat"]
    },
    {
      "name": "openrouter",
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "$OPENROUTER_API_KEY",
      "models": ["anthropic/claude-sonnet-4.5", "openai/gpt-5"]
    }
  ],
  "Router": {
    "default": "deepseek,deepseek-chat",
    "background": "deepseek,deepseek-chat",
    "think": "openrouter,anthropic/claude-sonnet-4.5"
  }
}
```

这里几个字段很关键：

- `Providers`：定义有哪些模型供应商，每个供应商的 base URL、key、模型列表是什么。
- `Router.default`：普通请求默认走谁。
- `Router.background`：后台/轻量任务走谁，适合便宜模型。
- `Router.think`：思考类任务走谁，适合强模型。
- `PROXY_URL`：CCR 自己访问上游 provider 时使用的网络代理，不等于 CC 的 `ANTHROPIC_BASE_URL`。
- `API_TIMEOUT_MS`：上游响应慢时非常有用。

CCR 的价值不是“能把模型接上”这么简单，而是把 CC 的模型调度能力重新打开了。比如你可以日常编码走便宜的国产模型，复杂架构或长思考走更强模型，后台摘要走小模型。

还有一个很实用的点：CCR 支持在 Claude Code 里通过 `/model provider,model` 动态切换，比如：

```text
/model openrouter,anthropic/claude-sonnet-4.5
```

这比每次退出终端、改环境变量、重新启动舒服太多。

**小结：** 如果你要接多个模型，或者团队内部希望统一模型路由，Claude Code Router 是更完整的方案。它解决的不只是连接问题，还有成本、速度、质量的调度问题。

## 7. Claude Code Proxy：简单映射三档模型

Claude Code Proxy 更像轻量翻译层。它通常把 CC 里的 Claude 模型档位映射成 OpenAI-compatible 模型：

```bash
OPENAI_API_KEY="your-openai-compatible-key"
OPENAI_BASE_URL="https://api.example.com/v1"

BIG_MODEL="your-large-coding-model"
MIDDLE_MODEL="your-balanced-coding-model"
SMALL_MODEL="your-fast-model"

HOST="127.0.0.1"
PORT="8082"
```

然后让 CC 指向这个代理：

```bash
export ANTHROPIC_BASE_URL="http://localhost:8082"
export ANTHROPIC_API_KEY="any-value"
claude
```

它的核心映射思路是：

| CC 请求里的模型 | 代理转发到 |
|-----------------|------------|
| haiku 类 | `SMALL_MODEL` |
| sonnet 类 | `MIDDLE_MODEL` |
| opus 类 | `BIG_MODEL` |

这类工具适合“我只有一个模型服务，只想让 CC 先跑起来”的场景。缺点也明显：复杂路由、动态模型选择、provider 管理通常不如 CCR 完整。

**小结：** Proxy 是一把小刀，Router 是工具箱。个人临时接入可以先用 Proxy；团队长期使用，建议直接评估 Router 或公司统一网关。

## 8. `cc-switch` 这类工具，本质是在切配置集

很多人提到 `cc-switch`，通常不是指某个唯一标准工具，而是一类“配置切换器”：

```text
default   -> 官方 Anthropic / Claude Pro
company   -> 公司 LLM Gateway
deepseek  -> 本地 CCR + DeepSeek
local     -> 本地 Ollama / 私有模型
```

它们本质上做三件事：

1. 切换环境变量：`ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`。
2. 切换配置文件：例如 CCR 的 `config.json`、不同 provider preset。
3. 包装启动命令：例如 `ccr code`、`claude --model xxx`。

自己写一个极简版本并不难：

```bash
cc-company() {
  export ANTHROPIC_BASE_URL="https://llm-gateway.example.com"
  export ANTHROPIC_AUTH_TOKEN="$COMPANY_LLM_TOKEN"
  export ANTHROPIC_MODEL="claude-sonnet-4-6"
  claude "$@"
}

cc-router() {
  ccr start
  eval "$(ccr activate)"
  claude "$@"
}
```

更稳一点，可以给每套配置单独的 `CLAUDE_CONFIG_DIR`：

```bash
alias claude-work='CLAUDE_CONFIG_DIR=~/.claude-work claude'
alias claude-personal='CLAUDE_CONFIG_DIR=~/.claude-personal claude'
```

这样公司账号、个人账号、不同 MCP、不同历史会话不会混在一起。对经常在多个客户/公司环境之间切换的人，这个变量很值钱。

选择切换工具时看四点：

- 是否明文保存 token？
- 是否能按项目自动切换？
- 是否支持 CCR/Proxy 这类本地服务启动检查？
- 是否能显示当前 profile，避免你在公司项目里误用个人模型？

**小结：** `cc-switch` 类工具不是魔法，核心就是“把一组容易配错的环境变量打包成 profile”。团队可以做一个内部小 CLI，个人也可以先用 shell function。

## 9. 三类人的推荐路径

### 个人开发者

如果你只是想在网络不稳定时继续用 CC：

```bash
export HTTPS_PROXY="http://127.0.0.1:7890"
claude
```

如果你想接 OpenAI-compatible 模型，优先试 Claude Code Router。不要直接把 `ANTHROPIC_BASE_URL` 指向 OpenAI-compatible endpoint。

### 团队使用者

如果公司已经有模型网关：

```bash
export ANTHROPIC_BASE_URL="https://llm-gateway.example.com"
export ANTHROPIC_AUTH_TOKEN="$COMPANY_LLM_TOKEN"
export ANTHROPIC_MODEL="claude-sonnet-4-6"
```

再做一个内部 `cc-work` 命令，把变量、健康检查、版本检查都封起来。不要让每个人复制一份散落在群聊里的 export。

### 平台/基础设施团队

最稳的路线是：

1. 提供 Anthropic Messages 兼容网关。
2. 支持 `/v1/messages` 和 `/v1/messages/count_tokens`。
3. 正确转发 `anthropic-beta`、`anthropic-version` 等头。
4. 做统一鉴权、审计、限流、预算。
5. 提供一键安装脚本或内部 CLI。
6. 明确推荐模型档位：日常、强推理、后台、小模型。

平台团队不要只给一个“OpenAI-compatible 地址 + key”，然后让业务同学自己折腾。CC 是 agent，不是普通 chat UI；协议适配、工具调用、流式输出、缓存都需要认真处理。

**小结：** 个人追求跑起来，团队追求少踩坑，平台追求统一入口。不同角色的最优解不一样。

## 10. 排错清单

遇到问题时按这个顺序查：

| 现象 | 优先检查 |
|------|----------|
| 仍然要求登录 Claude 账号 | 是否没设置 `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN`，或新 shell 没加载变量 |
| 请求打到官方 Anthropic | `ANTHROPIC_BASE_URL` 是否为空，是否启动后才改变量 |
| 401 / 403 | key 类型是否用错：API key vs Bearer token |
| 404 model not found | `ANTHROPIC_MODEL` 是否是网关支持的模型名 |
| 报 `anthropic-beta` 不支持 | 尝试 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` |
| 报 `thinking` 字段不支持 | 尝试 `CLAUDE_CODE_DISABLE_THINKING=1` |
| 卡住或长时间无输出 | 调整 `API_TIMEOUT_MS`、`API_FORCE_IDLE_TIMEOUT`，检查网关流式响应 |
| OpenAI-compatible endpoint 直接失败 | 需要 Router/Proxy，不是只改 base URL |
| `/model` 看不到网关模型 | 网关是否实现 `/v1/models`，是否设置 `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` |

还可以在 CC 里跑：

```text
/status
```

确认当前代理、网关、provider 配置是否生效。

**小结：** 大多数问题都能归类到三件事：请求没发到你以为的地方、鉴权头不对、模型名/协议不匹配。不要一上来怀疑 CC 坏了。

## 总结

Claude Code 接自定义模型，核心不是背变量，而是建立三层心智：

1. **网络层**：`HTTP_PROXY` / `HTTPS_PROXY` 只负责出网。
2. **协议入口层**：`ANTHROPIC_BASE_URL` 和各云厂商 base URL 决定 CC 请求发到哪里。
3. **模型路由层**：Router/Proxy/`cc-switch` 负责把多模型、多 provider、多 profile 管起来。

如果公司已经有 Anthropic-compatible 网关，直接用 `ANTHROPIC_BASE_URL + TOKEN + MODEL`，最简单也最稳。

如果公司只提供 OpenAI-compatible API，上 Claude Code Router 或 Claude Code Proxy，不要硬怼 base URL。

如果你经常在个人、公司、本地模型之间切换，做一个 profile 化的 `cc-switch` 小工具。它不需要神秘，只要可靠地切环境变量、切配置、显示当前 profile，就已经能避免大量低级事故。

最后那句最实用：**买 Claude Pro 不是完成 CC 初始化的唯一入口。真正需要买的，可能只是一次把配置体系理顺的耐心。**

[返回博客列表](/blog/)
