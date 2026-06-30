---
title: DDD 实战（三）：战术设计，实体、值对象、聚合根与领域事件
date: 2021-11-09
category: 架构设计
tags: [DDD, 战术设计, 聚合根, 领域事件]
series: DDD 实战
seriesOrder: 3
---

# DDD 实战（三）：战术设计，实体、值对象、聚合根与领域事件

战略设计解决“系统如何按业务边界拆开”，战术设计解决“一个边界内部如何表达业务规则”。

很多团队实践 DDD 失败，问题不在于不知道概念，而在于把战术概念直接映射成技术对象：

* 数据库主表就是聚合根。
* 数据库从表就是实体。
* 所有字段对象都是值对象。
* 所有 service 都叫领域服务。
* 所有 MQ 消息都叫领域事件。

这样做没有真正改变模型，只是换了一套名词。战术设计的关键，是围绕业务不变量和行为来建模，而不是围绕表结构建模。

Microsoft 的战术 DDD 文档把实体、值对象、聚合、领域服务、领域事件作为 bounded context 内部的建模模式，并强调聚合是事务一致性边界，而不是对象层级装饰。[Microsoft: Tactical DDD](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design)

## 1. 实体：身份比属性更重要

实体的核心特征是有身份。只要身份不变，属性变化以后仍然是同一个业务对象。

在协同办公 IM 里，下面这些通常是实体：

* Account：账号 ID 不变，手机号、头像、昵称可以变化。
* Member：组织成员 ID 不变，部门、岗位、状态可以变化。
* Group：群 ID 不变，群名称、公告、头像可以变化。
* Message：消息 ID 不变，已读状态、撤回状态、编辑状态可以变化。

判断一个对象是不是实体，不要先问它有没有数据库 ID，而要问：**业务是否需要跨时间追踪它的连续身份？**

比如“群昵称”通常不是实体。它只是某个群成员在某个群里的展示值，变了以后不需要追踪为一个独立对象。它更像群成员实体上的一个属性，或者一个值对象。

实体不应该只是字段集合。实体应该承载和自己身份紧密相关的业务行为。

例如群成员可以有这些行为：

```go
func (m *GroupMember) Mute(by MemberID, until time.Time) error
func (m *GroupMember) ChangeRole(by MemberID, role GroupRole) error
func (m *GroupMember) Leave(now time.Time) error
```

这些行为背后可以封装规则：谁能禁言、管理员是否能移除群主、退出后是否保留历史消息权限。不要把所有规则都挪到外部 service。

## 2. 值对象：用值表达业务概念

值对象没有独立身份，只由属性值定义。两个值对象只要值相同，就可以认为相等。

协同办公 IM 里常见的值对象包括：

* PhoneNumber：手机号。
* EmailAddress：邮箱。
* MessageContent：消息内容。
* TimeRange：时间范围。
* TenantID、GroupID、MessageID 这类强类型 ID。
* PermissionScope：权限范围。

值对象的价值，是让代码表达业务含义，而不是到处传裸字符串、裸整数、裸 map。

比如消息内容不应该只是一个 `string`。真实 IM 里，消息可能有文本、图片、文件、卡片、引用、表情、富文本、加密载荷。更好的做法是让 `MessageContent` 明确表达内容类型、大小限制、摘要生成、安全策略和序列化边界。

值对象通常应该不可变。更新一个值对象时，创建一个新值替换旧值，而不是在原对象上到处修改。这样更容易推理，也更适合并发和事件记录。

## 3. 聚合：一致性边界，不是表集合

聚合是战术设计中最容易被误用的概念。

很多人把“主表 + 从表”看成聚合，比如 `group` 表加 `group_member` 表就是 Group 聚合。这个判断可能对，也可能不对。真正要问的是：**哪些对象必须在一次业务事务中保持一致？**

聚合关注的是业务不变量。

以群组为例，Group 聚合可能需要维护这些规则：

* 群必须有且只有一个群主。
* 群主不能被普通管理员移除。
* 群成员数量不能超过群容量。
* 禁言状态必须满足群治理规则。
* 入群审批通过后才能成为正式成员。

如果这些规则要求 Group 和 GroupMember 在一次事务中一起校验和修改，那么它们可以处于同一个聚合内。

但消息通常不应该放进 Group 聚合。因为一个群可以有海量消息，消息有独立生命周期，消息发送、撤回、已读、搜索、归档都不应该锁住整个群聚合。群组聚合只需要提供“这个会话是否允许发送”的规则，消息事实属于消息聚合或会话消息上下文。

这就是聚合设计的关键：**小聚合优先，只把必须强一致的对象放在一起。**

## 4. 聚合根：外部访问聚合的入口

一个聚合只能有一个聚合根。外部对象应该通过聚合根访问聚合内部对象，而不是直接修改内部实体。

比如 Group 是聚合根，GroupMember 是聚合内部实体。外部不应该直接调用 `GroupMemberRepository.Save(member)` 去改群成员角色，而应该通过 Group 聚合：

```go
func (g *Group) ChangeMemberRole(operator MemberID, target MemberID, role GroupRole) error {
    if !g.canManage(operator, target) {
        return ErrNoPermission
    }
    if target == g.ownerID && role != GroupRoleOwner {
        return ErrCannotDemoteOwner
    }
    g.members.ChangeRole(target, role)
    g.addEvent(GroupMemberRoleChanged{
        GroupID:  g.id,
        MemberID: target,
        Role:     role,
    })
    return nil
}
```

这样做的意义不是“代码更面向对象”，而是防止业务不变量被绕过。

如果任何地方都能直接改 `group_member.role`，那群主唯一性、权限校验、审计事件就很难保证。

## 5. 领域服务：放那些不属于单个实体的规则

领域服务不是普通 service 的新名字。

只有当某个业务规则不自然属于单个实体或值对象时，才需要领域服务。它应该表达领域行为，而不是编排数据库、调用 RPC、发 MQ。

比如“两个成员是否允许建立好友关系”，可能需要考虑：

* 双方是否在同一租户。
* 是否已被对方拉黑。
* 组织策略是否允许外部联系。
* 是否命中风控策略。
* 是否需要审批。

这个规则不完全属于 Account，也不完全属于 ContactRelation。可以抽象成领域服务：

```go
type RelationshipPolicy interface {
    CanCreateFriendship(ctx context.Context, applicant MemberID, target MemberID) (Decision, error)
}
```

但如果只是“查询用户并保存数据库”，那不是领域服务，那是应用服务或基础设施。

## 6. Repository：保存聚合，不是封装任意 SQL

Repository 的职责是以领域模型的方式加载和保存聚合。它不是 DAO 的同义词，也不是给每张表都配一个仓储。

更合理的接口通常长这样：

```go
type GroupRepository interface {
    Get(ctx context.Context, id GroupID) (*Group, error)
    Save(ctx context.Context, group *Group) error
}
```

它隐藏了 Group 聚合如何落库。也许背后是一张 `groups` 表和一张 `group_members` 表，也许还有缓存、版本号、乐观锁。应用层不关心这些细节。

Repository 接口通常属于领域层或应用层的端口，具体实现属于基础设施层。这能保持依赖方向从外向内，避免领域模型依赖数据库框架。

## 7. 应用服务：编排用例，不承载核心规则

应用服务负责完成一个用例的编排：

1. 校验请求身份和基本参数。
2. 加载聚合。
3. 调用领域行为。
4. 保存聚合。
5. 发布领域事件或写 outbox。
6. 返回 DTO。

例如创建群聊：

```go
func (s *CreateGroupService) Handle(ctx context.Context, cmd CreateGroupCommand) (GroupID, error) {
    creator, err := s.members.Get(ctx, cmd.CreatorID)
    if err != nil {
        return "", err
    }

    group, err := groupdomain.NewGroup(cmd.Name, creator.ID(), cmd.MemberIDs)
    if err != nil {
        return "", err
    }

    if err := s.groups.Save(ctx, group); err != nil {
        return "", err
    }

    return group.ID(), s.events.Publish(ctx, group.PullEvents())
}
```

这里的应用服务不应该决定“群主是否能被移除”“群人数是否超限”“入群是否需要审批”。这些规则应该在领域模型里。

应用服务可以处理事务、幂等、权限入口、日志和调用编排，但不能变成所有业务规则的垃圾桶。

## 8. 领域事件：业务事实，不是普通消息

领域事件表达的是领域中已经发生的业务事实。它通常用过去式命名：

* `GroupCreated`
* `GroupMemberJoined`
* `MessageSent`
* `MessageRecalled`
* `OrganizationMemberRemoved`
* `ContactRelationBlocked`

领域事件不是“我要通知谁做什么”，而是“某件业务事实已经发生”。订阅方根据这个事实决定自己的动作。

例如 `MessageSent` 发生后：

* 通知上下文可以生成离线推送。
* 搜索上下文可以更新索引。
* 开放平台上下文可以触发机器人和 Webhook。
* 审计上下文可以记录审计日志。
* AI 上下文可以异步生成摘要。

消息发送主链路不应该同步等待这些全部完成。领域事件的价值，就是把核心事实和派生动作解耦。

但领域事件也要谨慎使用。不要把所有方法调用都改成事件。强一致规则仍然应该在聚合内完成；跨上下文、可异步、可重试、可补偿的动作，才适合事件化。

## 9. Outbox：让领域事件可靠落地

真实系统里，最危险的情况是：数据库写成功了，但事件没发出去。比如消息已经入库，但搜索、通知、开放平台都不知道这条消息存在。

常见做法是使用 outbox 模式：

1. 在同一个数据库事务中保存业务数据和待发布事件。
2. 后台任务扫描 outbox 表。
3. 将事件发布到 MQ 或事件总线。
4. 发布成功后标记事件状态。
5. 消费端按事件 ID 做幂等。

这样不要求数据库和 MQ 做分布式事务，也能显著提高事件可靠性。

对于协同办公 IM 这种事件密集型系统，outbox 几乎是领域事件落地时必须考虑的基础能力。

## 10. 战术设计的底线

战术设计不是为了把代码写得复杂，而是为了守住几个底线：

* 业务规则有明确归属。
* 聚合保护强一致不变量。
* 应用服务只编排用例，不吞掉领域模型。
* Repository 保存聚合，不暴露表结构。
* 领域事件表达业务事实，而不是技术通知。
* 跨聚合协作默认考虑最终一致和幂等。

如果这些底线守不住，就算项目目录看起来非常 DDD，本质上仍然是普通事务脚本。

下一篇开始，我们把这些概念放进完整的协同办公 IM 平台里，看如何从钉钉、飞书/Lark 等公开能力反推业务域地图。

[返回博客列表](/blog/)
