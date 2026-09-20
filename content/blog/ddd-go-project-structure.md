---
title: DDD 实战（八）：用 Go 包结构守住领域边界
date: 2026-07-25
category: 架构设计
tags: [DDD, Go, 项目结构, 工程实践]
series: DDD 实战
seriesOrder: 8
visible: true
---

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

上一篇[《边界确定之后的拆与不拆》](/blog/ddd-deployment-modules)谈的是部署形态，这一篇落到最具体的一层：包怎么建。

笔者这边的情况是，新服务基本都用 Go 写，存量 Java 还在维护。这个组合有个副作用——从 Java 带过来的分层习惯会跟着人一起过来：`domain`、`service`、`repository` 一层层建好，`IUserRepository` 和 `UserRepositoryImpl` 也成对出现。Go 不需要这些。Go 的接口是隐式的，也不必为了将来可能替换实现而提前把接口抽出来。

所以这一篇不看目录长得像不像教程，只看三件事：包的依赖指向哪、身份从哪里来、事务边界画在哪。

一个 Go 项目即使分好了 `domain`、`application` 和 `infrastructure`，应用服务仍可能直接拼 SQL，HTTP 请求里的发送者 ID 仍可能未经验证就进入业务。目录看起来很规整，关键约束却没有落到代码里。

这一篇沿用消息发送的例子，重点看包依赖、身份来源和事务边界。目录只是帮助表达这些约定，不是需要完整复制的模板。

## 单 module 可以先容纳多个业务模块

对于模块化单体，可以从下面的布局开始：

```text
im-platform/
├── go.mod
├── cmd/
│   ├── api/main.go
│   └── worker/main.go
└── internal/
    ├── identity/
    ├── organization/
    ├── relationship/
    ├── group/
    ├── messaging/
    ├── notification/
    ├── openplatform/
    ├── search/
    └── governance/
```

`cmd` 放启动入口，业务实现放在各自上下文中。公共日志、时钟等技术能力有真实复用需求时再提取，不需要先建一套 `pkg/common` 等着填。`pkg/common` 尤其要盯住：一旦里面开始出现 `UserDTO`、`MessageType`、`GroupRole` 这类业务概念，它就已经从技术共享变成了边界崩坏的起点。包名也一样，别把所有包都叫 `service`，那样最后还是会得到一个 service 泥球。[Effective Go: Package names](https://go.dev/doc/effective_go#package-names)

Go 对 `internal` 有实际的导入限制：导入者必须位于其父目录对应的树内。但根级 `internal` 不会阻止这里的 organization 导入 messaging 的内部包。上下文之间的边界，仍需靠公开入口、评审或依赖检查维护，不能误以为编译器已经全部管住。[Go module 布局](https://go.dev/doc/modules/layout)

单 module 也可以构建多个可执行程序。是否要拆 module，应该看独立依赖与版本需求，而不是服务数量。

## 复杂的上下文再细分，简单模块不必四层齐全

消息用例增多后，可以进一步组织为：

```text
internal/messaging/
├── domain/
│   ├── message.go
│   ├── message_id.go
│   ├── content.go
│   ├── receipt.go
│   ├── event.go
│   └── repository.go
├── application/
│   ├── send_message.go
│   └── recall_message.go
├── adapter/
│   ├── http/handler.go
│   └── event/subscriber.go
└── infrastructure/
    ├── mysql/message_store.go
    └── mq/event_publisher.go
```

Domain 表达消息行为与不变量；application 编排用例，并定义它需要的存储或权限接口；adapter 转换外部协议；infrastructure 实现数据库等外部能力。小模块只有几个文件时，可以先放在同一个业务包内，避免为了分层来回传递没有价值的 DTO。

![代码依赖指向领域和应用接口，启动入口负责组装](/images/blog/diagrams/ddd-go-project-structure-01-dependencies.svg)

图中的箭头表示代码依赖，不是运行时的调用顺序。三条方向可以写下来备查：`adapter -> application -> domain`、`infrastructure -> domain`、`application -> domain`。应用可以通过接口调用 MySQL 实现，但不必 import 那个具体实现包。启动入口负责把实现组装进去，手写构造函数通常就够用，`wire`、`fx` 这类依赖注入方案要等依赖关系真的复杂起来再引入。

## 领域方法需要明确自己能保证什么

下面是消息模型的节选，省略了 ID、内容类型和错误值的定义：

```go
type Message struct {
    id       MessageID
    senderID MemberID
    content  Content
    recalled bool
    events   []Event
}

func (m *Message) Recall(operator MemberID) error {
    if operator != m.senderID {
        return ErrNoPermission
    }
    if m.recalled {
        return ErrAlreadyRecalled
    }

    m.recalled = true
    m.events = append(m.events, MessageRecalled{MessageID: m.id})
    return nil
}

func (m *Message) Events() []Event {
    return append([]Event(nil), m.events...)
}
```

这个方法只表达示例中的两条规则：仅发送者可撤回，不能重复撤回。真实产品若有撤回时限、管理员撤回或合规保留，还要补充对应行为，不能把示例当作完整权限模型。

领域模型里没有 ORM 标签，没有 JSON 标签，也没有数据库事务。该在构造时校验的不变量就放在这里，比如内容为空要返回 `ErrEmptyContent`，而不是等到落库时被字段约束拦下——那时错误已经离调用方很远了。

它也不能保证并发写入不会覆盖别人。保存时仍需版本检查或其他并发控制。事件在内存中产生，只表示本次操作准备记录这个事实；事务提交之前，不应把它发布给外部消费者。

这里用 `Events()` 返回快照，而没有读取后立刻清空。否则持久化失败后复用同一个对象重试，可能已经丢掉待保存事件。是否清理、何时清理，需要与对象生命周期一起设计。

## 接口由需要它的用例定义

以聚合为中心的仓储接口可以放在 domain，用例专用的查询或提交端口可以放在 application。不必给每个 struct 配一个同名 interface。

消息发送既需要保存消息，也需要可靠保存待发事件，因此可以在应用侧定义一个明确的提交契约：

```go
type MessageStore interface {
    SaveMessageAndOutbox(
        ctx context.Context,
        key IdempotencyKey,
        message *domain.Message,
        events []domain.Event,
    ) (domain.MessageID, error)
}
```

这是接口节选，不包含持久化实现。方法名只是说明意图，MySQL 实现必须真正使用同一个事务。幂等键也要有数据库唯一约束：同一键和相同请求返回已有消息 ID；同一键却内容不同，应拒绝，而不是静默复用。

把它写成两个分别提交的 `messages.Save` 和 `outbox.Save`，再顺序调用，不满足这个契约。也可以使用 Unit of Work，向回调提供绑定同一事务的仓储与 outbox；两种写法的重点都是提交边界可验证。

## 应用服务连接权限、模型与提交

发送用例可以保留下面这样的轮廓。类型和构造函数省略，重点是各步骤的责任：

```go
func (h *SendMessageHandler) Handle(
    ctx context.Context,
    cmd SendMessageCommand,
) (domain.MessageID, error) {
    if err := h.access.CheckSend(
        ctx, cmd.TenantID, cmd.SenderID, cmd.ConversationID,
    ); err != nil {
        return "", err
    }

    if err := h.governance.CheckMessage(ctx, cmd.Content); err != nil {
        return "", err
    }

    message, err := domain.NewMessage(
        h.ids.Next(), cmd.ConversationID, cmd.SenderID, cmd.Content,
    )
    if err != nil {
        return "", err
    }

    return h.store.SaveMessageAndOutbox(
        ctx, cmd.IdempotencyKey(), message, message.Events(),
    )
}
```

`SenderID` 必须由可信认证信息产生，不是请求体里的任意字段。`CheckSend` 负责发送资格，消息模型负责自身规则，存储端口负责原子提交和幂等。若存储返回的是已有消息 ID，应用也应原样返回，而不是使用这次临时生成的新 ID。

权限复核与消息提交之间仍有并发窗口。前面在[《消息之后的通知、搜索与开放平台》](/blog/ddd-im-message-notification-search-open-platform)里讨论过：如果业务不允许窗口内的撤权竞态，需要明确额外的一致性机制。代码里出现 `CheckSend`，不等于这个问题自动解决了。

## HTTP 适配层尤其要看身份从哪里来

请求 DTO 可以包含会话 ID、客户端消息 ID 和正文。操作者则从已验证的登录态或应用凭证中取得，再结合目标租户确定成员身份。

例如下面是字段映射示意，`principal` 表示认证中间件已经验证的主体：

```go
cmd := application.SendMessageCommand{
    TenantID:        principal.TenantID,
    SenderID:        principal.MemberID,
    ConversationID: req.ConversationID,
    ClientMessageID: req.ClientMessageID,
    Content:        content,
}
```

`principal` 的构造、租户选择校验、正文解析和错误映射都需要真实实现，不能只靠一个变量名假定安全。机器人入口则使用应用身份及其授权上下文，不应伪装成普通用户。

HTTP Request、框架 context 和 JSON DTO 留在适配层。领域对象不需要知道请求来自 HTTP、gRPC 还是事件订阅。标准库 `context.Context` 可以用于应用与存储操作，但不必让纯粹的内存规则也携带请求上下文。

## 多 module 要把依赖关系写完整

确实需要独立 module 时，一个仓库可以这样组织：

```text
im-platform/
├── go.work
├── services/
│   ├── messaging/
│   │   ├── go.mod
│   │   ├── cmd/api/main.go
│   │   └── internal/
│   └── openplatform/
│       ├── go.mod
│       ├── cmd/api/main.go
│       └── internal/
└── libs/
    └── telemetry/
        └── go.mod
```

每个 module 都有自己的 `go.mod`。`go.work` 的 `use` 指向这些 module 目录，帮助本地联合开发；它不会把一个没有 `go.mod` 的普通目录变成可独立依赖的 module。CI 和独立发布也应检查离开本地 workspace 后的依赖是否仍能解析。[Go 多模块 workspace 教程](https://go.dev/doc/tutorial/workspaces)

共享包应有明确契约。两个服务共同依赖消息数据库实体，会让内部字段变化变成跨服务升级。对外 API DTO、事件 schema 或客户端包可以复用，但也要维护版本与兼容性；“稳定协议”不表示永远不变。

有一条原则值得单独写出来：不要让多个服务共享可变领域模型。如果 Messaging 和 Open Platform 都 import 同一个 `domains/messaging/domain.Message`，那内部领域模型改一次，外部服务就要跟着改一次，前面辛苦划的边界等于白划。

最后检查项目结构时，笔者会找一条真实用例，从请求身份追到领域行为、事务提交和事件消费。若这些位置容易定位，测试也能验证失败场景，目录就已经发挥了作用。没有必要继续为了凑齐层次增加空包和转发接口。

[DDD 实战](/blog/ddd-complex-business)这个系列到这里告一段落。回头看，它讲的是一套把规则分配到模型里的方法，而真正难的部分往往不在建模，而在模型定下来之后怎么让它不被绕过——赶进度时直接查表、紧急需求绕过写入口、两个团队各自解释同一个词。这道防线怎么长期维持，笔者还没有满意的答案，先挖个坑在这里。
