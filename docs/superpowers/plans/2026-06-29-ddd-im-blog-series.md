# DDD IM Blog Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create eight Nuxt Content blog posts that explain DDD from concepts to collaboration IM domain modeling and Go engineering practice.

**Architecture:** Add one Markdown file per article under `content/blog/`. Keep each article self-contained, but make the series progressive: concept foundation, collaboration IM domain model, deployment trade-offs, then Go code organization. Cite public sources for observable product and platform capabilities, and label DDD domain boundaries as architecture inference rather than vendor internal implementation.

**Tech Stack:** Nuxt 3, Nuxt Content v3, Markdown frontmatter, Chinese technical writing.

---

## File Structure

- Create: `content/blog/ddd-complex-business.md`
  - Article 1: explains why DDD exists and what problem it solves.
- Create: `content/blog/ddd-strategic-design.md`
  - Article 2: explains strategic design concepts such as domain, subdomain, core domain, supporting domain, generic domain, bounded context, and context map.
- Create: `content/blog/ddd-tactical-design.md`
  - Article 3: explains tactical design concepts such as entity, value object, aggregate root, domain service, repository, application service, and domain event.
- Create: `content/blog/ddd-im-domain-map.md`
  - Article 4: uses public DingTalk, Feishu/Lark, and open platform documents to infer a collaboration IM domain map.
- Create: `content/blog/ddd-im-account-organization-relationship-group.md`
  - Article 5: compares boundary choices for account, organization, relationship, group, and conversation domains.
- Create: `content/blog/ddd-im-message-notification-search-open-platform.md`
  - Article 6: explains cross-context collaboration for message, notification, search, and open platform capabilities.
- Create: `content/blog/ddd-deployment-modules.md`
  - Article 7: maps domain boundaries to deployment choices such as monolith, modular monolith, microservices, and monorepo.
- Create: `content/blog/ddd-go-project-structure.md`
  - Article 8: gives Go-oriented DDD package organization for single-module and monorepo projects.

## Source Rules

- Use public official documentation where possible.
- For DingTalk and Feishu/Lark capabilities, write only what can be observed from product pages, help pages, or open platform API categories.
- Do not claim vendor internal implementation details.
- DDD concept sources may include Martin Fowler, Microsoft architecture docs, and Eric Evans DDD reference material.
- Go project-structure claims should align with Go official documentation where possible.

## Tasks

### Task 1: Confirm Current Blog Conventions

**Files:**
- Read: `content/blog/pay-core-model.md`
- Read: `content/blog/ha-about-cap.md`
- Read: `content.config.ts`

- [x] **Step 1: Verify frontmatter shape**

Required frontmatter:

```yaml
---
title: 文章标题
date: 2026-06-29
category: 架构设计
tags: [DDD, 领域驱动设计, 协同办公, IM, Go]
---
```

- [x] **Step 2: Verify body style**

Use Chinese headings, numbered sections, practical examples, and a final `[返回博客列表](/blog/)` link.

### Task 2: Build Evidence Pool

**Files:**
- Use public URLs inside article source sections or inline links.

- [x] **Step 1: Collect DDD concept sources**

Use:
- `https://martinfowler.com/bliki/BoundedContext.html`
- `https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis`
- `https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-ddd`

- [x] **Step 2: Collect collaboration product and open-platform sources**

Use official DingTalk, Feishu/Lark, and open platform pages where possible for observable capabilities such as contact, organization, messaging, bot, event subscription, approval, and open API.

- [x] **Step 3: Collect Go engineering sources**

Use:
- `https://go.dev/doc/modules/layout`
- `https://go.dev/doc/effective_go`

### Task 3: Write Concept Foundation Articles

**Files:**
- Create: `content/blog/ddd-complex-business.md`
- Create: `content/blog/ddd-strategic-design.md`
- Create: `content/blog/ddd-tactical-design.md`

- [x] **Step 1: Write Article 1**

Cover:
- DDD solves business complexity, not folder naming.
- Ordinary layered architecture fails when business language, consistency, and change boundaries diverge.
- Use collaboration IM examples to foreshadow later articles.

- [x] **Step 2: Write Article 2**

Cover:
- Domain, subdomain, core domain, supporting domain, generic domain.
- Bounded context and context map.
- Explain why the same word can mean different things in different contexts.

- [x] **Step 3: Write Article 3**

Cover:
- Entity, value object, aggregate, aggregate root.
- Domain service, repository, application service.
- Domain event and outbox-oriented thinking.

### Task 4: Write Collaboration IM Domain Articles

**Files:**
- Create: `content/blog/ddd-im-domain-map.md`
- Create: `content/blog/ddd-im-account-organization-relationship-group.md`
- Create: `content/blog/ddd-im-message-notification-search-open-platform.md`

- [x] **Step 1: Write Article 4**

Cover:
- Full collaboration IM business domain map.
- Identity, organization, relationship, group, conversation, message, notification, workbench, approval, open platform, search, security governance.
- Clearly distinguish public observation from architecture inference.

- [x] **Step 2: Write Article 5**

Cover:
- Trade-offs for account, member, contact, friend, group, and conversation boundaries.
- Explain why DDD has no one true answer.
- Give evolution signals for revisiting boundaries.

- [x] **Step 3: Write Article 6**

Cover:
- Message main chain and derived capabilities.
- Notification, search, open platform callbacks, bot integration, event subscription.
- Use domain events, anti-corruption layer, and eventual consistency.

### Task 5: Write Deployment and Go Implementation Articles

**Files:**
- Create: `content/blog/ddd-deployment-modules.md`
- Create: `content/blog/ddd-go-project-structure.md`

- [x] **Step 1: Write Article 7**

Cover:
- Domain boundary vs deployment boundary.
- Monolith, modular monolith, microservice, monorepo trade-offs.
- Migration path and module-split timing.

- [x] **Step 2: Write Article 8**

Cover:
- Go package organization for DDD.
- Single-module layout.
- Monorepo layout.
- Dependency direction, repository interfaces, application service orchestration, adapters, events.

### Task 6: Validate

**Files:**
- Check: `content/blog/ddd-*.md`

- [x] **Step 1: Search for placeholders**

Run:

```bash
rg -n "TODO|TBD|待补|占位|FIXME" content/blog/ddd-*.md
```

Expected: no matches.

- [x] **Step 2: Check frontmatter**

Run:

```bash
rg -n "^title:|^date:|^category:|^tags:" content/blog/ddd-*.md
```

Expected: each article has title, date, category, and tags.

- [x] **Step 3: Build site**

Run:

```bash
pnpm run build
```

Expected: Nuxt generate completes successfully.
