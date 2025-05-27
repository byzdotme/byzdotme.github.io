import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "小朱的个人网站",
  description: "个人简历与作品集展示",
  lang: 'zh-CN',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '关于我', link: '/about' },
      { text: '作品集', link: '/projects' },
      { text: '联系方式', link: '/contact' }
    ],
    sidebar: [
      {
        text: '导航',
        items: [
          { text: '关于我', link: '/about' },
          { text: '作品集', link: '/projects' },
          { text: '联系方式', link: '/contact' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername' }
    ]
  }
})
