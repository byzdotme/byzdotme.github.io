logging stuff

## 日志到底要怎么打？

我现在的做法是：
- info 打关键业务流程
- warn 打异常但可恢复的情况
- error 打需要人工介入的
- debug 随便打，开发环境看

但是有个问题，日志太多了怎么办？线上几百万条日志，查问题像大海捞针...

### 结构化日志
现在大家都用结构化日志（JSON 格式），方便以后用 ELK 查。但是开发的时候看 JSON 日志真的很累眼睛。

推荐用 zap（uber的）或者 zerolog，比标准库快很多。zap 的性能大概是标准库的 4-5 倍吧（这个数据我记得可能不太准）。

### 链路追踪
说到查问题，光看日志不够，还要有 traceId。每个请求进来生成一个 traceId，所有日志都带上，这样就能串联起来了。这个叫分布式追踪。

opentelemetry 是现在的标准，别再用 jaeger 了（其实 jaeger 也在往 opentelemetry 迁移）。

## 日志规范
- 日志里不能有敏感信息！密码、token、身份证号统统不能打
- 异常日志一定要带堆栈
- 日志级别别乱用，我见过有人把正常的业务信息打成 error，半夜告警响个不停

对了，还有：不要在循环里打日志，不然一秒几万条。

## ELK
Elasticsearch + Logstash + Kibana，日志三件套。
Filebeat 采集 → Logstash 处理 → Elasticsearch 存储 → Kibana 展示。

不过 Logstash 比较重，可以用 Fluentd 或者 Vector 替代。Vector 是 Rust 写的，性能好。

日志保留策略：热数据 7 天，温数据 30 天，冷数据归档到 S3。ES 的索引按天滚动，不然单个索引太大会炸。

### 一个疑惑
到底要不要把日志打到 ES 里？有人说 ES 不是为日志设计的，ClickHouse 更适合。但 ClickHouse 的生态没有 ES 完善...这个得再调研一下。
