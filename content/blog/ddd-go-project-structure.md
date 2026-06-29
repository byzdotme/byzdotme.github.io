---
title: DDD 实战（八）：Go 项目中的 DDD 代码组织
date: 2026-06-29
category: 架构设计
tags: [DDD, Go, 项目结构, 工程实践]
series: DDD 实战
seriesOrder: 8
---

# DDD 实战（八）：Go 项目中的 DDD 代码组织

前面七篇讲了 DDD 的概念、协同办公 IM 的业务域和部署模块。这一篇落到 Go 项目。

Go 里实践 DDD，要特别小心一件事：不要把 Java 的写法原样搬过来。

Go 的包、接口、组合、错误处理、依赖管理都有自己的习惯。Go 官方的模块布局文档也强调，项目结构应该从简单开始，随着包和命令增多再演进，而不是一开始就套复杂模板。[Go Modules: Organizing a Go module](https://go.dev/doc/modules/layout)

Effective Go 也强调包名应该简短、清晰、有意义，调用方会通过包名使用导出的标识符。[Effective Go: Package names](https://go.dev/doc/effective_go#package-names)

所以 Go 项目里的 DDD，不应该追求“目录看起来像经典 DDD”，而应该追求三件事：

* 业务边界清楚。
* 依赖方向清楚。
* Go 代码自然。

## 1. 单模块项目的推荐结构

如果协同办公 IM 还处在模块化单体阶段，可以采用单 Go module：

```text
im-platform
├── go.mod
├── cmd
│   ├── api
│   │   └── main.go
│   └── worker
│       └── main.go
├── internal
│   ├── identity
│   ├── organization
│   ├── relationship
│   ├── group
│   ├── messaging
│   ├── notification
│   ├── openplatform
│   ├── search
│   └── governance
└── pkg
    ├── errors
    ├── logger
    └── clock
```

`cmd` 放启动入口。`internal` 放业务上下文，防止被仓库外部 import。`pkg` 只放真正通用、无业务含义的技术包。

注意，不要把所有东西都放进 `pkg/common`。如果一个包里出现 `UserDTO`、`MessageType`、`GroupRole` 这种业务概念，它大概率不应该在公共包里。

业务模型应该属于某个明确上下文。

## 2. 单个上下文内部怎么组织

以 `messaging` 为例，可以这样组织：

```text
internal/messaging
├── domain
│   ├── message.go
│   ├── message_id.go
│   ├── content.go
│   ├── receipt.go
│   ├── event.go
│   └── repository.go
├── application
│   ├── send_message.go
│   ├── recall_message.go
│   └── query_message.go
├── adapter
│   ├── http
│   │   └── handler.go
│   └── event
│       └── subscriber.go
└── infrastructure
    ├── mysql
    │   └── message_repository.go
    └── mq
        └── event_publisher.go
```

这不是唯一结构，但它表达了几个规则：

* `domain` 放领域模型和领域接口。
* `application` 放用例编排。
* `adapter` 放输入输出适配，比如 HTTP、gRPC、事件订阅。
* `infrastructure` 放数据库、MQ、缓存、外部服务实现。

依赖方向应该是：

```text
adapter -> application -> domain
infrastructure -> domain
application -> domain
```

领域层不能依赖 MySQL、Redis、Gin、Kafka、HTTP 框架。

## 3. Domain 包里应该有什么

`domain` 里放的是业务模型，不是数据库模型。

一个简化的消息模型可以这样写：

```go
package domain

type Message struct {
    id             MessageID
    conversationID ConversationID
    senderID       MemberID
    content        Content
    status         MessageStatus
    events         []Event
}

func NewMessage(id MessageID, conversationID ConversationID, senderID MemberID, content Content) (*Message, error) {
    if content.IsEmpty() {
        return nil, ErrEmptyContent
    }

    msg := &Message{
        id:             id,
        conversationID: conversationID,
        senderID:       senderID,
        content:        content,
        status:         MessageStatusSent,
    }

    msg.events = append(msg.events, MessageSent{
        MessageID:      id,
        ConversationID: conversationID,
        SenderID:       senderID,
    })

    return msg, nil
}

func (m *Message) Recall(operator MemberID) error {
    if m.senderID != operator {
        return ErrNoPermission
    }
    if m.status == MessageStatusRecalled {
        return ErrMessageAlreadyRecalled
    }

    m.status = MessageStatusRecalled
    m.events = append(m.events, MessageRecalled{MessageID: m.id})
    return nil
}

func (m *Message) PullEvents() []Event {
    events := m.events
    m.events = nil
    return events
}
```

这里没有 ORM 标签，没有 JSON 标签，也没有数据库事务。领域模型只表达消息业务规则。

## 4. Repository 接口放哪里

Repository 接口可以放在 `domain`，也可以放在 `application`。我更倾向于：如果接口以聚合为中心，就放在 `domain`；如果接口只是某个用例需要的查询端口，就放在 `application`。

例如聚合仓储：

```go
package domain

type MessageRepository interface {
    Get(ctx context.Context, id MessageID) (*Message, error)
    Save(ctx context.Context, message *Message) error
}
```

MySQL 实现放到基础设施层：

```go
package mysql

type MessageRepository struct {
    db *sql.DB
}

func (r *MessageRepository) Get(ctx context.Context, id domain.MessageID) (*domain.Message, error) {
    // 查询数据库并组装领域模型
}

func (r *MessageRepository) Save(ctx context.Context, message *domain.Message) error {
    // 将领域模型持久化
}
```

接口在内层，实现往外放。这是依赖倒置。应用服务依赖接口，启动时由 wire、fx、手写构造函数等方式注入实现。

## 5. Application Service 怎么写

应用服务负责用例编排。

例如发送消息：

```go
package application

type SendMessageHandler struct {
    messages      domain.MessageRepository
    conversations ConversationPort
    policies      GovernancePort
    ids           IDGenerator
    outbox        Outbox
}

func (h *SendMessageHandler) Handle(ctx context.Context, cmd SendMessageCommand) (domain.MessageID, error) {
    allowed, err := h.conversations.CanSend(ctx, cmd.ConversationID, cmd.SenderID)
    if err != nil {
        return "", err
    }
    if !allowed {
        return "", ErrCannotSendMessage
    }

    if err := h.policies.CheckMessage(ctx, cmd.SenderID, cmd.Content); err != nil {
        return "", err
    }

    msg, err := domain.NewMessage(h.ids.NextMessageID(), cmd.ConversationID, cmd.SenderID, cmd.Content)
    if err != nil {
        return "", err
    }

    if err := h.messages.Save(ctx, msg); err != nil {
        return "", err
    }

    if err := h.outbox.Save(ctx, msg.PullEvents()); err != nil {
        return "", err
    }

    return msg.ID(), nil
}
```

这个应用服务做了编排，但没有把核心业务规则都写死在自己里面。

发送权限来自 ConversationPort，风控来自 GovernancePort，消息不变量由 Message 聚合自己维护，事件通过 outbox 落地。

## 6. Adapter 不要反向污染领域

HTTP handler、gRPC handler、MQ subscriber 都属于 adapter。

它们应该把外部协议转换成应用命令：

```go
package http

func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
    var req SendMessageRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, err)
        return
    }

    id, err := h.sender.Handle(r.Context(), application.SendMessageCommand{
        ConversationID: domain.ConversationID(req.ConversationID),
        SenderID:       domain.MemberID(req.SenderID),
        Content:        domain.NewTextContent(req.Text),
    })
    if err != nil {
        writeError(w, err)
        return
    }

    writeJSON(w, SendMessageResponse{MessageID: string(id)})
}
```

注意不要把 `http.Request`、JSON DTO、框架 context 传进领域模型。领域层不应该知道请求来自 HTTP、gRPC 还是 MQ。

## 7. Monorepo 下怎么组织多个服务

如果系统已经拆出多个服务，但仍放在一个仓库，可以这样组织：

```text
im-platform
├── go.work
├── services
│   ├── im-api
│   │   ├── go.mod
│   │   └── cmd
│   ├── open-platform-api
│   │   ├── go.mod
│   │   └── cmd
│   └── search-worker
│       ├── go.mod
│       └── cmd
├── domains
│   ├── messaging
│   ├── organization
│   ├── group
│   └── notification
└── libs
    ├── observability
    ├── config
    └── errors
```

`go.work` 可以帮助本地同时开发多个 module。每个服务有自己的 `go.mod`，共享领域包时要非常谨慎。

一个重要原则是：**不要让多个服务共享可变领域模型。**

如果 Messaging 服务和 Open Platform 服务都 import 同一个 `domains/messaging/domain.Message`，短期看减少重复，长期可能造成强耦合。内部领域模型一改，外部服务也被迫改。

更稳妥的方式是：

* 服务内部拥有自己的领域模型。
* 跨服务使用 API DTO、事件 schema 或 client 包。
* 共享包只放稳定协议或无业务状态的工具。
* 不把数据库模型作为跨服务共享模型。

## 8. 单模块和 monorepo 的取舍

单模块适合：

* 系统还在快速探索。
* 团队规模较小。
* 领域边界还在调整。
* 发布节奏基本一致。
* 运维能力有限。

monorepo 多服务适合：

* 领域边界较稳定。
* 服务需要独立发布。
* 团队需要共享工具链。
* 跨服务重构频繁。
* CI 能按变更范围构建和测试。

不要为了“看起来架构先进”提前上 monorepo 多服务。也不要在业务已经明显分化后继续把所有代码塞进一个巨大 module。

工程结构要服务业务演进，而不是服务架构审美。

## 9. Go 里实践 DDD 的几个禁忌

**不要过度抽象接口。** Go 里接口应该由使用方定义，而不是每个 struct 都先配一个 interface。

**不要把所有包都叫 service。** `identity/service`、`messaging/service`、`group/service` 最后还是会变成 service 泥球。用业务含义命名包。

**不要让 domain 依赖 ORM。** ORM tag、数据库连接、事务对象都不应该进入领域模型。

**不要在 pkg/common 放业务对象。** 一旦业务对象进入 common，边界就开始崩。

**不要追求纯洁到无法落地。** 有些查询场景可以走 read model，不必为了“聚合纯粹”绕很远。

**不要把 Java 分层照搬过来。** Go 不需要到处 `IUserRepository`、`UserRepositoryImpl`。包名和接口名要符合 Go 习惯。

## 10. 一个可落地的起点

如果现在要给协同办公 IM 起一个 Go DDD 项目，我会从这个结构开始：

```text
cmd/api
cmd/worker
internal/identity
internal/organization
internal/relationship
internal/group
internal/messaging
internal/notification
internal/openplatform
internal/search
internal/governance
pkg/errors
pkg/logger
pkg/clock
```

每个业务上下文内部先保持四层：

```text
domain
application
adapter
infrastructure
```

同时建立几条硬规则：

* 外层可以依赖内层，内层不能依赖外层。
* 跨上下文只能通过接口、DTO 或事件。
* 数据库表有明确 owner。
* 领域事件先用 outbox 落地。
* 搜索、通知、开放平台优先异步化。
* 公共包只放技术能力，不放业务模型。

这不是唯一正确结构，但它足够简单，也给未来拆服务留下空间。

DDD 的落地，不是把项目一次性改造成某种理想形态，而是在每次业务变化中持续守住模型边界。Go 项目尤其如此：代码要朴素，边界要清楚，抽象要克制。

如果这个系列只能留下一个结论，那就是：**DDD 的目标不是让项目看起来复杂，而是让复杂业务仍然能被人理解、修改和演进。**

[返回博客列表](/blog/)
