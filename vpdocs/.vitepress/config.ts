import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Tony Zhu',
  description: '15年全栈架构师的个人主页',
  lang: 'zh-CN',
  themeConfig: {
    nav: [
      { text: 'Blog', link: 'https://你的博客地址.com' },
      { text: 'GitHub', link: 'https://github.com/你的id' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/你的id' },
      { icon: 'linkedin', link: 'https://linkedin.com/in/你的id' }
    ],
    sidebar: [],
    footer: {
      message: 'Based on VitePress',
      copyright: 'Copyright © 2024 Tony Zhu'
    }
  }
})
