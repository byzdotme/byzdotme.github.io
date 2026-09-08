---
name: draft-to-blog
description: |
  Use when creating or revising articles for this personal Nuxt Content blog (`./content/blog/`). Covers converting reading notes and drafts from `./draft/` into publishable posts, and revising already-published articles. Trigger on requests to publish notes, turn drafts into posts, convert drafts, move material from `draft/` to the blog, 修改/重写/润色已有文章, fix AI-flavored writing, or restore depth to an article.
---

# Draft to Blog

Two modes, one style contract. **Read `STYLE.md` in this directory first** — it defines the
voice, the humor boundary, the structural rules and the failure modes. Everything below assumes it.

| Mode | When | Section |
| --- | --- | --- |
| **A. 新建** | 把 `./draft/` 里的草稿变成文章 | [Mode A](#mode-a-新建文章) |
| **B. 修订** | 改已经发布在 `./content/blog/` 的文章 | [Mode B](#mode-b-修订已有文章) |

Both modes end with the same [verification](#验证) and [report](#交付报告).

---

## Mode A: 新建文章

### A1. Understand the scope

The user will specify what to process:
- Specific files: "将 draft 中的 a.md 和 b.md 形成一篇文章"
- A directory: "将 draft 中 adir 目录下的草稿发布"
- Everything: "把 draft 里的所有草稿都发布"

Read the specified files/directories first. If the specification is vague, ask before proceeding.

**Also ask about 篇幅预期** — see `STYLE.md` §10. There is no default length.

### A2. Read existing posts to calibrate

Use `rg --files content/blog` to find posts, then read at least 2-3 recent ones. You are calibrating
on **voice** — how the author opens, where humour sits, how sections hand off. Do not copy structural
tics; see `STYLE.md` §8 for patterns that are forbidden.

While reading, collect the frontmatter conventions and the existing series metadata:

```bash
rg -n "^(title|date|category|tags|series|seriesOrder):" content/blog
```

Identify existing series names and their `seriesOrder` ranges. Check whether the new article(s) belong
to an existing series — even when producing only one article. If nothing fits, check whether the new
article(s) plus one or more past articles should now form a new series.

### A3. Analyze content and plan

Read ALL draft files in scope thoroughly, then analyze:

1. **Topics** — one draft directory may contain material for multiple articles.
2. **Errors** — factual or logical errors; flag any needing research.
3. **Gaps** — what's missing for a coherent article.
4. **具体材料** — which numbers, scenarios, names, dates the draft supplies. These are the most
   valuable thing in a draft and the easiest to lose. List them; make sure they land in the article.
5. **Series fit** — existing series / new series with past articles / new series from this batch / none.

Present the plan and **wait for confirmation** before writing:

```
计划产出 2 篇文章：

1. **RAG 全景解析：从检索机制到生产落地**
   - 分类：AI/LLM（新建）
   - 来源：draft/rag-deep-dive.md
   - 系列：RAG 工程实战，顺序：1
   - 篇幅预期：约 200 行
   - 主题：系统梳理 RAG 全链路工程细节

需要同步更新既有文章：
- content/blog/rag-production-lessons.md：series = RAG 工程实战，seriesOrder = 3
```

### A4. Research and correct

For questionable factual claims:
- Verify against credible sources (official docs, RFCs, papers).
- **If network access is unavailable or a source is unreachable, say so explicitly.** Do not guess,
  and do not silently drop the claim either — report what could not be verified.
- Correct errors in the article. Flag anything you changed substantially.

### A5. Write

Tell the user which files you will create before writing. Then write each article per `STYLE.md`.

Key reminders (details in `STYLE.md`):
- No body `#` H1 — the template renders `<h1>{{ page.title }}</h1>` from frontmatter.
- No `**小结：**` per section — that convention is retired.
- Frontmatter per schema below; `series`/`seriesOrder` are optional **as a pair**.
- Footer: `[返回博客列表](/blog/)`
- File name kebab-case, no date prefix.

```yaml
---
title: 文章标题
date: YYYY-MM-DD  # use today's date from the active environment
category: 分类名称
tags: [标签1, 标签2]
series: 系列名称        # optional
seriesOrder: 1          # required when series is present
---
```

**Series rules:**
- Never add one of `series`/`seriesOrder` without the other.
- When multiple new articles form a series, assign consecutive `seriesOrder` in reading order.
- When joining an existing series, continue or insert deliberately; if inserting requires
  renumbering, update the affected posts and report it.
- When a past standalone article plus the new article(s) should form a series, define the name and
  update the past article's metadata.
- Do not invent a series for weak thematic similarity. If unsure, leave it standalone and say so.

### A6. 配图

If a draft references local images:
1. Copy to `./public/images/blog/diagrams/`（保持与文章命名一致的 `<文章名>-NN-<描述>.svg`）
2. Reference as `/images/blog/diagrams/...`

If images are referenced by URL, keep the URLs as-is.

New diagrams follow `STYLE.md` §6 — see also the checks in [验证](#验证).

### A7. No index update needed

The blog index is generated from `queryCollection('blog')`; new files under `content/blog/` are
picked up automatically. Never hand-maintain a list.

---

## Mode B: 修订已有文章

### B1. 先查损伤，再动手

**不要**直接开始润色。先弄清这篇文章被改过几次、丢了什么。

```bash
git log --oneline -- <file>          # 直接历史
git reflog --date=short              # 找回被 squash / rebase 掉的旧版本
```

本仓库的历史可能在合并时被压缩（出现过把 20 篇文章一次性压掉 46% 的提交），
所以 `git log` 看不到的旧版本，要靠 `git reflog` 找 commit hash，再 `git show <hash>:<file>`。

对比每个历史版本与当前版本，输出一份**损伤报告**：

| 项 | 内容 |
| --- | --- |
| 行数变化 | 原始 N 行 → 当前 M 行 |
| 被删掉的具体材料 | 数字、场景、人名、年份、真实域名、作者的经历与困惑 |
| 被删掉的结构 | 章节、表格、图、外链 |
| 被改掉的判断 | 技术口径是否被修正过（这部分**不要**回退） |

**关键区分**：旧版本是"当时有哪些材料"的参考，不是要恢复的目标。当前版本可能修正了技术错误、
补了 RFC 引用——这些要保留。修订是**把具体材料有选择地补回当前版本**，不是回退到旧版本。

### B2. 诊断病因

按 `STYLE.md` §7 的顺序诊断，**不要**默认做减法：

| 用户的话 | 先怀疑 |
| --- | --- |
| "太晦涩/太干" | 删过头了 → 补具体材料、把机制讲透 |
| "AI 味太重" | 结构性雷同 → 收尾方式、段落动作、幽默分布 |
| "看不懂/看了一堆还是不懂" | 图和文字都不够准确 → 补图、补论证，不是压缩 |

### B3. 和用户确认方向

带着损伤报告和诊断，问清楚：

- 改到什么程度（只调行文 / 行文 + 补材料 / 大改结构）
- 篇幅预期（可能和现状差很多）
- 哪些内容**不能动**（用户亲手写的段落、特定技术口径）

有多个可行方向时，**给出样稿对比**再让用户选，比直接动手返工便宜。

### B4. 动手

红线：

- **用户亲手写的句子、标题、语气词，一律保留。**改完必须 `diff` 验证没被动过。
- **不删用户的脚手架**：已有标题、表格、外链、图、frontmatter 的 series 元数据。
- **不编造用户的经历、数字、人名、地名。**缺就问。
- **不写具体组织名。**作者自身的经历只写行业与岗位类型（见 `STYLE.md` §三）。已有文章里点名的，顺手改掉。
- 保留技术准确性；修正错误要报告。
- 篇幅通常**变长**，不是变短。具体材料补回来了，行数自然会涨。

### B5. 图

按 `STYLE.md` §6 检查现有图：

- 两张图是否在做同一件事（重复的合并，去掉冗余的那张）
- 图上是否只标了协议名、没标"这一步在干什么"
- 是否缺了关键的区分（明文/密文、先后、耗时）

改图后必须做几何校验——见 [验证](#验证)。

---

## 验证

改完必须验证，不能只声称完成。

### 内容与结构

```bash
# 行数与结构
wc -l content/blog/<file>.md
grep -n "^## " content/blog/<file>.md

# 你的改动是否误伤了不该动的地方（Mode B 必做）
diff <(git show HEAD:content/blog/<file>.md) content/blog/<file>.md

# 机械检查：中英文空格、全角标点前空格、行尾空白、残句、空 alt
```

机械检查至少覆盖：中文与拉丁字母/数字之间缺空格、全角标点前有空格、中文后跟半角标点、
行尾空白、以连词/介词结尾的残句、图片 alt 为空、**正文出现具体组织名**（作者自身经历只写行业与岗位类型，
见 `STYLE.md` §三）、**前向链接**（链到了比本篇发布更晚的文章——绝对禁止，见 `STYLE.md` §12.1）、
**提到了别的文章却一次都没链**（见 `STYLE.md` §12.2）、
**「核对过」之类的时间声明晚于文章 `date`**（见 `STYLE.md` §十三）。macOS 的 `grep` 没有 `-P`，用 Python 写。

### 构建

```bash
./node_modules/.bin/nuxi generate    # 沙箱里 pnpm 可能因 ~/Library/pnpm 被拒而失败
```

然后核对渲染产物 `.output/public/blog/<slug>/index.html`：

- `h1` 数量必须为 **1**（来自模板），`h2` 数量与章节数一致
- 表格、代码块、图片数量与源文件一致
- 新增的关键句确实出现在渲染结果里（注意：代码块内文本会被语法高亮拆成多个 `<span>`，
  直接搜 HTML 会 MISS，需要先剥标签）

### 图表

SVG 要过几何校验：文本越界、文本重叠、文本出框、框重叠，逐条查。
按 CJK 全宽 1.0em、拉丁 0.55em 估算宽度。

**`qlmanage` 等渲染工具在沙箱里通常被禁止**，所以版面是数值校验的结果，
不是肉眼确认。要明确告诉用户这一点。

---

## 交付报告

- 创建或修改了哪些文件（带路径）
- Mode B：损伤报告要点 + 实际改了什么 + **明确列出没有动用户手写的哪些部分**
- 复制/新增了哪些图片
- 跑了哪些验证，结果如何
- **哪些没能验证**（网络受限、无法渲染等），如实说明
- 需要用户确认的遗留问题

不要主动 commit / push / merge。
