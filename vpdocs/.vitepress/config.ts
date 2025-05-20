import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "小朱的个人网站",
  description: "个人简历与作品集展示",
  lang: 'zh-CN',
  cleanUrls: true,
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: "Tony's Portfolio",
      description: "Personal Resume and Portfolio",
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'About', link: '/about' },
          { text: 'Projects', link: '/projects' },
          { text: 'Contact', link: '/contact' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'About Me', link: '/about' },
              { text: 'Projects', link: '/projects' },
              { text: 'Contact', link: '/contact' }
            ]
          }
        ],
        socialLinks: [
          { icon: 'github', link: 'https://github.com/yourusername' }
        ]
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh',
      title: "小朱的个人网站",
      description: "个人简历与作品集展示",
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '关于我', link: '/zh/about' },
          { text: '作品集', link: '/zh/projects' },
          { text: '联系方式', link: '/zh/contact' }
        ],
        sidebar: [
          {
            text: '导航',
            items: [
              { text: '关于我', link: '/zh/about' },
              { text: '作品集', link: '/zh/projects' },
              { text: '联系方式', link: '/zh/contact' }
            ]
          }
        ],
        socialLinks: [
          { icon: 'github', link: 'https://github.com/yourusername' }
        ]
      }
    }
  },
  themeConfig: {
    // 默认语言配置
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about' },
      { text: 'Projects', link: '/projects' },
      { text: 'Contact', link: '/contact' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'About Me', link: '/about' },
          { text: 'Projects', link: '/projects' },
          { text: 'Contact', link: '/contact' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yourusername' }
    ]
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('../src', import.meta.url))
      }
    }
  }
})
