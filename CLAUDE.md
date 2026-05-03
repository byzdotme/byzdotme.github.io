## 项目概述

基于 VitePress 的个人网站，内容包含个人简历和博客文章，通过 GitHub Actions 部署到 GitHub Pages（域名 `byz.me`）。

## 常用命令

```bash
pnpm run docs:dev      # 本地开发服务器
pnpm run docs:build    # 构建生产版本
pnpm run docs:preview  # 本地预览构建结果
pnpm install           # 安装依赖
```

开发时使用 `pnpm run docs:dev`，内容热更新。

## 架构

- **内容目录**: 
  - `vpdocs/` — VitePress 文档根目录
    - `index.md` — 首页（个人信息、入口链接）
    - `resume.md` — 简历页
    - `blog/` — 博客文章（Markdown 文件）
  - `draft/` — 存在本地的读书笔记草稿，只有根据草稿发布文章的时候才需要阅读对应文档
- **配置**: `vpdocs/.vitepress/config.ts` — VitePress 配置，站点标题、导航等
- **部署**: `.github/workflows/deploy.yml` — main 分支 push 触发，构建输出到 `vpdocs/.vitepress/dist`，自动部署到 GitHub Pages
- **Node 版本**: 20（见 `.nvmrc`）

## 添加新页面

1. 在 `vpdocs/` 下创建 `.md` 文件
2. 如需出现在导航栏，在 `vpdocs/.vitepress/config.ts` 的 `themeConfig.nav` 中添加链接
3. push 到 main 分支后会自动部署
