export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxtjs/tailwindcss'],

  ssr: true,

  nitro: {
    prerender: {
      routes: ['/', '/blog/', '/resume/'],
    },
  },

  app: {
    head: {
      title: '小朱的个人站',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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

  experimental: {
    appManifest: false,
  },
})
