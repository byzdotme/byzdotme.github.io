---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
hero:
  name: 小朱
  text: Java后端工程师
  tagline: 热爱软件开发与技术创新的全栈工程师
  actions:
    - theme: brand
      text: 关于我
      link: /about
    - theme: alt
      text: 查看作品
      link: /projects
features:
  - title: 后端开发
    details: 精通Java技术栈，MySQL、PostgreSQL等关系型数据库，NoSQL数据库，大数据体系
  - title: 前端开发
    details: 熟悉web前端技术，尤其熟悉Vue技术栈
  - title: 全栈经验
    details: 具有构建和维护全栈应用的经验，注重可扩展性和性能优化。
---

<script setup>
import Home from '.vitepress/theme/components/Home.vue'
</script>

<template>
  <Home />
</template>

<style scoped>
.home-page {
  padding-top: var(--vp-nav-height);
}
</style>

