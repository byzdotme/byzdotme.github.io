---
title: Claude Code 接网关：地址、鉴权与模型名三项配置
date: 2026-06-16
category: AI/LLM
tags: [Claude Code, LLM Gateway, AI编程, 开发工具]
series: Claude Code 实战
seriesOrder: 4
---

前阵子听到一个故事：朋友已经装好了 Claude Code CLI，公司也提供了模型服务，但他不知道怎么接进去，最后为了完成初始化和登录买了 Claude Pro。

这里至少有两个问题需要先问清：公司提供的是什么协议，它是否属于 Claude Code 支持的接入方式。

这个系列前面三篇写的都是单个会话里的事——[日常工作流](/blog/claude-code-workflow-guide)、[扩展机制](/blog/claude-code-ecosystem)、[团队规范怎么分层](/blog/claude-code-team-adoption)。这一篇换个方向：会话之外，请求到底往哪台服务器走。

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

买订阅当然不是 CLI 唯一的认证路径，但「能接公司网关」和「官方支持任意第三方模型」是两件事。官方文档明确表示不支持经网关把 Claude Code 路由到非 Claude 模型；社区适配项目能不能跑通要自己验证，不能当成官方兼容能力来承诺。[网关支持边界](https://code.claude.com/docs/en/llm-gateway)

那位朋友后来被笔者戏称为小阿君。他其实只差三步配置：一个地址、一个鉴权头、一个模型名。下面把这三步说清楚，再说说笔者自己现在用什么办法在几个供应商之间切来切去。

## 大部分配置失败，是三个层次混在一起了

| 层次 | 解决的问题 | 不会自动完成的事 |
| --- | --- | --- |
| 网络代理 | 请求如何到达目标服务器 | 转换模型 API 协议 |
| LLM 网关 | 统一鉴权、路由、配额与审计 | 保证所有上游都兼容 Claude Code |
| 协议适配 | 转换请求、流式响应、工具调用等 | 保证模型具有相同能力与行为 |

`HTTPS_PROXY` 改的是网络路径，`ANTHROPIC_BASE_URL` 改的是 API 入口。把后者指向一个只有 `/v1/chat/completions` 的服务，不会自动长出 Anthropic Messages 接口——这是最常见的误解，也是很多人「配了没反应」的原因，Claude Code 要的是 `/v1/messages`。

![网络连接、API 网关和模型适配承担不同职责](/images/blog/diagrams/claude-code-custom-model-guide-01-gateway.svg)

## 环境变量：先只配三件事

先找网关维护者确认三样东西：base URL、认证头类型、允许的模型 ID。很多「接不通」其实是问错了人直接开配。

```bash
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="<YOUR_TOKEN>"
export ANTHROPIC_MODEL="deepseek-v4-pro[1m]"
claude
```

上面是 Bearer 认证的写法：`ANTHROPIC_AUTH_TOKEN` 会被拼成 `Authorization: Bearer <token>`，值本身不要再加 `Bearer ` 前缀，否则很容易变成 `Bearer Bearer xxx`。网关要 `x-api-key` 就换成 `ANTHROPIC_API_KEY`，两种认证变量别同时留着。

跑通之后，很可能发现模型名对不上：网关暴露的模型 ID 和客户端默认别名不是一套，`ANTHROPIC_DEFAULT_OPUS_MODEL`、`ANTHROPIC_DEFAULT_SONNET_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL` 分别决定三档别名指向谁，笔者自己的做法是拿一个便宜模型顶 `HAIKU`。别名只是映射关系，上游实际是什么模型、支不支持某个能力，仍然由网关决定。[模型配置](https://code.claude.com/docs/en/model-config)

`claude` 在启动时才读环境变量，所以改完要重开终端；真实 token 不要写进项目的 `.claude/settings.json`、仓库脚本、截图或日志。

## 切来切去：CC Switch 和笔者自己的脚本

故事说到这，小阿君学会了看变量表，但他真正的需求是「手里有几个供应商，随时换一个」。笔者试过 [CC Switch](https://github.com/farion1231/cc-switch) 这个开源桌面工具，用了一阵子弃用了：切换几次之后，插件和 MCP 的启用状态都丢了。它换的是整份配置，后写的那一份没把插件部分带上，于是切一次修一次，比不切还麻烦。

现在笔者用一份很小的 zsh 脚本自己维护这件事，放在 `~/.oh-my-zsh/custom/cc_alias.zsh`。骨架大概是这样，token 我这里全部换成了占位符：

```bash
typeset -g -a _CC_ENV_KEYS=(
    "ANTHROPIC_BASE_URL" "ANTHROPIC_AUTH_TOKEN" "API_TIMEOUT_MS"
    "ANTHROPIC_MODEL" "ANTHROPIC_DEFAULT_HAIKU_MODEL"
)

typeset -g -A _CC_CONFIG_DEEPSEEK=(
    "ANTHROPIC_BASE_URL" "https://api.deepseek.com/anthropic"
    "ANTHROPIC_AUTH_TOKEN" "<YOUR_TOKEN>"
    "ANTHROPIC_MODEL" "deepseek-v4-pro[1m]"
    "ANTHROPIC_DEFAULT_HAIKU_MODEL" "deepseek-v4-flash"
)

typeset -g -A _CC_CONFIG_MINIMAX=(
    "ANTHROPIC_BASE_URL" "https://api.minimaxi.com/anthropic"
    "ANTHROPIC_AUTH_TOKEN" "<YOUR_TOKEN>"
    "ANTHROPIC_MODEL" "MiniMax-M3"
)

function _cc_switch() {
    if [[ "$__CC_SWITCH__" != "true" ]]; then
        echo "❌ 访问拒绝: 内部函数"; return 1
    fi
    local provider=$1
    local config_name="_CC_CONFIG_${(U)provider}"
    for key in "${_CC_ENV_KEYS[@]}"; do unset "$key"; done
    [[ "${(L)provider}" == "clear" ]] && return 0
    for key in "${_CC_ENV_KEYS[@]}"; do
        local val_path="${config_name}[$key]"
        local val="${(P)val_path}"
        [[ -n "$val" ]] && export "$key"="$val"
    done
    echo "🟢 已切换至 $provider"
}

alias ccofficial="__CC_SWITCH__=true _cc_switch clear"
alias ccdeepseek="__CC_SWITCH__=true _cc_switch DeepSeek"
alias ccminimax="__CC_SWITCH__=true _cc_switch MiniMax"
ccdeepseek > /dev/null
```

写的时候有一点是刻意的：`_CC_ENV_KEYS` 是唯一一份「要接管哪些变量」的清单，切换时先全部 `unset` 再写新值，供应商配置里没提到的字段不会残留。另外 `_cc_switch` 里前两个 `local` 得分开两行写——写在同一个 `local` 里，zsh 取不到同一行刚赋值的 `$provider`，`config_name` 会变成 `_CC_CONFIG_`，然后一路安静地什么也不导出。这个坑同样是笔者自己踩出来的。`clear` 把这套变量清空、回到官方通道；`__CC_SWITCH__` 只是防止 `_cc_switch` 被手滑直接调用，不是安全边界。这些 token 是明文写在脚本里的，别提交进任何仓库。

这套东西当然也有边界：它只管环境变量，如果你的配置写在 `.claude/settings.json` 或别的入口里，alias 切不动那些；`CLAUDE_CONFIG_DIR` 能分开配置目录，但环境变量仍由进程继承，不算凭据隔离。

## 没配通的话，沿着请求检查

不要一上来就加兼容开关，先看具体报错：是网关拒绝了某个头、某个字段，还是上游迟迟不返回数据。跑通一次普通对话只证明主链路通了，工具调用、流式输出和错误响应才是 agent 真正依赖的交互，兼容问题往往出在这里。

| 现象 | 先确认什么 |
| --- | --- |
| 401 / 403 | 凭据是否有效，认证头是否正确，是否有目标模型权限 |
| 404 | base URL 的路径前缀、端点与模型 ID 是否匹配 |
| 普通聊天成功，工具调用失败 | 工具输入、结果关联、流式事件是否完整适配 |
| 很久没有输出 | 网关与上游的超时、流式缓冲、首包延迟 |

`/status`、`claude doctor` 和脱敏后的网关请求记录都能帮忙定位，但不要为了排错直接打印整个环境变量。说到底，连接问题最后都会落到一个具体请求上：发到了哪个地址、用了哪种认证、上游认成了什么模型、在哪一段交互断掉。小阿君花的是订阅费，我们花的只是把这个请求看清楚的时间，这笔账怎么算都更划算。

[返回博客列表](/blog/)
