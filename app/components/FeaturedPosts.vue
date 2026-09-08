<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-slate-900">精选文章</h2>
      <NuxtLink to="/blog/" class="text-sm text-purple-600 hover:text-purple-700 font-medium">
        查看全部 →
      </NuxtLink>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="post in posts"
        :key="post.path"
        :to="post.path"
        class="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all"
      >
        <span class="text-xs text-slate-400">{{ formatDate(post.date) }}</span>
        <h3 class="mt-1 text-lg font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
          {{ post.title }}
        </h3>
        <div class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="tag in post.tags?.slice(0, 3)"
            :key="tag"
            class="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600"
          >
            {{ tag }}
          </span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { sortBlogPosts } from '~/utils/blogPostOrder'

const { data: posts } = await useAsyncData('featured-posts', async () => {
  const posts = await queryCollection('blog').all()
  return sortBlogPosts(posts).slice(0, 4)
})

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
