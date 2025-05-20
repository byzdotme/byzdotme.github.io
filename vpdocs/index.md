---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
---

<script setup>
import { useData } from 'vitepress'
import { content, pageElement } from './src/i18n/content'
import { defaultLocale, getCurrentContentWithFallback } from './src/i18n/config'
import Profile from '.vitepress/theme/components/Profile.vue'

const { lang } = useData()
const defaultContent = content[defaultLocale]
const currentContent = getCurrentContentWithFallback(content, lang.value, ['personalInfo'])
const currentElement = getCurrentContentWithFallback(pageElement, lang.value, ['home'])

// 定义 hero 部分
const hero = {
  name: currentContent.personalInfo.name || defaultContent.personalInfo.name,
  text: currentElement.home.hero.text,
  tagline: currentElement.home.hero.tagline,
  actions: [
    {
      theme: 'brand',
      text: currentElement.home.hero.actions.about.text,
      link: currentElement.home.hero.actions.about.link
    },
    {
      theme: 'alt',
      text: currentElement.home.hero.actions.projects.text,
      link: currentElement.home.hero.actions.projects.link
    }
  ]
}

// 定义特性部分
const features = [
  {
    title: currentElement.home.features.backend.title,
    details: currentContent.skills.find(s => s.category === 'Backend')?.items.join(', ') || ''
  },
  {
    title: currentElement.home.features.frontend.title,
    details: currentContent.skills.find(s => s.category === 'Frontend')?.items.join(', ') || ''
  },
  {
    title: currentElement.home.features.fullstack.title,
    details: currentElement.home.features.fullstack.details
  }
]
</script>

<template>
  <div class="home-page">
    <div class="hero">
      <h1 class="name">{{ hero.name }}</h1>
      <p class="text">{{ hero.text }}</p>
      <p class="tagline">{{ hero.tagline }}</p>
      <div class="actions">
        <a
          v-for="action in hero.actions"
          :key="action.text"
          :href="action.link"
          :class="['action', action.theme]"
        >
          {{ action.text }}
        </a>
      </div>
    </div>

    <div class="features">
      <div v-for="feature in features" :key="feature.title" class="feature">
        <h2>{{ feature.title }}</h2>
        <p>{{ feature.details }}</p>
      </div>
    </div>

    <Profile />
  </div>
</template>

<style scoped>
.home {
  padding-top: var(--vp-nav-height);
}

.VPHero {
  min-height: 60vh;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  color: white;
  text-align: center;
  padding: 4rem 0;
}

.VPHero .container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px;
}

.VPHero .name {
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.VPHero .text {
  font-size: 2rem;
  font-weight: 600;
  margin: 1rem 0;
}

.VPHero .tagline {
  font-size: 1.5rem;
  margin: 1rem 0 2rem;
  opacity: 0.9;
}

.VPHero .actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.VPFeatures {
  padding: 4rem 24px;
  background-color: var(--vp-c-bg-soft);
}

.VPFeatures .container {
  max-width: 1152px;
  margin: 0 auto;
}

.VPFeatures .items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.VPFeatures .item {
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  transition: transform 0.3s ease;
}

.VPFeatures .item:hover {
  transform: translateY(-4px);
}

.VPFeatures .title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.VPFeatures .details {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

@media (max-width: 640px) {
  .VPHero .name {
    font-size: 2.5rem;
  }

  .VPHero .text {
    font-size: 1.5rem;
  }

  .VPHero .tagline {
    font-size: 1.2rem;
  }

  .VPHero .actions {
    flex-direction: column;
  }

  .VPHero .actions .VPButton {
    width: 100%;
  }
}
</style>

