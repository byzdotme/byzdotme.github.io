<script setup>
import Profile from './Profile.vue'
</script>

<template>
  <div class="about-page">
    <h1>关于我</h1>
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