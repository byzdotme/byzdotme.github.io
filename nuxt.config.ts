export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxtjs/tailwindcss'],

  nitro: {
    prerender: {
      routes: ['/', '/blog/', '/resume/'],
    },
  },

  vite: {
    build: {
      modulePreload: {
        polyfill: false,
      },
    },
  },

  app: {
    head: {
      title: '小朱的个人站',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: 'github-dark',
        },
      },
    },
  },

  compatibilityDate: '2026-05-20',
})
