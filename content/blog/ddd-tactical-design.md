---
title: DDD 实战（三）：战术设计，实体、值对象、聚合根与领域事件
date: 2026-07-04
category: 架构设计
tags: [DDD, 战术设计, 聚合根, 领域事件]
series: DDD 实战
seriesOrder: 3
---

> 海外 AI 服务代充推荐：[BeWild](https://bewild.ai?code=BYZDOTME)（推广链接）。

上一篇[战略设计](/blog/ddd-strategic-design)划出的是边界，这一篇要处理边界里面的东西。

笔者在这个阶段踩过一次坑：把战术设计当成了目录重排——照着示例建 `domain`、`entity` 几个包，把结构体搬进去，规则还留在原来的 service 里。搬完目录看着挺像样，可群主唯一性、群人数上限这些约束，依旧散在四五个调用点。

战术设计的检验标准不是包建得对不对，而是规则有没有落在一个说得清的地方。下面三个问题，都比“哪张表是聚合根”更适合作为起点：

群主转让需要同时改变哪些状态？管理员能不能把自己提升为群主？两个邀请请求并发进入时，群人数还能否保持在容量内？

上一篇[战略设计](/blog/ddd-strategic-design)确定模型在哪个上下文内成立，这一篇继续讨论：怎样把规则放进模型，以及怎样让事务和并发控制保护它。

Microsoft 的战术 DDD 文档把实体、值对象、聚合、领域服务、领域事件作为 bounded context 内部的建模模式，并强调聚合是事务一致性边界，而不是对象层级装饰。[Microsoft: Tactical DDD](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design)

## 实体需要持续追踪身份

实体的核心特征是有身份。只要身份不变，属性变化以后仍然是同一个业务对象。

在协同办公 IM 里，下面这些通常是实体：

* Account：账号 ID 不变，手机号、头像、昵称可以变化。
* Member：组织成员 ID 不变，部门、岗位、状态可以变化。
* Group：群 ID 不变，群名称、公告、头像可以变化。
* Message：消息 ID 不变，撤回状态、编辑状态可以变化；每个接收人的已读状态可以由独立回执或游标表示。

判断一个对象是不是实体，不要先问它有没有数据库 ID，而要问：**业务是否需要跨时间追踪它的连续身份？**

比如“群昵称”通常不是实体。它只是某个群成员在某个群里的展示值，变了以后不需要追踪为一个独立对象。它更像群成员实体上的一个属性，或者一个值对象。

实体不应该只是字段集合。实体应该承载和自己身份紧密相关的业务行为。

例如群成员可以有这些行为：

```go
func (m *GroupMember) Mute(by MemberID, until time.Time) error
func (m *GroupMember) ChangeRole(by MemberID, role GroupRole) error
func (m *GroupMember) Leave(now time.Time) error
```

这些签名只是行为示意。`by MemberID` 本身不能证明操作者有管理权限；如果判断需要群主身份、操作者角色等群内事实，就应由持有这些事实的 Group 聚合校验，再修改内部成员。把方法放在实体上并不会自动补齐规则所需的数据。

具体要校验什么，取决于产品：谁能禁言、管理员能不能移除群主、退出群聊之后还保不保留历史消息的查看权限。这三条在不同产品里的答案不一样，但它们都属于群内事实，应该由持有群成员集合的 Group 聚合来判断，而不是留给调用方各自补条件。

## 值对象让参数带上业务含义

值对象没有独立身份，只由属性值定义。两个值对象只要值相同，就可以认为相等。

协同办公 IM 里常见的值对象包括：

* PhoneNumber：手机号。
* EmailAddress：邮箱。
* MessageContent：消息内容。
* TimeRange：时间范围。
* TenantID、GroupID、MessageID 这类强类型 ID。
* PermissionScope：权限范围。

强类型 ID 是这里最容易被跳过、收益又最直接的一类。`GetMember(id GroupID)` 和 `GetMember(id MemberID)` 在编译器眼里是两回事，把群 ID 传进成员查询会当场编译不过；如果两处都用 `string`，这个错误要等到线上有人查错了群才会被发现。

值对象的价值，是让代码表达业务含义，而不是到处传裸字符串、裸整数、裸 map。

如果消息只有短文本，一个受校验的字符串就可能够用。出现图片、文件、卡片、引用或加密载荷后，`MessageContent` 才更有必要表达内容类型和自身约束。依赖租户配置、用户权限或外部服务的安全策略，不必都塞进这个值对象。

值对象通常应该不可变。更新一个值对象时，创建一个新值替换旧值，而不是在原对象上到处修改。这样更容易推理，也更适合并发和事件记录。

## 从并发下必须成立的规则确定聚合

聚合是战术设计中最容易被误用的概念。

很多人把“主表 + 从表”看成聚合，比如 `group` 表加 `group_member` 表就是 Group 聚合。这个判断可能对，也可能不对。真正要问的是：**哪些对象必须在一次业务事务中保持一致？**

聚合关注的是业务不变量。

以群组为例，Group 聚合可能需要维护这些规则：

* 群必须有且只有一个群主。
* 群主不能被普通管理员移除。
* 群成员数量不能超过群容量。
* 禁言状态必须满足群治理规则。
* 入群审批通过后才能成为正式成员。

如果这些规则要求 Group 和 GroupMember 在一次事务中一起校验和修改，那么它们可以处于同一个聚合内。不过，一个大群的全部成员并不因此都要每次加载到内存。需要结合访问模式设计加载方式，并用版本检查、锁或数据库约束保证并发下不超员、不产生两个群主。只在 Go 对象里检查一次人数，拦不住两个请求同时通过检查。

但消息通常不应该放进 Group 聚合。因为一个群可以有海量消息，消息有独立生命周期，消息发送、撤回、已读、搜索、归档都不应该锁住整个群聚合。群组聚合只需要提供“这个会话是否允许发送”的规则，消息事实属于消息聚合或会话消息上下文。

如果成员增长和操作并发使这个边界代价过高，可以重新评估哪些规则必须一起提交。例如成员容量可以通过受控计数维护，成员详情独立加载。拆开以后如何保护容量约束需要另行设计，不能仅靠“小聚合优先”得出答案。

## 聚合根负责守住修改入口

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
    if target != g.ownerID && role == GroupRoleOwner {
        return ErrUseTransferOwnership
    }
    if err := g.members.ChangeRole(target, role); err != nil {
        return err
    }
    g.addEvent(GroupMemberRoleChanged{
        GroupID:  g.id,
        MemberID: target,
        Role:     role,
    })
    return nil
}
```

这个片段把普通角色修改与群主转让区分开：仅禁止降级旧群主还不够，否则给另一个成员设置 Owner 仍可能产生两个群主。转让需要专门的行为，在同一事务中更新旧群主、新群主和 `ownerID`。示例省略了并发版本校验和持久化实现，不是完整的群管理代码。

如果其他入口仍能直接更新 `group_member.role`，这些保护就会被绕过。因此聚合根的约束还需要落实到仓储、后台任务和管理工具的写入路径。

## 没有自然归属的规则才需要领域服务

领域服务不是普通 service 的新名字。

当某个业务规则不自然属于单个实体或值对象时，可以使用领域服务。所需数据可以经端口提供，但连接管理、重试和协议转换应留给外层实现。

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

## 仓储按聚合组织，查询不必全部绕聚合

Repository 的职责是以领域模型的方式加载和保存聚合。它不是 DAO 的同义词，也不是给每张表都配一个仓储。

更合理的接口通常长这样：

```go
type GroupRepository interface {
    Get(ctx context.Context, id GroupID) (*Group, error)
    Save(ctx context.Context, group *Group) error
}
```

它隐藏了 Group 聚合如何落库。也许背后是一张 `groups` 表和一张 `group_members` 表，也许还有缓存和版本号。应用层不需要拼装这些 SQL，但必须知道保存可能因版本冲突失败，并决定是向调用方返回冲突，还是重新加载后再执行用例。

群列表、分页成员列表这类查询可以使用专门的读模型。它们不修改业务状态，没有必要为了复用仓储而加载完整聚合。一个两千人的群，翻一页成员列表就要把整个聚合读进内存，代价和收益完全不成比例；读模型只查 `group_members` 加几个展示字段就够了，聚合留给真正需要保护不变量的写入路径。

Repository 接口通常属于领域层或应用层的端口，具体实现属于基础设施层。这能保持依赖方向从外向内，避免领域模型依赖数据库框架。

## 应用服务把用例和事务连接起来

应用服务负责完成一个用例的编排：

1. 校验请求身份和基本参数。
2. 加载聚合。
3. 调用领域行为。
4. 保存聚合。
5. 将需要可靠发布的事件和业务数据一同写入 outbox，再由后台发布。
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

    err = s.tx.Within(ctx, func(groups GroupRepository, outbox Outbox) error {
        if err := groups.Save(ctx, group); err != nil {
            return err
        }
        return outbox.Save(ctx, group.PullEvents())
    })
    if err != nil {
        return "", err
    }
    return group.ID(), nil
}
```

反过来说，应用服务该负责什么也要写清楚：事务边界、幂等、权限入口、日志和调用编排。把这四件事明确留在应用层，领域模型才不用去关心它们。

这里的应用服务不应该决定“群主是否能被移除”“群人数是否超限”“入群是否需要审批”。这些规则应该在领域模型里。

这里的 `Within` 是事务边界示意：它向回调提供绑定同一个数据库事务的仓储和 outbox，任一步骤失败都回滚，成功才提交。若先提交群数据、再单独发布事件，发布失败会导致“群已创建但后续模块不知情”；仅把两行调用写在一起无法保证原子性。

## 事件记录已经发生的事

领域事件表达的是领域中已经发生的业务事实。它通常用过去式命名：

* `GroupCreated`
* `GroupMemberJoined`
* `MessageSent`
* `MessageRecalled`
* `OrganizationMemberRemoved`
* `ContactRelationBlocked`

领域事件不是“通知谁去做什么”，而是“某件业务事实已经发生”。订阅方根据这个事实决定自己的动作。

例如 `MessageSent` 发生后：

* 通知上下文可以生成离线推送。
* 搜索上下文可以更新索引。
* 开放平台上下文可以触发机器人和 Webhook。
* 审计上下文可以记录审计日志。
* AI 上下文可以异步生成摘要。

这些后续动作通常不必全部完成，发送接口才返回。需要可靠记录的审计事实可以随业务事务持久化，报表和检索则再异步处理。具体哪些动作允许延后，要由业务约定决定。

但领域事件也要谨慎使用。不要把所有方法调用都改成事件。强一致规则仍然应该在聚合内完成；跨上下文、可异步、可重试、可补偿的动作，才适合事件化。

## Outbox 补上提交与发布之间的空隙

真实系统里，最危险的情况是：数据库写成功了，但事件没发出去。比如消息已经入库，但搜索、通知、开放平台都不知道这条消息存在。

常见做法是使用 outbox 模式：

1. 在同一个数据库事务中保存业务数据和待发布事件。
2. 后台任务扫描 outbox 表。
3. 将事件发布到 MQ 或事件总线。
4. 发布成功后标记事件状态。
5. 消费端按事件 ID 做幂等。

Outbox 避免业务数据与待发记录分别提交，但不保证下游只收到一次。后台发布成功后若来不及标记状态就崩溃，下次仍可能重发。消费端应把去重记录与业务处理放在合适的事务边界内；对有顺序要求的事件，还需要按业务实体维护版本或序号。[Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)

进程内的领域事件也不必全部进入 MQ。跨进程发布时，可以从领域事件转换出稳定的集成事件契约，选择接收方有权看到的字段。是否采用 outbox、事务日志转发或其他机制，要看持久化方式和可靠性要求。

## 回到开头那三个问题

概念过完，可以回答开头那三个问题了。

“群主转让需要同时改变哪些状态”——旧群主的角色、新群主的角色，以及聚合上记录的 `ownerID`。三处必须在一次事务里改完，否则中间任何一个时刻都可能出现零个或两个群主。这也是为什么它值得一个专门的 `TransferOwnership` 行为，而不是复用通用的角色修改方法。

“管理员能不能把自己提升为群主”——这是一条群内规则，答案是“不能”，而且它和上一条是同一件事的两面：只要允许任意成员被直接设成 Owner，群主唯一性就守不住了。代码里的 `ErrUseTransferOwnership` 就是这个约束的落点。

“两个邀请请求并发进入时，群人数还能否保持在容量内”——只在 Go 对象里检查一次人数拦不住，两个请求会各自看到还没满的成员列表。要么让数据库用唯一约束或条件更新兜住，要么在保存时用版本号检测冲突，把冲突交回给调用方决定是重试还是报错。

三个答案分别落在聚合边界、聚合行为和并发控制上。如果一段战术设计代码回答不了它们，那么类名和包名取得再规范，保护的也只是目录结构。

检验这套设计时，笔者会优先看两个失败场景：并发修改是否仍能保护群主唯一性，事务提交后进程退出是否仍能把事件交出去。类名和目录名回答不了这些问题，模型行为与事务实现可以。

接下来打算把这些概念放进完整的协同办公 IM 平台里，看如何从钉钉、飞书/Lark 等公开能力反推业务域地图。

[返回博客列表](/blog/)
