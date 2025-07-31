# 移动端小说阅读工具

这是一个专为手机端设计的在线小说阅读网站，使用Cloudflare Pages Functions部署，支持本地小说文件的在线阅读。

## 功能特点

- 📱 纯移动端设计，完美适配手机屏幕
- 📚 支持本地小说文件在线阅读
- 🎯 美观的阅读界面，符合手机阅读习惯
- ⬅️➡️ 支持章节导航（上一章/下一章）
- 📖 支持目录浏览和快速跳转
- 👆 支持左右滑动切换章节
- ⚡ 基于Cloudflare Pages Functions，快速部署

## 项目结构

```
mobile-novel-reader/
├── functions/           # Cloudflare Pages Functions
│   ├── [[path]].js     # 主函数文件（支持本地文件读取）
│   └── _middleware.js  # 中间件配置
├── static/             # 静态资源
│   ├── style.css       # 主页样式
│   ├── reader.css      # 阅读页样式
│   ├── novels.js       # 小说列表页脚本
│   └── reader.js       # 阅读页脚本
├── novels/             # 小说存储目录（本地存储）
│   ├── README.md       # 小说存储说明
│   └── 斗罗大陆/       # 示例小说
│       ├── 001_第1章 斗罗大陆，异界唐三.md
│       ├── 002_第2章 废武魂与先天满魂力.md
│       └── 003_第3章 双生武魂.md
├── package.json        # 项目配置
├── wrangler.toml       # Cloudflare配置
└── README.md          # 项目说明
```

## 部署说明

### 1. 准备工作

- 注册 [Cloudflare](https://dash.cloudflare.com) 账号
- 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
```

### 2. 本地开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev
```

### 3. 部署到Cloudflare Pages

```bash
# 登录Cloudflare
wrangler login

# 部署
npm run deploy
```

## 使用说明

### 添加新小说

1. 在 `novels/` 目录下创建新文件夹：`novels/小说名称/`
2. 上传章节文件，命名格式：`001_章节标题.md`
3. 重新部署即可看到新小说

### 文件命名规则

- 使用 `001_章节标题.md` 格式
- 前缀数字用于排序（001, 002, 003...）
- 支持中英文标题
- 文件内容为Markdown格式

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **后端**: Cloudflare Pages Functions (支持Node.js文件系统)
- **部署**: Cloudflare Pages

## 浏览器支持

- Chrome (推荐)
- Safari
- Firefox
- Edge
- 其他现代浏览器

## 移动端优化

- 响应式设计，完美适配各种屏幕尺寸
- 触摸友好的交互设计
- 优化的字体大小和行间距
- 支持左右滑动翻页
- 沉浸式阅读体验

## 本地开发测试

项目已包含斗罗大陆前三章作为示例，可直接本地测试：

1. 运行 `npm run dev`
2. 访问 `http://localhost:8788`
3. 点击"小说阅读"即可开始阅读

## 许可证

MIT License