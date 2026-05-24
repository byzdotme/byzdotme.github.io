<template>
  <footer class="text-center text-sm text-slate-400 py-8 border-t border-slate-200">
    <p>&copy; {{ year }} byz.me</p>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
