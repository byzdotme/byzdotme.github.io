<template>
  <main class="max-w-3xl mx-auto px-6 py-16">
    <article v-if="page">
      <header class="mb-8">
        <NuxtLink to="/blog/" class="text-sm text-slate-500 hover:text-purple-600 transition-colors">
          ← 返回文章列表
        </NuxtLink>
        <h1 class="mt-4 text-3xl font-bold text-slate-900">{{ page.title }}</h1>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span v-if="page.date">{{ formatDate(page.date) }}</span>
          <span v-if="page.category" class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">
            {{ page.category }}
          </span>
        </div>
        <div v-if="page.tags?.length" class="mt-3 flex flex-wrap gap-1">
          <span
            v-for="tag in page.tags"
            :key="tag"
            class="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600"
          >
            {{ tag }}
          </span>
        </div>
      </header>

      <div class="prose prose-slate max-w-none">
        <ContentRenderer :value="page" />
      </div>
    </article>

    <div v-else class="text-center py-16 text-slate-500">
      文章未找到
    </div>
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = (route.params.slug as string[]).join('/')

const { data: page } = await useAsyncData(`blog-${slug}`, () =>
  queryCollection('blog').path(`/blog/${slug}`).first()
)

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>
