# RAG 深度解析（面试向）

> 本文从 Agent 架构视角切入，系统梳理 RAG 的全链路工程细节。
> 目标：面试中能从原理到工程细节、从指标到调优策略、从经典模式到前沿实践都讲清楚。

## 1. 什么是 RAG，为什么需要它

### 基本定义

**RAG（Retrieval-Augmented Generation）检索增强生成**：在 LLM 生成答案前，从外部知识源检索相关信息，作为上下文喂给 LLM。

### 为什么需要 RAG

LLM 天然有三个硬伤：

| 问题 | 说明 | RAG 怎么解决 |
|------|------|------------|
| **知识截止（knowledge cutoff）** | 模型训练数据有时间限制 | 检索实时/最新数据 |
| **幻觉（hallucination）** | 编造不存在的事实 | 基于真实检索结果回答 |
| **领域知识不足** | 对内部文档、专业知识了解有限 | 接入私有知识库 |
| **无法验证引用** | 答案没有出处 | 检索结果可作为引用展示 |

### 什么场景**不**适合 RAG

- 任务本身不需要外部知识（数学推理、代码生成、创意写作）
- 知识可以通过 fine-tuning 固化（风格、固定术语）
- 实时性/交互性优先于准确性（闲聊、Brainstorming）

### RAG vs Fine-tuning 的选择

| | RAG | Fine-tuning |
|---|-----|-------------|
| 更新成本 | 低（改数据库即可） | 高（重新训练） |
| 知识范围 | 大（可到 TB 级） | 有限（受模型容量） |
| 适合什么 | 事实、文档、可枚举知识 | 风格、任务范式、领域语言 |
| 可解释性 | 高（有引用） | 低（黑盒） |
| 延迟 | 高（多一步检索） | 低 |

**面试常问**："什么时候用 RAG，什么时候用 fine-tuning？"
**标准答案**："事实性知识用 RAG，范式/风格用 fine-tuning，两者可以结合。"

---

## 2. RAG 整体架构

### 离线阶段（数据准备）

```
原始文档 → 清洗 → 切分（chunking）→ 向量化（embedding）→ 存入向量库 + 索引
```

### 在线阶段（检索生成）

```
用户问题 → 查询改写 → 向量化 → 向量检索 + 关键词检索
                                    ↓
                                 重排（rerank）
                                    ↓
                           Top-K 文档 → 拼接 prompt → LLM 生成 → 答案 + 引用
```

### 两种 RAG 架构

```
经典 RAG（Naive / Pre-retrieval RAG）
  用户问题 → [固定检索] → 拼 prompt → LLM → 答案
  检索发生在 LLM 之前，固定流程

Agentic RAG（Tool-based RAG）
  用户问题 → LLM ⇄ retrieve_tool（可多次）→ 答案
  检索是 LLM 可选的工具，LLM 自主决策调用时机和 query
```

---

## 3. 数据准备：Chunking（切分）

### 为什么要切分

- LLM 有上下文窗口限制（即使 200k token 也有限）
- 检索粒度：太长的文档里相关信息被稀释，召回不准
- 成本：prompt 里塞越多 token 越贵

### 切分策略对比

| 策略 | 说明 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|---------|
| **固定字符切分** | 每 N 个字符切一刀 | 简单 | 可能切断句子/段落 | 粗糙原型 |
| **按段落** | 按 `\n\n` 切 | 保留语义边界 | 段落长度不均 | 结构化文档 |
| **按句子** | 用 NLP 工具切句 | 语义完整 | 粒度可能太细 | 问答型文档 |
| **递归切分（Recursive）** | 先按大边界切，超长再用小边界 | 兼顾语义和长度 | 配置稍复杂 | **默认推荐** |
| **语义切分（Semantic）** | 用 embedding 相似度找自然断点 | 最贴合语义 | 慢、贵 | 高质量要求场景 |
| **按 Markdown 结构** | 按标题层级切 | 保留文档结构 | 仅适用 MD/HTML | 技术文档、Wiki |
| **按代码语法** | 按函数/类切 | 代码块完整 | 仅适用代码 | Code RAG |

### 关键参数

**chunk_size**：每个 chunk 的长度（通常 200-1500 token）
- 小（200-400）：检索更精准，但单块信息少，需要检索更多块
- 大（800-1500）：单块信息完整，但可能稀释

**chunk_overlap**：相邻 chunk 的重叠量（通常 10-20% of chunk_size）
- 作用：避免相关信息正好被切到边界上
- 代价：存储和检索成本略增

### 常见面试陷阱

**问题**："chunk 多大合适？"
**回答要点**：
1. 没有万能值，取决于文档类型和查询类型
2. 短查询、精准问答 → 小 chunk（300-500）
3. 需要长上下文理解 → 大 chunk（1000+）
4. 可以"小 chunk 检索 + 大 chunk 返回"：用 parent-child chunking（子块检索，父块喂给 LLM）

### 进阶：Hierarchical Chunking

切分成多级：段落 → 句子 → 关键词。查询时可以不同层级混合检索。

---

## 4. 数据准备：Embedding（向量化）

### 什么是 Embedding

把文本映射成高维向量（通常 384 / 768 / 1024 / 1536 维），语义相近的文本在向量空间中距离近。

### 常用 Embedding 模型

| 模型 | 维度 | 特点 | 成本 |
|------|------|------|------|
| **OpenAI text-embedding-3-small** | 1536 | 效果均衡 | 低 |
| **OpenAI text-embedding-3-large** | 3072 | 效果强 | 中 |
| **BGE (BAAI/bge-*)** | 768/1024 | 开源，中文好 | 自部署 |
| **M3E** | 768 | 中文领先 | 自部署 |
| **Cohere Embed v3** | 1024 | 多语言强 | 中 |
| **Jina Embeddings** | 768/1024 | 支持长文本（8k+） | 低 |

### 选型考虑

1. **语言覆盖**：中文场景 BGE / M3E 常优于 OpenAI
2. **领域适配**：通用模型在专业领域（医疗、法律、代码）可能不够，可做领域 fine-tune
3. **维度**：高维效果更好但存储/计算成本高，Matryoshka 式嵌入（可降维）是新趋势
4. **长度支持**：大多数 embedding 模型最大支持 512 token，超长文档需截断或用特殊模型（Jina）
5. **成本**：API 调用 vs 自部署的取舍

### 距离度量

- **Cosine Similarity（余弦相似度）**：最常用，范围 -1 到 1
- **Dot Product（点积）**：归一化后等价于余弦
- **Euclidean Distance（欧式距离）**：范围 0 到 +∞

绝大多数 embedding 模型输出已归一化，用 cosine / dot product 即可。

### 关键工程问题

**1. 批量处理**
单条调 API 慢且贵，批量化能降低 5-10 倍成本。

**2. 增量更新**
文档更新时只 re-embedding 变化的 chunk，用哈希比对。

**3. 版本管理**
换 embedding 模型时，新老向量维度不同，索引需要重建。保留旧索引直到新的验证完毕。

**4. Embedding Cache**
相同文本多次嵌入浪费钱，一般加一层文本哈希 → 向量的缓存。

---

## 5. 向量存储与索引

### 主流向量数据库对比

| 数据库 | 类型 | 特点 | 适用规模 |
|--------|------|------|---------|
| **Pinecone** | 托管 SaaS | 易用、无运维、贵 | 中小到大型商用 |
| **Weaviate** | 开源/托管 | 功能全，支持混合检索 | 中型 |
| **Qdrant** | 开源/托管 | 性能好，Rust 实现 | 中小到大型 |
| **Milvus** | 开源 | 大规模、高性能 | 大型（亿级+） |
| **Chroma** | 轻量级开源 | 简单，嵌入式 | 原型/小型 |
| **pgvector** | PostgreSQL 扩展 | 和业务数据库统一管理 | 中小型 |
| **FAISS** | Facebook 库 | 非数据库，纯索引库 | 研究/自建 |
| **Elasticsearch + dense vector** | 搜索引擎 | 混合检索天然支持 | 企业现成环境 |

### 索引算法

纯暴力搜索在大数据量下太慢（毫秒 → 秒），需要 **ANN（Approximate Nearest Neighbor）近似最近邻**算法：

| 算法 | 原理 | 特点 |
|------|------|------|
| **Flat（暴力）** | 遍历所有向量 | 100% 精度，慢 |
| **IVF（Inverted File）** | 聚类 + 桶内搜索 | 快，精度中 |
| **HNSW（Hierarchical Navigable Small World）** | 分层图结构 | **最常用**，快且精度高 |
| **PQ（Product Quantization）** | 向量压缩 | 省存储，精度略降 |
| **IVF-PQ / HNSW-PQ** | 组合 | 大规模常用 |

**HNSW 的关键参数**：
- `M`：每个节点的最大连接数（16-64）
- `efConstruction`：建索引时搜索宽度（高 = 索引慢但质量好）
- `efSearch`：检索时搜索宽度（高 = 慢但召回高）

**面试常问**："HNSW 为什么比 IVF 快？" → HNSW 是分层图，可以从稀疏层快速定位到目标区域，再在密集层精细搜索，类似 skip list 的思想。

### 规模与成本估算

假设 1000 万条 chunk、1536 维 float32：
- 存储：1e7 × 1536 × 4 bytes = **60GB**
- 检索（HNSW）：单查询毫秒级
- 用 PQ 压缩可以降到 ~6GB，精度损失 5% 以内

---

## 6. 检索策略

### 基础：向量检索（Dense Retrieval）

```
query → embedding → 在索引里找 top-K 最相似向量 → 对应的原文档
```

优点：能捕捉语义（同义、释义）。
缺点：对**关键词精确匹配**不敏感（"iPhone 15" vs "iPhone 14" 向量可能很接近）。

### 基础：关键词检索（Sparse Retrieval）

经典 BM25 / TF-IDF：

```
query → 分词 → 按词频/逆文档频率打分 → top-K
```

优点：关键词、专有名词、数字、代码精准匹配。
缺点：不理解同义词、不懂语义。

### 混合检索（Hybrid Retrieval）

**生产级 RAG 基本都用混合检索**：向量检索 + 关键词检索并行，结果合并。

合并方法：
- **RRF（Reciprocal Rank Fusion）**：`score = Σ 1/(k + rank_i)`，最常用，无需分数归一化
- **加权分数**：`final = α · vec_score + (1-α) · bm25_score`（需要归一化）
- **Rerank**：把两路 top-N 合并后统一重排

### Top-K 怎么选

- **太小（K=3）**：召回率低，LLM 可能拿不到答案
- **太大（K=20+）**：上下文稀释，LLM 被无关信息干扰，成本高
- **典型值**：K=5-10
- **推荐策略**：粗召回 K=20-50，rerank 后取 top 5-10

### 多查询检索（Multi-query Retrieval）

用 LLM 把用户问题改写成多个查询，分别检索后合并：

```
原问题："LangChain 的优缺点"
生成 queries：
  - "LangChain 有哪些优势"
  - "LangChain 的局限性"
  - "LangChain vs 其他框架"
→ 每个 query 检索 → 去重合并
```

效果好但成本增加（多次 embedding + 多次检索）。

### MMR（Maximal Marginal Relevance）

在 top-K 里做多样性过滤，避免返回的文档过度相似：

```
最终分数 = λ · 相关性 - (1-λ) · 与已选文档的相似度
```

适用场景：召回的 chunk 来自同一文档、信息冗余高。

---

## 7. Reranking（重排）

### 为什么需要 Rerank

向量检索是**双塔模型**（query 和 doc 分别嵌入，计算相似度），速度快但精度有限。

Rerank 用**交叉编码器（Cross-Encoder）**：query + doc 拼接一起喂给模型，直接输出相关度分数。

```
阶段 1：向量检索 → top-50（快但粗）
阶段 2：Rerank → top-5（慢但准）
```

### 常用 Reranker 模型

| 模型 | 特点 |
|------|------|
| **Cohere Rerank** | API，效果好，多语言 |
| **BGE Reranker** | 开源，中文强 |
| **Jina Reranker** | 开源，长文本 |
| **LLM as Reranker** | 用 GPT-4 打分，效果最好但最贵 |

### Rerank 的效果

工业界经验：加 rerank 可以把精确率再提 10-30%，尤其在 top-3 指标上提升明显。

### 什么时候不需要 Rerank

- 检索数据量小（几百条）
- 问答精度要求不高
- 严格的延迟预算（rerank 增加 100-500ms）

---

## 8. Query 改写技术

### 1. Query Expansion / Rewriting

用户原问题可能表达不清、含代词、缺上下文。让 LLM 改写后检索效果更好：

```
原："它怎么用？"
改写：（根据对话历史）"LangChain 的 RunnableSequence 怎么使用？"
```

### 2. HyDE（Hypothetical Document Embeddings）

**思路**：让 LLM 先"假装"回答问题生成一段文本，用这段**假想答案**去检索（而不是用问题去检索）。

```
问："Python 的装饰器怎么实现缓存？"
LLM 假想答案："用 functools.lru_cache 装饰器...@lru_cache(maxsize=128)..."
用这段假答案去向量检索 → 找到真文档
```

**为什么有效**：向量空间里，"答案 ↔ 相关文档"的距离通常比"问题 ↔ 相关文档"更近。

### 3. Step-Back Prompting

用户问题太具体时，让 LLM 抽象成一个更宏观的问题先检索：

```
原："Lionel Messi 1987 年 6 月 24 日出生那天是星期几？"
Step-back："Lionel Messi 出生在哪一天？"
先查具体出生日，再推算星期
```

### 4. Decomposition（问题分解）

复杂问题拆成子问题分别检索：

```
原："比较 LangChain 和 LlamaIndex 在 RAG 上的优劣"
子问题：
  - "LangChain 的 RAG 实现方式"
  - "LlamaIndex 的 RAG 实现方式"
  - "两者的差异点"
```

---

## 9. 评估指标

### 检索阶段指标

| 指标 | 定义 | 公式 |
|------|------|------|
| **Recall@K** | Top-K 中相关文档占全部相关文档的比例 | 召回到的相关 / 总相关 |
| **Precision@K** | Top-K 中相关文档占 K 的比例 | 召回到的相关 / K |
| **MRR（Mean Reciprocal Rank）** | 第一个相关文档排名倒数的均值 | 1/rank_first_relevant |
| **NDCG@K（Normalized DCG）** | 考虑排序位置的相关性累积 | 越靠前分值越高 |

**核心区别**：
- Recall 关心"有没有漏"
- Precision 关心"有没有错"
- MRR 关心"第一个正确的有多靠前"
- NDCG 综合考虑所有位置

### 生成阶段指标

| 指标 | 评估什么 | 怎么评 |
|------|---------|-------|
| **Faithfulness（忠实度）** | 答案是否基于检索内容，无幻觉 | LLM judge / 规则对比 |
| **Answer Relevance** | 答案是否回答了问题 | LLM judge |
| **Context Precision** | 检索内容里真正有用的比例 | 人工 or LLM judge |
| **Context Recall** | 生成所需信息是否都被检索到了 | 对比标准答案所需的信息 |

### 常用评估框架

- **RAGAS**：专为 RAG 设计，上面四个指标都有
- **TruLens**：可视化追踪 + 评估
- **LangSmith**：LangChain 生态的评估平台

### 面试常问

**"RAG 如何做评估？"**
1. 分两层：检索层（Recall / NDCG）+ 生成层（Faithfulness / Relevance）
2. 构建评估集：标准问答对 + 标注相关文档
3. LLM-as-judge：大模型直接打分，加人工抽检

---

## 10. 高级 RAG 模式

### 1. Parent-Child / Small-to-Big

**问题**：小 chunk 检索准，但单块信息不完整。
**方案**：小 chunk 存索引用于检索，检索命中后返回对应的**大 chunk**（父段落或整节）喂给 LLM。

### 2. Sentence Window Retrieval

检索句子，返回时带上**前后几句**作为 context。在 FAQ / 问答场景效果好。

### 3. Auto-Merging Retrieval

多个相邻的小 chunk 都被命中时，自动合并成更大的父块。

### 4. Self-RAG

LLM 在生成过程中自己决定：
- 需不需要检索
- 检索回来的内容是否相关（过滤）
- 回答是否基于检索内容（自我验证）

相当于给 LLM 加了元认知。

### 5. CRAG（Corrective RAG）

检索完之后加一个**评估器**判断结果质量：
- 好 → 用检索结果回答
- 差 → 触发 fallback（网页搜索、让 LLM 直接回答、要求澄清）

### 6. Graph RAG

用知识图谱代替/增强向量检索：
- 节点：实体、概念
- 边：关系
- 检索时沿图谱多跳
- 微软的 GraphRAG 论文是代表作

适合**需要多跳推理的复杂问题**（"A 和 B 的共同朋友中谁是 C 公司的员工？"）。

### 7. Contextual Retrieval（Anthropic 2024 提出）

给每个 chunk **生成一段上下文描述**（说明这个 chunk 在原文档中的位置、主题），然后对"chunk + 上下文描述"做 embedding。

Anthropic 报告可以把检索错误率降低 35-49%。

### 8. ColBERT / Late Interaction

双塔模型的增强版：不是把文档压成一个向量，而是每个 token 一个向量，查询时做细粒度匹配。效果接近 Cross-Encoder 但快很多。

---

## 11. Agentic RAG 实战

### 把检索做成 Tool

```typescript
const retrieveTool = tool(
  async ({ query }) => {
    const docs = await vectorStore.similaritySearch(query, 5);
    return docs.map(d => d.pageContent).join("\n---\n");
  },
  {
    name: "retrieve_knowledge",
    description: "从公司内部知识库检索相关文档",
    schema: z.object({ query: z.string() }),
  }
);
```

### 让 Agent 自主决策

结合第七课的 ReAct 模式：
- LLM 收到问题
- 判断是否需要检索（有些问题不需要）
- 决定用什么 query 检索
- 评估检索结果是否足够
- 不够就再检索一次（换 query）
- 得到足够信息后生成答案

### 多工具协同

真实 Agent 通常有多个信息源：

```typescript
const tools = [
  retrieveInternalDocs,    // 内部文档
  searchWeb,               // 网页搜索
  queryDatabase,           // 结构化数据
  computeCalculator,       // 计算
];
```

LLM 根据问题选合适的工具。

### 多跳检索（Multi-hop）

复杂问题往往一次检索不够：

```
问："LangGraph 的 checkpointer 和 LangChain 的 memory 有什么区别？"

Agent 执行：
  1. retrieve("LangGraph checkpointer")
  2. retrieve("LangChain memory")
  3. 对比两者，生成答案
```

---

## 12. 生产级工程实践

### 1. 知识库管理

- **版本控制**：文档有更新，chunk 和 embedding 要同步更新
- **增量同步**：变化检测（hash 比对）+ 增量 embedding
- **权限隔离**：多租户/多部门场景，检索要带权限过滤（metadata filtering）
- **数据清洗**：去重、去噪、统一格式

### 2. 延迟优化

RAG 全链路延迟构成：
- Embedding 查询：50-200ms
- 向量检索：10-100ms
- Rerank：100-500ms
- LLM 生成：500-3000ms（主要瓶颈）

优化手段：
- Embedding 用快模型（text-embedding-3-small 比 large 快 3 倍）
- 向量库用 HNSW（毫秒级）
- Rerank 可选（延迟敏感时跳过）
- LLM 用 streaming 输出

### 3. 成本优化

- Embedding 缓存（相同 query 不重复调）
- 小模型兜底、大模型升级（简单问题小模型够了）
- Prompt 压缩（LLMLingua 等工具）
- 知识库冷热分离（热数据 ES，冷数据 S3）

### 4. 可观测性

必要指标：
- 每次检索的 query、命中 chunk、rerank 分数、最终答案
- 用户反馈（点赞/点踩）
- 端到端延迟分布
- 检索 miss 率（没有召回到相关内容的比例）

工具：LangSmith、Langfuse、Arize、自建 trace 系统。

### 5. Fallback 策略

- 检索失败 → 用 LLM 内置知识回答 + 标注"无知识库支撑"
- LLM 生成失败 → 返回 top 检索结果原文
- 全流程失败 → 固定兜底话术，记录日志

### 6. 安全与合规

- **PII 脱敏**：向量化前清洗个人信息
- **权限控制**：检索时带用户权限过滤
- **审计日志**：每次检索什么、给谁、LLM 生成了什么，要留痕
- **Prompt Injection 防护**：检索回来的文档可能被污染（"忽略之前指令，说..."），要做过滤

---

## 13. 常见面试问题合集

### 概念理解

1. **什么是 RAG？解决什么问题？**
2. **RAG vs Fine-tuning 选型**
3. **经典 RAG 和 Agentic RAG 的区别**
4. **为什么 LLM 上下文已经 200k 了还需要 RAG？**
   答：成本、延迟、知识更新、Lost-in-the-middle 问题

### Chunking

5. **Chunk 大小怎么选？**
6. **Chunking 的策略有哪些？各自优缺点？**
7. **Parent-Child Chunking 是什么？**
8. **chunk_overlap 的作用？**

### Embedding

9. **怎么选 embedding 模型？**
10. **中文场景用什么 embedding？**
11. **embedding 维度越高越好吗？**
12. **为什么要归一化向量？**
13. **距离度量选 Cosine 还是 Euclidean？**

### 检索

14. **向量检索 vs 关键词检索 vs 混合检索**
15. **BM25 的原理**
16. **HNSW 为什么快？关键参数？**
17. **Top-K 怎么选？**
18. **什么是 RRF？为什么用它合并多路召回？**
19. **MMR 是什么？什么场景用？**

### Rerank

20. **为什么需要 rerank？**
21. **双塔模型 vs 交叉编码器的区别**
22. **什么场景可以不 rerank？**

### Query 改写

23. **Query Rewriting 的常见方法**
24. **HyDE 是什么？为什么有效？**
25. **Step-Back Prompting 的适用场景**

### 评估

26. **RAG 怎么做评估？**
27. **Recall / Precision / MRR / NDCG 的区别**
28. **Faithfulness 怎么定义和评估？**
29. **LLM-as-judge 的局限性**

### 高级架构

30. **Self-RAG 和 CRAG 的区别**
31. **Graph RAG 适合什么场景？**
32. **Contextual Retrieval 的原理和效果**
33. **Agentic RAG 怎么处理多跳问题？**

### 工程落地

34. **RAG 系统延迟怎么优化？**
35. **怎么处理私有数据和权限隔离？**
36. **embedding 模型升级怎么处理存量数据？**
37. **怎么防止 prompt injection？**
38. **检索没命中怎么办？**

### 实战问题

39. **你设计一个企业内部文档问答系统，架构怎么做？**
40. **用户反馈经常答非所问，你怎么排查？**
    排查思路：
    - 是检索阶段 miss 还是生成阶段错？（看中间结果）
    - 检索层：调 query rewriting、检查 chunk 大小、加 rerank
    - 生成层：调 prompt、检查是否 faithful 问题、降低幻觉
41. **相同问题有时答对有时答错，为什么？**
    - LLM 有随机性（温度、采样）
    - 向量检索 ANN 算法本身有概率性
    - 上下文顺序影响（Lost-in-the-middle）
42. **1 亿文档的 RAG 怎么设计？**
    - 分层存储（热/温/冷）
    - 分片向量索引
    - 粗召回（倒排）+ 精召回（向量）+ rerank
    - CDN / 缓存层

---

## 14. 一个完整 RAG 系统的组件清单（用作项目概述）

当面试官问"你做过 RAG 项目吗？"时，可以按这个清单讲：

**离线部分**
- 文档接入：格式识别（PDF/Word/Markdown/HTML）、文本提取、OCR
- 清洗：去重、去噪、标准化
- 切分：递归切分 + 按结构切分，chunk_size=500、overlap=100
- 嵌入：bge-large-zh / text-embedding-3-small
- 存储：Qdrant（向量）+ ES（关键词）+ PostgreSQL（元数据）
- 更新：watchdog 监控变化 + 增量同步

**在线部分**
- Query 改写：基于对话历史补全上下文
- 混合检索：向量 top-20 + BM25 top-20，RRF 合并
- Rerank：BGE Reranker，取 top-5
- Prompt 组装：system prompt + 检索结果 + 用户问题
- LLM 生成：DeepSeek/GPT-4，streaming 输出
- 引用：返回答案同时标注来源文档和 chunk

**运维部分**
- 监控：端到端延迟、召回率、用户反馈
- 评估：每周跑一次 RAGAS，盯指标趋势
- Fallback：检索失败/LLM 失败/超时 的兜底
- A/B：不同 chunk 策略、不同 embedding、不同 prompt 的对比实验

---

## 15. 和 Agent 架构的关系总结

从 Agent 视角看：

```
单个 Agent + retrieve_tool = Agentic RAG
多个 Agent（其中之一是 retrieve agent）= Multi-Agent RAG
Agent 有 plan/reflection = Advanced RAG（CRAG / Self-RAG）
```

**RAG 不是独立的技术栈，它是 Agent 工具箱里的一种**。本课学到的工具调用机制、state 管理、多 Agent 协作，全部适用于 RAG 系统的构建。

所以如果面试官问"你怎么实现一个 RAG Agent？"，你可以从：
1. RAG 的工程细节（本文）
2. Agent 的架构设计（前面 10 课）
3. 两者如何结合（retrieve as tool + supervisor 编排）

三个层面都能讲，这就体现出完整的技术栈理解。
