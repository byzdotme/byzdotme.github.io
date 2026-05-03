---
title: 监控指标与 Prometheus 实战：从埋点到告警的体系建设
date: 2026-05-03
category: 可观测性
tags: [可观测性, Prometheus, 监控, Grafana, Alertmanager]
---

# 监控指标与 Prometheus 实战：从埋点到告警的体系建设

如果说日志是系统的"黑匣子"，那么指标（Metrics）就是系统的"仪表盘"。指标用数字告诉你：当前的 QPS 是多少、响应延迟是否正常、内存是否告急。没有指标的系统，就像没有仪表盘的飞机——你只能靠感觉在飞。

Prometheus 是目前最主流的指标监控系统。本文整理 Prometheus 从埋点到告警的实战经验。

## 1. Prometheus 基础架构

Prometheus 的核心理念是 **Pull 模型**：它会主动去各个目标服务上抓取（scrape）指标数据，而不是等服务把数据推过来。每个服务需要暴露一个 `/metrics` HTTP 端点，返回格式化的指标数据。

这种设计的好处是：
- 采集端是中心控制的，不需要每个服务感知 Prometheus 的存在
- 可以通过 Prometheus 配置文件灵活控制采集频率和目标
- 目标宕机时立即体现在"抓取失败"指标上

### 四种核心指标类型

**Counter（计数器）：** 只增不减。适合统计请求总数、错误总数、CPU 用户态时间等。如果进程重启，Counter 会重置为零。查询时通常配合 `rate()` 函数使用。

**Gauge（仪表盘）：** 可增可减。适合统计内存使用量、当前连接数、队列长度等瞬时值。Gauge 不需要额外函数，直接查询即可反映当前状态。

**Histogram（直方图）：** 对观测值进行分桶统计。适合统计请求延迟分布。Histogram 可以计算分位数，但精度取决于桶的划分。一个常见的坑是桶配置不合理，导致几乎所有请求都落在最后一个 `+Inf` 桶里，分位数计算完全失去意义。

**Summary（摘要）：** 与服务端预先计算的 Quantile 不同，Summary 在客户端直接计算分位数。优点是不需要事后计算，缺点是无法跨进程聚合。

### 选型建议

- **Counter + Histogram** 是最常用的组合：Counter 记数量，Histogram 记延迟分布。
- Gauge 适合系统资源类指标。
- Summary 使用场景较少，仅在需要精确低分位数且不需要跨实例聚合时使用。

**小结：** 理解四种指标类型是 Prometheus 埋点的基础。Counter 记次数、Gauge 记瞬时值、Histogram 记分布、Summary 记分位数——选对类型，后续的查询和告警才能准确。

## 2. PromQL：核心查询语言

PromQL 是 Prometheus 的查询语言，也是很多人觉得难上手的部分。几个容易混淆的常用函数：

**rate() vs irate()：**
- `rate()` 计算一段时间内的**每秒平均增长率**，自动处理计数器重置和边界。适合大多数场景，结果更平滑。
- `irate()` 只考虑区间内**最近两个样本点**，反应更灵敏，适合短时间窗口、对突发敏感的查询。

**一个典型查询：**
```
rate(http_requests_total{status="5xx"}[5m])
```
这表示：过去 5 分钟内，HTTP 5xx 错误的每秒平均增长率。

**histogram_quantile：**
```
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```
这表示：过去 5 分钟内，P99 响应延迟。注意这里依赖 Histogram 的 bucket 划分合理。

**小结：** PromQL 的核心是几个函数组合使用。不用记所有函数，掌握 `rate`、`irate`、`histogram_quantile`、`avg`、`sum` 就能覆盖 90% 的查询场景。

## 3. 常用 Exporter

Prometheus 本身不采集服务器指标，需要借助各种 Exporter 来暴露数据：

- **node_exporter：** 采集机器级别指标（CPU、内存、磁盘、网络）。每台机器必须部署。
- **blackbox_exporter：** 做拨测（HTTP/HTTPS/TCP/ICMP），检查外部服务是否可达。
- **redis_exporter、mysql_exporter、nginx_exporter：** 采集各种中间件的运行指标。

大多数 Exporter 只需在启动参数中配置目标地址即可。注意给 node_exporter 配置合适的采集参数，默认会采集所有可用的指标，其中很多用不上，浪费存储。

**小结：** Exporter 是 Prometheus 生态的重要组成部分。优先使用官方或社区维护的 Exporter，避免重复造轮子。

## 4. 告警规则与 Alertmanager

Prometheus 本身只负责采集和存储，告警的评估和发送由 **Alertmanager** 承担。

### 告警规则配置

告警规则写在 YAML 文件中，核心字段：

- `expr`：PromQL 表达式，当结果不为空时触发告警。
- `for`：持续时间。表达式持续满足条件多久才触发告警。这个参数非常重要，可以有效**防止抖动导致的误告警**。
- `labels` 和 `annotations`：告警的元数据。`annotations` 中应该包含清晰的告警描述、排查链接、值班人等信息。

### 告警质量管理

告警是一项需要持续治理的工作：

- **告警必须有行动指南：** 每次告警都应当能定位到具体的排查文档或自动化脚本。无法行动的告警只是噪音。
- **重要告警才配置：** 不要为每个指标都配上告警。告警太多会变成"狼来了"，当真正的严重告警出现时反而没人响应。
- **抑制与静默：** Alertmanager 的 `inhibition` 可以在高级别告警发生时抑制相关的低级别告警（比如主机宕机了，就不用再报该主机上的进程告警）。`silence` 可以在维护窗口期屏蔽已知告警。

**小结：** 告警是监控体系的最后一环，也是最容易出问题的一环。好的告警规则是有问必答，坏的告警规则是天天狼来了。

## 5. 存储选型：从单机到集群

Prometheus 内置的 TSDB 时序数据库性能优秀，默认保留 15 天数据，最近 2 小时的数据保持在内存中以提供快速查询。

但对于需要长期存储的企业级场景，单机 Prometheus 有两个问题：**可用性单点**和**存储容量有限**。几种主流的扩展方案：

- **Thanos：** 在 Prometheus 之上叠加长期存储能力。用 Sidecar 将数据上传到对象存储（S3/GCS），提供全局查询视图。社区活跃，方案成熟。
- **VictoriaMetrics：** 独立的时序数据库，兼容 Prometheus 查询 API。单节点性能极高，存储压缩比好（大约是 Prometheus TSDB 的 7-10 倍），运维简单。
- **Grafana Mimir：** Grafana 团队推出的长期存储方案。支持水平扩展、多租户、压缩和降采样。和 Grafana 生态集成最佳。

对于中小团队，建议先使用单机 Prometheus + 适当延长本地保留时间。当存储真正成为瓶颈时，再考虑扩展方案。

**小结：** 存储选型取决于规模。小规模场景单机 Prometheus 足够，规模上来后 Thanos 和 VictoriaMetrics 是主流选择。

## 6. 实践经验总结

最后整理几个容易踩坑的实践要点：

- **不要在业务代码中直接调用 Prometheus 客户端 SDK。** 最好封装一层中间接口，方便未来切换监控体系或做单元测试 mock。
- **指标命名规范：** 使用下划线分隔单词，带命名空间前缀，比如 `http_requests_total`。
- **Label 基数控制：** Label 的取值组合数量不能太高。典型的反例是把用户 ID、请求 IP 等高位散列值放在 Label 里，会导致 Prometheus 的 TSDB 膨胀数十倍。
- **Histogram Bucket 合理配置：** 根据业务延迟分布来划定 Bucket，确保关键区间的桶有足够样本。参考配置：`{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}`。
- **Grafana 做可视化：** Prometheus 自带的表达式浏览器只适合调试，生产环境的仪表盘统一用 Grafana。Grafana 支持多数据源、变量模板和告警管理。

## 总结

指标监控是系统可观测性的第二支柱。Prometheus 以其 Pull 模型、多维数据模型和强大的 PromQL 体系，成为了这一领域的标准方案。从埋点时的指标类型选择，到存储选型的取舍，再到告警规则的治理，每一个环节都值得在架构设计阶段投入精力。

如果你刚开始搭建监控体系，建议的路线是：**先跑起 node_exporter 和 Prometheus，配上 Grafana 面板，再把核心业务的 HTTP 延迟和错误率加上，最后逐步完善告警规则。**

[返回博客列表](./index)
