<template>
  <section class="text-center">
    <h2 class="text-xl font-bold text-slate-900 mb-4">找到我</h2>
    <div class="flex justify-center gap-4">
      <a
        v-for="link in links"
        :key="link.label"
        :href="link.url"
        :title="link.label"
        class="w-10 h-10 rounded-full bg-slate-100 hover:bg-purple-100 flex items-center justify-center text-slate-600 hover:text-purple-600 transition-colors"
      >
        <span class="text-lg">{{ link.icon }}</span>
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
const links = [
  { label: 'GitHub', url: 'https://github.com/byzdotme', icon: 'GH' },
  { label: 'Email', url: 'mailto:contact@byz.me', icon: '✉' },
]
</script>
