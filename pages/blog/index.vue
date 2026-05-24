<template>
  <main class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="text-3xl font-bold text-slate-900 mb-2">随手记</h1>
    <p class="text-slate-500 mb-10">共 {{ posts?.length || 0 }} 篇文章</p>

    <div class="space-y-8">
      <div v-for="group in groupedPosts" :key="group.category">
        <h2 class="text-lg font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-200">
          {{ group.category }}
        </h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="post in group.posts"
            :key="post.path"
            :to="post.path"
            class="flex items-baseline justify-between group py-1.5 px-2 -mx-2 rounded hover:bg-slate-50 transition-colors"
          >
            <span class="text-slate-800 group-hover:text-purple-600 transition-colors">
              {{ post.title }}
            </span>
            <span class="text-xs text-slate-400 whitespace-nowrap ml-4">
              {{ formatDate(post.date) }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="mt-12">
      <NuxtLink to="/" class="text-sm text-slate-500 hover:text-purple-600 transition-colors">
        ← 返回首页
      </NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
const { data: posts } = await useAsyncData('blog-posts', () =>
  queryCollection('blog').order('date', 'DESC').all()
)

const groupedPosts = computed(() => {
  if (!posts.value) return []
  const groups: Record<string, typeof posts.value> = {}
  for (const post of posts.value) {
    const cat = post.category || '未分类'
    ;(groups[cat] ||= []).push(post)
  }
  return Object.entries(groups).map(([category, posts]) => ({ category, posts }))
})

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
