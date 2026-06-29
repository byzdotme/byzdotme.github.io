# byz.me

基于 Nuxt 4、Nuxt Content v3 和 Tailwind CSS 构建的个人网站，包含首页、博客和简历，通过 GitHub Actions 部署到 GitHub Pages。

## 开发

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview
```

## 目录

- `app/pages/`：页面路由
- `app/components/`：首页组件
- `content/blog/`：博客文章
- `content/resume.md`：简历内容
- `public/CNAME`：自定义域名配置

## 发布文章

在 `content/blog/` 下新增 Markdown 文件，并提供 `title`、`date`、`category`、`tags` frontmatter。推送到 `main` 后，GitHub Actions 会自动生成静态站点并部署。
