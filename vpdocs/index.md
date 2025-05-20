---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
---

<script setup>
import { useData } from 'vitepress'
import { content } from './src/i18n/content'

const { lang } = useData()
const currentContent = content[lang.value] || content['en']

const hero = {
  name: currentContent.personalInfo.name,
  text: lang.value === 'zh' ? 'Java后端工程师' : 'Java Backend Engineer',
  tagline: lang.value === 'zh' 
    ? '热爱软件开发与技术创新的全栈工程师'
    : 'Passionate about software development and technology innovation',
  actions: [
    {
      theme: 'brand',
      text: lang.value === 'zh' ? '关于我' : 'About Me',
      link: lang.value === 'zh' ? '/zh/about' : '/about'
    },
    {
      theme: 'alt',
      text: lang.value === 'zh' ? '查看作品' : 'View Projects',
      link: lang.value === 'zh' ? '/zh/projects' : '/projects'
    }
  ]
}

const features = [
  {
    title: lang.value === 'zh' ? '后端开发' : 'Backend Development',
    details: currentContent.skills.find(s => 
      s.category === (lang.value === 'zh' ? '后端开发' : 'Backend Development')
    )?.items.join('. ')
  },
  {
    title: lang.value === 'zh' ? '前端开发' : 'Frontend Development',
    details: currentContent.skills.find(s => 
      s.category === (lang.value === 'zh' ? '前端开发' : 'Frontend Development')
    )?.items.join('. ')
  },
  {
    title: lang.value === 'zh' ? '全栈经验' : 'Full Stack Experience',
    details: lang.value === 'zh'
      ? '具有构建和维护全栈应用的经验，注重可扩展性和性能优化。'
      : 'Experience in building and maintaining full-stack applications with a focus on scalability and performance.'
  }
]
</script>

<template>
  <div class="home">
    <div class="VPHero">
      <div class="container">
        <div class="main">
          <h1 class="name">{{ hero.name }}</h1>
          <p class="text">{{ hero.text }}</p>
          <p class="tagline">{{ hero.tagline }}</p>
          <div class="actions">
            <a
              v-for="action in hero.actions"
              :key="action.text"
              :href="action.link"
              :class="['VPButton', 'medium', action.theme]"
            >
              {{ action.text }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="VPFeatures">
      <div class="container">
        <div class="items">
          <div v-for="feature in features" :key="feature.title" class="item">
            <h2 class="title">{{ feature.title }}</h2>
            <p class="details">{{ feature.details }}</p>
          </div>
        </div>
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

