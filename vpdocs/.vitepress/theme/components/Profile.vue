<script setup lang="ts">
import { useData } from 'vitepress'
import { content } from '../../../src/i18n/content'

const { lang } = useData()
// 添加语言回退逻辑，如果当前语言不存在，使用 'en'
const currentContent = content[lang.value] || content['en']

const formatDate = (date: string) => {
  return date.replace('至今', 'Present')
}
</script>

<template>
  <div class="profile-container">
    <!-- 个人信息 -->
    <section class="profile-section">
      <h2>{{ lang === 'zh' ? '个人信息' : 'Personal Information' }}</h2>
      <div class="info-grid">
        <div class="info-item">
          <strong>{{ lang === 'zh' ? '姓名' : 'Name' }}:</strong>
          <span>{{ currentContent.personalInfo.name }}</span>
        </div>
        <div class="info-item">
          <strong>{{ lang === 'zh' ? '出生日期' : 'Birth Date' }}:</strong>
          <span>{{ currentContent.personalInfo.birthDate }}</span>
        </div>
        <div class="info-item">
          <strong>{{ lang === 'zh' ? '所在地' : 'Location' }}:</strong>
          <span>{{ currentContent.personalInfo.location }}</span>
        </div>
        <div class="info-item">
          <strong>{{ lang === 'zh' ? '兴趣爱好' : 'Hobbies' }}:</strong>
          <span>{{ currentContent.personalInfo.hobbies.join(', ') }}</span>
        </div>
      </div>
    </section>

    <!-- 教育经历 -->
    <section class="profile-section">
      <h2>{{ lang === 'zh' ? '教育经历' : 'Education' }}</h2>
      <div class="timeline">
        <div v-for="edu in currentContent.education" :key="edu.period" class="timeline-item">
          <div class="timeline-period">{{ edu.period }}</div>
          <div class="timeline-content">
            <h3>{{ edu.degree }} - {{ edu.major }}</h3>
            <p>{{ edu.school }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 工作经历 -->
    <section class="profile-section">
      <h2>{{ lang === 'zh' ? '工作经历' : 'Work Experience' }}</h2>
      <div class="timeline">
        <div v-for="work in currentContent.workExperience" :key="work.period" class="timeline-item">
          <div class="timeline-period">{{ formatDate(work.period) }}</div>
          <div class="timeline-content">
            <h3>{{ work.position }}</h3>
            <p>{{ work.company }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 技能 -->
    <section class="profile-section">
      <h2>{{ lang === 'zh' ? '技能' : 'Skills' }}</h2>
      <div class="skills-grid">
        <div v-for="skill in currentContent.skills" :key="skill.category" class="skill-category">
          <h3>{{ skill.category }}</h3>
          <ul>
            <li v-for="item in skill.items" :key="item">{{ item }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 联系方式 -->
    <section class="profile-section">
      <h2>{{ lang === 'zh' ? '联系方式' : 'Contact' }}</h2>
      <div class="contact-grid">
        <div class="contact-item">
          <strong>Email:</strong>
          <a :href="'mailto:' + currentContent.contact.email">{{ currentContent.contact.email }}</a>
        </div>
        <div class="contact-item">
          <strong>GitHub:</strong>
          <a :href="currentContent.contact.github" target="_blank" rel="noopener noreferrer">
            {{ currentContent.contact.github.replace('https://github.com/', '') }}
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-section {
  margin-bottom: 3rem;
}

.profile-section h2 {
  font-size: 1.8rem;
  color: var(--vp-c-text-1);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--vp-c-brand);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.timeline-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  align-items: start;
}

.timeline-period {
  font-weight: 600;
  color: var(--vp-c-brand);
}

.timeline-content h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--vp-c-text-1);
}

.timeline-content p {
  margin: 0.5rem 0 0;
  color: var(--vp-c-text-2);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.skill-category h3 {
  font-size: 1.2rem;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.skill-category ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.skill-category li {
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
  position: relative;
}

.skill-category li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--vp-c-brand);
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contact-item a {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.contact-item a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .profile-container {
    padding: 1rem;
  }

  .timeline-item {
    grid-template-columns: 1fr;
  }

  .timeline-period {
    margin-bottom: 0.5rem;
  }

  .skills-grid {
    grid-template-columns: 1fr;
  }
}
</style> 