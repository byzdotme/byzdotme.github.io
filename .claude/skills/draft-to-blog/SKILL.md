---
name: draft-to-blog
description: |
  Convert messy reading notes and drafts from `./draft/` into polished, publishable blog articles for a VitePress-based personal site. Use this skill whenever the user mentions publishing drafts, converting notes to blog posts, processing reading notes, or any task involving turning `./draft/` content into articles in `./vpdocs/blog/`. This includes: "publish my notes", "turn draft X into an article", "process the draft directory", "convert my reading notes", or any request that involves moving content from draft to blog.
---

# Draft to Blog

Convert reading notes from `./draft/` into publishable VitePress blog articles.

## Workflow

### Step 1: Understand the scope

The user will specify what to process. This could be:
- Specific files: "将 draft 中的 a.md 和 b.md 形成一篇文章"
- A directory: "将 draft 中 adir 目录下的草稿发布"
- Everything: "把 draft 里的所有草稿都发布"

Read the specified files/directories first. If the user's specification is vague, ask for clarification before proceeding.

### Step 2: Read existing blog posts to internalize the style

Before writing, read at least 2-3 existing blog posts from `./vpdocs/blog/` (not index.md) to internalize:
- The frontmatter format (title, date, category, tags)
- The narrative voice: conversational yet technically precise Chinese, uses metaphors to explain concepts
- The structural pattern: `##` sections, each ending with **小结：**, article ending with **总结** or **总结与思考**
- The footer link: `[返回博客列表](./index)`
- File naming: kebab-case

Also read `./vpdocs/blog/index.md` to understand current category groupings.

### Step 3: Analyze content and plan articles

Read ALL the draft files in scope thoroughly. Then analyze:

1. **Topics**: What distinct themes are covered? One draft directory might contain material for multiple articles.
2. **Errors**: What factual or logical errors exist? Flag any that need web research to verify.
3. **Gaps**: What's missing for a complete, coherent article?

Present a plan to the user before writing. The plan should list:
- How many articles will be produced
- Proposed title for each
- Proposed category (use existing categories from index.md when they fit; propose new ones like `AI/LLM` when needed)
- Which draft files feed into each article

Example plan format:
```
计划产出 2 篇文章：

1. **RAG 全景解析：从检索机制到生产落地**
   - 分类：AI/LLM（新建）
   - 来源：draft/rag-deep-dive.md
   - 主题：系统梳理 RAG 全链路工程细节

2. **Agentic RAG 实战：把检索做成工具**
   - 分类：AI/LLM
   - 来源：draft/rag-deep-dive.md 后半部分 + draft/agent-notes.md
   - 主题：聚焦 Agent 与 RAG 的结合实践
```

Wait for the user to confirm (or adjust) before writing.

### Step 4: Research and correct errors

For any factual claims that seem questionable:
- Search the web using WebSearch to verify from credible sources (official docs, papers, reputable engineering blogs)
- Correct errors silently in the final article — no need to flag them unless the user asked otherwise
- If web search is inconclusive, err on the side of removing the claim rather than publishing unverified information

### Step 5: Write the articles

Write each article as a markdown file in `./vpdocs/blog/`. Follow these rules strictly:

**Frontmatter:**
```yaml
---
title: 文章标题
date: YYYY-MM-DD  # today's date
category: 分类名称
tags: [标签1, 标签2]
---
```

**Title:** The `#` title should match the frontmatter title.

**Structure:**
- Open with an engaging hook — a personal anecdote, a provocative question, or a real-world scenario
- Use `##` for major sections
- Each section ends with **小结：** — a concise takeaway
- Article ends with **总结** or **总结与思考** — synthesize the key insights

**Style:**
- Conversational Chinese, like explaining to a smart colleague over coffee
- Use metaphors and analogies to make technical concepts intuitive
- Be technically precise but accessible — don't dumb down, but don't be dry
- Use tables for comparisons, code blocks for code, ASCII diagrams where helpful
- Keep the tone consistent with existing posts (read them in Step 2)

**Content transformation principles:**
- Reorganize fragmented notes into logical flow — don't just concatenate
- A bullet-point list in draft might become full paragraphs with transitions
- The draft's "question → answer" format can become flowing prose
- Preserve all substantive technical content; cut only redundancy and noise
- Each article should feel like it was written from scratch, not assembled from notes

**Footer:**
```
[返回博客列表](./index)
```

**File naming:** kebab-case, no date prefix. E.g., `rag-full-stack-guide.md`.

### Step 6: Handle images

If any draft references images that exist alongside the draft files:
1. Create a corresponding directory under `./vpdocs/blog/` if needed (or use a shared `./vpdocs/public/` directory)
2. Copy the images there
3. Update references in the article to point to the new location

If images are referenced by URL (not local files), keep the URLs as-is.

### Step 7: Update the blog index

Update `./vpdocs/blog/index.md`:

1. If the article's category already exists, add the link under that category's list.
2. If it's a new category, create a new `###` section for it at the appropriate position.
3. Link format: `- [文章标题](./filename-without-md-extension)`

Keep the existing category order. Insert new categories where they logically fit.

### Step 8: Final report

After all changes, report:
- Which articles were created (with file paths)
- Which categories were updated or added
- Any images that were copied
