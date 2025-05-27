<script setup>
const projects = [
  {
    title: '个人网站',
    description: '使用 VitePress 构建的个人网站，展示个人简历和作品集。',
    tech: ['VitePress', 'Vue 3', 'TypeScript', 'Markdown'],
    link: 'https://github.com/byzdotme/byzdotme.github.io'
  },
  {
    title: '待添加项目',
    description: '更多项目正在开发中...',
    tech: [],
    link: null
  }
]
</script>

<template>
  <div class="projects-page">
    <h1>作品集</h1>
    <p class="subtitle">这里展示了我的一些个人项目和工作成果</p>

    <div class="projects-grid">
      <div v-for="project in projects" :key="project.title" class="project-card">
        <h2>{{ project.title }}</h2>
        <p class="description">{{ project.description }}</p>
        <div class="tech-stack">
          <span v-for="tech in project.tech" :key="tech" class="tech-tag">
            {{ tech }}
          </span>
        </div>
        <a
          v-if="project.link"
          :href="project.link"
          target="_blank"
          rel="noopener noreferrer"
          class="project-link"
        >
          查看项目
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-page {
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

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.project-card {
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 2rem;
  transition: transform 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
}

.project-card h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 1rem;
}

.description {
  color: var(--vp-c-text-2);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tech-tag {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
}

.project-link {
  display: inline-block;
  background-color: var(--vp-c-brand);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.project-link:hover {
  background-color: var(--vp-c-brand-dark);
}

@media (max-width: 640px) {
  .projects-page {
    padding: 1rem;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style> 