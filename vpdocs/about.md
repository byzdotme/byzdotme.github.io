---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import { content, pageElement } from './src/i18n/content'
import { defaultLocale, getCurrentContentWithFallback } from './src/i18n/config'
import Profile from '.vitepress/theme/components/Profile.vue'

const { lang } = useData()
const defaultContent = content[defaultLocale]
const currentContent = getCurrentContentWithFallback(content, lang.value, ['personalInfo'])
const currentElement = getCurrentContentWithFallback(pageElement, lang.value, ['about'])
</script>

<template>
  <div class="about-page">
    <h1>{{ currentElement.about.title }}</h1>
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