import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        date: z.date(),
        category: z.string(),
        tags: z.array(z.string()),
      }),
    }),
    resume: defineCollection({
      type: 'page',
      source: 'resume.md',
    }),
  },
})
