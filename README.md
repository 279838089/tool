# 手机端小说阅读站（Cloudflare Pages + Pages Functions）

本项目是一个只做手机端的工具站，第一期功能：本地 `./novels` 目录存储小说（一本书一个子目录，章节为 Markdown 文件），部署到 Cloudflare Pages，通过 Pages Functions 暴露 API，前端渲染 Markdown 并提供移动端友好的阅读体验（上一章/下一章、夜间模式、字号调节）。

目录结构
- public/ 静态资源与页面（会被 Cloudflare Pages 直接作为静态资源托管）
  - index.html 主页（小说列表）
  - reader.html 阅读器页
  - static/
    - style.css 首页样式
    - reader.css 阅读器样式
    - novels.js 首页逻辑
    - reader.js 阅读器逻辑
- functions/ Pages Functions（API）
  - api/novels.js
  - api/novels/[book]/chapters.js
  - api/novels/[book]/chapters/[slug].js
  - _middleware.js 全局中间件（CORS/缓存控制）
- novels/ 你的本地小说内容（已存在）
- wrangler.toml Wrangler 配置（本地开发）

快速开始（本地）
1) 安装 wrangler（任选）
   - npm i -g wrangler
   - 或使用 Corepack: corepack enable && pnpm dlx wrangler --version

2) 本地开发
   - wrangler pages dev ./public

   提示：
   - Pages Functions 位于 ./functions 目录，dev 模式会自动加载
   - 访问：
     - 首页 http://127.0.0.1:8788/
     - API http://127.0.0.1:8788/api/novels

3) 部署到 Cloudflare Pages
   - 将本仓库推送到 GitHub
   - Cloudflare Pages 新项目，Framework preset 选 None
   - Build command 留空，Build output directory 填 public
   - Functions 目录保持为 functions（默认）
   - 部署后即可访问

API 约定
- GET /api/novels
  返回所有小说（子目录名）
  { "books": [ "斗罗大陆", "斗罗外传" ] }

- GET /api/novels/:book/chapters
  返回排序后的章节 slug 列表与标题
  { "book": "斗罗外传", "chapters": [ { "slug": "001_第1章 史莱克广场.md", "title": "第1章 史莱克广场" }, ... ] }

- GET /api/novels/:book/chapters/:slug
  返回章节 Markdown 原文（前端渲染）
  { "book": "...", "slug": "...", "title": "...", "content": "Markdown..." , "index": 0, "total": 63 }

章节排序与去重
- 优先按照文件名开头的数字编号排序（例如 001、002）
- 若编号缺失则按自然排序
- 对重复章节名进行去重，保留首次出现

注意
- 本项目不引入服务端 Markdown 解析，统一在前端用 marked 渲染，减小 Functions 冷启动与体积
- 如需 PWA/缓存离线阅读，可后续扩展
