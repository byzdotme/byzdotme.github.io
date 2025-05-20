---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import { content } from '../src/i18n/content'

const { lang } = useData()
const currentContent = content[lang.value] || content['en']

const title = lang.value === 'zh' ? '联系方式' : 'Contact'
const subtitle = lang.value === 'zh'
  ? '如果您有任何问题或合作意向，欢迎通过以下方式联系我'
  : 'Feel free to reach out to me through the following channels'

const contactInfo = [
  {
    icon: '📧',
    label: 'Email',
    value: currentContent.contact.email,
    link: `mailto:${currentContent.contact.email}`
  },
  {
    icon: '🐙',
    label: 'GitHub',
    value: currentContent.contact.github.replace('https://github.com/', ''),
    link: currentContent.contact.github
  }
]
</script>

<template>
  <div class="contact-page">
    <h1>{{ title }}</h1>
    <p class="subtitle">{{ subtitle }}</p>

    <div class="contact-grid">
      <a
        v-for="info in contactInfo"
        :key="info.label"
        :href="info.link"
        target="_blank"
        rel="noopener noreferrer"
        class="contact-card"
      >
        <span class="icon">{{ info.icon }}</span>
        <div class="content">
          <h2>{{ info.label }}</h2>
          <p>{{ info.value }}</p>
        </div>
      </a>
    </div>

    <div class="message-board">
      <h2>{{ lang.value === 'zh' ? '留言板' : 'Message Board' }}</h2>
      <p class="message-subtitle">
        {{ lang.value === 'zh'
          ? '您也可以在这里留下您的留言，我会尽快回复'
          : 'You can also leave a message here, and I will reply as soon as possible'
        }}
      </p>
      <!-- 这里可以集成留言板组件 -->
      <div class="message-board-placeholder">
        {{ lang.value === 'zh'
          ? '留言板功能正在开发中...'
          : 'Message board feature is under development...'
        }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
  text-align: center;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
  text-align: center;
  margin-bottom: 3rem;
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: transform 0.3s ease;
}

.contact-card:hover {
  transform: translateY(-4px);
}

.icon {
  font-size: 2rem;
}

.content h2 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.content p {
  color: var(--vp-c-text-2);
  margin: 0;
}

.message-board {
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.message-board h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.message-subtitle {
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
}

.message-board-placeholder {
  padding: 3rem;
  background-color: var(--vp-c-bg);
  border-radius: 4px;
  color: var(--vp-c-text-2);
}

@media (max-width: 640px) {
  .contact-page {
    padding: 1rem;
  }

  .contact-grid {
    grid-template-columns: 1fr;
  }
}
</style> 