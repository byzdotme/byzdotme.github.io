<template>
  <main class="max-w-3xl mx-auto px-6 py-16">
    <article v-if="page">
      <div class="prose prose-slate max-w-none">
        <ContentRenderer :value="page" />
      </div>
    </article>
    <div class="mt-12">
      <NuxtLink to="/" class="text-sm text-slate-500 hover:text-purple-600 transition-colors">
        ← 返回首页
      </NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
const { data: page } = await useAsyncData('resume', () =>
  queryCollection('resume').first()
)
</script>
