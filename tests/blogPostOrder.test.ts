import assert from 'node:assert/strict'
import test from 'node:test'

import { sortBlogPosts } from '../app/utils/blogPostOrder.ts'

test('sorts DDD series posts by seriesOrder when dates are equal', () => {
  const posts = [
    { title: 'DDD 实战（八）：Go 项目中的 DDD 代码组织', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 8 },
    { title: 'DDD 实战（三）：战术设计，实体、值对象、聚合根与领域事件', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 3 },
    { title: 'DDD 实战（一）：DDD 到底在解决什么问题', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 1 },
    { title: 'DDD 实战（五）：账号、组织、关系、群组的边界取舍', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 5 },
    { title: 'DDD 实战（二）：战略设计，从业务语言到限界上下文', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 2 },
    { title: 'DDD 实战（七）：从领域模型到部署模块', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 7 },
    { title: 'DDD 实战（四）：协同办公 IM 的领域全景', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 4 },
    { title: 'DDD 实战（六）：消息、通知、搜索、开放平台的跨域协作', date: '2026-06-29', series: 'DDD 实战', seriesOrder: 6 },
  ]

  assert.deepEqual(
    sortBlogPosts(posts).map(post => post.seriesOrder),
    [1, 2, 3, 4, 5, 6, 7, 8],
  )
})

test('keeps newer posts before older posts', () => {
  const posts = [
    { title: 'older', date: '2026-06-28' },
    { title: 'newer', date: '2026-06-29' },
  ]

  assert.deepEqual(
    sortBlogPosts(posts).map(post => post.title),
    ['newer', 'older'],
  )
})
