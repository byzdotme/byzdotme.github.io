export interface BlogPostForOrder {
  title?: string
  date?: string | Date
  path?: string
  series?: string
  seriesOrder?: number
}

export function sortBlogPosts<T extends BlogPostForOrder>(posts: readonly T[]): T[] {
  return [...posts].sort((left, right) => {
    const dateDiff = toTimestamp(right.date) - toTimestamp(left.date)
    if (dateDiff !== 0) return dateDiff

    if (left.series && left.series === right.series) {
      const seriesOrderDiff = toSeriesOrder(left) - toSeriesOrder(right)
      if (seriesOrderDiff !== 0) return seriesOrderDiff
    }

    const titleDiff = (left.title || '').localeCompare(right.title || '', 'zh-CN')
    if (titleDiff !== 0) return titleDiff

    return (left.path || '').localeCompare(right.path || '', 'zh-CN')
  })
}

function toTimestamp(date: string | Date | undefined): number {
  if (!date) return Number.NEGATIVE_INFINITY
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

function toSeriesOrder(post: BlogPostForOrder): number {
  return typeof post.seriesOrder === 'number' ? post.seriesOrder : Number.POSITIVE_INFINITY
}
