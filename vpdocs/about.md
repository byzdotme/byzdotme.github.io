---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import { content } from '../src/i18n/content'

const { lang } = useData()
const currentContent = content[lang.value] || content['en']

const title = lang.value === 'zh' ? '关于我' : 'About Me'
</script>

<template>
  <div class="about-page">
    <h1>{{ title }}</h1>
    <Profile />
  </div>
</template>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 2rem;
  text-align: center;
}
</style> 