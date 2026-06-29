## 项目概述

基于 Nuxt 4 + Nuxt Content v3 的个人网站，包含首页、博客和简历，通过 GitHub Actions 部署到 GitHub Pages（域名 `byz.me`）。

## 常用命令

```bash
pnpm run dev      # 本地开发服务器（热更新）
pnpm run build    # 静态构建（nuxi generate）
pnpm run preview  # 本地预览构建结果（npx serve .output/public）
pnpm install      # 安装依赖
```

## 架构

- **框架**: Nuxt 4 + Nuxt Content v3 + Tailwind CSS + Motion One
- **内容目录**:
  - `content/blog/` — 博客文章（Markdown，自动扫描生成目录）
  - `content/resume.md` — 简历
  - `draft/` — 读书笔记草稿，发布时才需要关注
- **页面**: `app/pages/`（基于文件路由）
  - `index.vue` — 首页（自定义 Vue 组件）
  - `blog/index.vue` — 博客目录（构建时自动扫描 content/blog/，按分类分组）
  - `blog/[...slug].vue` — 文章详情
  - `resume.vue` — 简历页
- **首页组件**: `app/components/`（HeroSection、SkillCloud、FeaturedPosts、ProjectCards、SocialLinks、SiteFooter）
- **配置**:
  - `nuxt.config.ts` — Nuxt 主配置（模块、SSG、预渲染路由）
  - `content.config.ts` — 内容集合 schema（blog、resume）
  - `tailwind.config.ts` — Tailwind CSS 配置（品牌色、typography 插件）
- **部署**: `.github/workflows/deploy.yml` — main 分支 push 触发，`nuxi generate` 构建到 `.output/public`，自动部署到 GitHub Pages
- **Node 版本**: 24（见 `.nvmrc`）

## 添加新博客文章

1. 在 `content/blog/` 下创建 `.md` 文件，需包含 frontmatter：
   ```yaml
   ---
   title: 文章标题
   date: YYYY-MM-DD
   category: 分类名
   tags: [标签1, 标签2]
   ---
   ```
2. push 到 main 分支后自动部署（博客目录自动更新，无需手动维护）

## 自定义域名为 CNAME

`public/CNAME` 包含域名 `byz.me`，构建时自动复制到 `.output/public/`。
