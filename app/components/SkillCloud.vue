<template>
  <section>
    <h2 class="text-2xl font-bold text-slate-900 mb-6">技术栈</h2>
    <div class="space-y-4">
      <div v-for="group in skillGroups" :key="group.name">
        <h3 class="text-sm font-medium text-slate-500 mb-2">{{ group.name }}</h3>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="skill in group.skills"
            :key="skill"
            :class="skillColor(skill)"
            class="px-3 py-1.5 text-sm rounded-lg font-medium"
          >
            {{ skill }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const skillGroups = [
  { name: '后端 & 架构', skills: ['Java', 'Spring Boot', 'MyBatis', 'DDD', '微服务', '分布式事务', 'MySQL', 'Redis'] },
  { name: 'AI / LLM', skills: ['Spring AI', 'LangGraph', 'RAG', 'Agent', '向量数据库', 'Prompt Engineering'] },
  { name: 'DevOps & 工具', skills: ['Docker', 'Kubernetes', 'CI/CD', 'Git', 'Linux'] },
  { name: '前端', skills: ['Vue', 'TypeScript', 'Tailwind CSS', 'Vite'] },
]

const colors = [
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
]

function skillColor(skill: string) {
  return colors[skill.length % colors.length]
}
</script>
