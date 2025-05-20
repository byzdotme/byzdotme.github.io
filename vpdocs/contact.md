---
layout: doc
---

<script setup>
import { useData } from 'vitepress'
import { content, pageElement } from './src/i18n/content'
import { defaultLocale, getCurrentContentWithFallback } from './src/i18n/config'

const { lang } = useData()
const defaultContent = content[defaultLocale]
const currentContent = getCurrentContentWithFallback(content, lang.value, ['contact'])
const currentElement = getCurrentContentWithFallback(pageElement, lang.value, ['contact'])

// 定义联系方式类型
const contactTypes = [
  {
    type: 'email',
    icon: '📧',
    label: 'Email',
    getValue: (content) => content?.contact?.email || defaultContent.contact.email,
    getLink: (value) => value ? `mailto:${value}` : '#'
  },
  {
    type: 'github',
    icon: '🐙',
    label: 'GitHub',
    getValue: (content) => content?.contact?.github ? content.contact.github.replace('https://github.com/', '') : defaultContent.contact.github.replace('https://github.com/', ''),
    getLink: (value) => value ? `https://github.com/${value}` : '#'
  }
]

// 生成联系方式数组，只包含有值的联系方式
const contactInfo = contactTypes
  .map(type => {
    const value = type.getValue(currentContent)
    if (!value) return null
    return {
      icon: type.icon,
      label: type.label,
      value,
      link: type.getLink(value)
    }
  })
  .filter(item => item !== null)
</script>

<template>
  <div class="contact-page">
    <h1>{{ currentElement.contact.title }}</h1>
    <p class="subtitle">{{ currentElement.contact.subtitle }}</p>

    <div v-if="contactInfo.length > 0" class="contact-grid">
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
      <h2>{{ currentElement.contact.messageBoard.title }}</h2>
      <p class="message-subtitle">
        {{ currentElement.contact.messageBoard.subtitle }}
      </p>
      <!-- 这里可以集成留言板组件 -->
      <div class="message-board-placeholder">
        {{ currentElement.contact.messageBoard.placeholder }}
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