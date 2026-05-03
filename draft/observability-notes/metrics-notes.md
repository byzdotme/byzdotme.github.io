# 监控随手记

## promethus 基础

- promethus 是一个开源的监控系统
- 用的是pull模型，不是push
- 服务要暴露 /metrics 端点
- 它有四种指标类型：counter(只增不减), gauge(可增可减), histogram(分布), summary(分位数)
- counter适合统计请求数
- gauge适合统计cpu、内存啥的

### 一些混乱的想法
promethus 的 promQL 挺难写的，特别是 rate() 和 irate() 的区别经常搞混
rate() 计算的是每秒平均增长率，irate() 看的是最近两个点的瞬时变化
告警的话用 AlertManager，可以用 inhibition 抑制重复告警，还有个 silence 静默

grafana 做可视化挺好用的，比 promethus 自带的好

## 常用 exporter

node_exporter 采集机器指标
blackbox_exporter 用来做拨测
还有各种中间件的 exporter，redis_exporter, mysql_exporter 等等

### 关于告警规则
告警规则写在 yaml 文件里，expr 是 promQL 表达式
for 表示持续多久才触发（这个很重要，防止抖动）
labels 和 annotations 是告警的元数据

注意：不要让告警太频繁，重要告警才配，不然就变成狼来了

## 存储
promethus 的 TSDB 存储，默认保留15天，有两个小时的数据在内存里
远程存储可以用 Thanos 或者 VictoriaMetrics（这个拼写可能错了，我记得是 VictoriaMetrics 但是不太确定）

哦对了还有一个 Mimir 是 Grafana 出的，也可以做长期存储

## 一些经验
- 不要在业务代码里直接写 promethus 的 client，最好封装一层
- 指标命名要规范，用下划线分隔
- label 的基数不能太高，比如不要把用户ID放在label里
- 之前遇到过一个坑：histogram 的 bucket 配置不好，导致几乎所有的请求都落在 +Inf 的 bucket 里，根本看不出分布
