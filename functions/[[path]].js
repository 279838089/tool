import fs from 'fs';
import path from 'path';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 静态文件处理
  if (url.pathname.startsWith('/static/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    return handleStaticFile(url.pathname);
  }
  
  // API路由
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(url.pathname);
  }
  
  // 页面路由
  return handlePage(url.pathname);
}

async function handleStaticFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    // 以二进制读取，避免图片/字体等资源损坏
    const content = fs.readFileSync(fullPath);
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';
    
    return new Response(content, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}

async function handleAPI(pathname) {
  try {
    // 统一去除多余斜杠
    if (pathname.endsWith('/')) pathname = pathname.replace(/\/+$/, '');

    // 获取小说列表
    if (pathname === '/api/novels') {
      const novels = getNovels();
      return json(novels);
    }

    // 获取小说章节列表：/api/novels/:novel/chapters
    // 兼容旧路径 /api/novel/:novel
    if (pathname.startsWith('/api/novels/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      // /api/novels/{novel}/chapters
      if (parts.length >= 5 && parts[4] === 'chapters') {
        const novelName = parts.slice(3, 4)[0];
        const chapters = getChapters(novelName);
        return json(chapters);
      }
    }
    if (pathname.startsWith('/api/novel/')) {
      const novelName = decodeURIComponent(pathname.split('/')[3]);
      const chapters = getChapters(novelName);
      return json(chapters);
    }

    // 获取章节内容：/api/novels/:novel/chapters/:file
    // 兼容旧路径 /api/chapter/:novel/:file
    if (pathname.startsWith('/api/novels/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      // /api/novels/{novel}/chapters/{file}
      if (parts.length >= 6 && parts[4] === 'chapters') {
        const novelName = parts[3];
        const chapterFile = parts.slice(5).join('/'); // 避免文件名内含斜杠被错误拆分
        const data = getChapterContent(novelName, chapterFile);
        return json(data);
      }
    }
    if (pathname.startsWith('/api/chapter/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      const novelName = parts[3];
      const chapterFile = parts.slice(4).join('/');
      const data = getChapterContent(novelName, chapterFile);
      return json(data);
    }

    return new Response('Not Found', { status: 404 });
  } catch (e) {
    return json({ error: 'Internal Server Error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function handlePage(pathname) {
  // 主页
  if (pathname === '/' || pathname === '/index.html') {
    return new Response(getHomePage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 小说列表页
  if (pathname === '/novels') {
    return new Response(getNovelsPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 小说阅读页
  if (pathname.startsWith('/novel/')) {
    const parts = pathname.split('/');
    const novelName = decodeURIComponent(parts[2] || '');
    const chapterFile = parts.length > 3 ? decodeURIComponent(parts.slice(3).join('/')) : '';
    return new Response(getReaderPage(novelName, chapterFile), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}

// 获取小说列表
function getNovels() {
  try {
    const novelsDir = path.join(process.cwd(), 'novels');
    if (!fs.existsSync(novelsDir)) {
      return [];
    }
    
    const items = fs.readdirSync(novelsDir, { withFileTypes: true });
    const novels = items
      .filter(item => item.isDirectory())
      .map(dir => ({
        name: dir.name,
        url: `/novel/${encodeURIComponent(dir.name)}`
      }));
    
    return novels;
  } catch (error) {
    console.error('Error getting novels:', error);
    return [];
  }
}

// 获取章节列表
function getChapters(novelName) {
  try {
    const novelDir = path.join(process.cwd(), 'novels', novelName);
    if (!fs.existsSync(novelDir)) {
      return [];
    }
    
    const files = fs.readdirSync(novelDir);
    const chapters = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const match = file.match(/^(\d+)_/);
        const order = match ? parseInt(match[1]) : 999;
        
        return {
          fileName: file,
          title: file.replace(/^\d+_/, '').replace(/\.md$/, ''),
          order,
          url: `/novel/${encodeURIComponent(novelName)}/${encodeURIComponent(file)}`
        };
      })
      .sort((a, b) => a.order - b.order);
    
    return chapters;
  } catch (error) {
    console.error('Error getting chapters:', error);
    return [];
  }
}

// 获取章节内容
function getChapterContent(novelName, chapterFile) {
  try {
    const novelDir = path.join(process.cwd(), 'novels', novelName);
    const files = fs.readdirSync(novelDir).filter(f => f.endsWith('.md'));
    // 排序，提取相邻章节
    const chapters = files.map(file => {
      const match = file.match(/^(\d+)_/);
      const order = match ? parseInt(match[1], 10) : 999999;
      return { fileName: file, title: file.replace(/^\d+_/, '').replace(/\.md$/, ''), order };
    }).sort((a, b) => a.order - b.order);

    const targetIndex = chapters.findIndex(c => c.fileName === chapterFile);
    const filePath = path.join(novelDir, chapterFile);

    if (targetIndex === -1 || !fs.existsSync(filePath)) {
      return { error: 'Chapter not found' };
    }

    const raw = fs.readFileSync(filePath, 'utf-8').trim();

    return {
      title: chapters[targetIndex].title,
      content: raw,
      prev: targetIndex > 0 ? chapters[targetIndex - 1].fileName : null,
      next: targetIndex < chapters.length - 1 ? chapters[targetIndex + 1].fileName : null
    };
  } catch (error) {
    console.error('Error getting chapter content:', error);
    return { error: 'Failed to load chapter' };
  }
}

// 主页HTML
function getHomePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>工具合集 - 移动端</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>工具合集</h1>
        </header>
        <main>
            <div class="tool-grid">
                <a href="/novels" class="tool-card">
                    <div class="tool-icon">📚</div>
                    <h3>小说阅读</h3>
                    <p>本地小说在线阅读</p>
                </a>
            </div>
        </main>
    </div>
</body>
</html>`;
}

// 小说列表页HTML
function getNovelsPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>小说列表 - 移动端</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div class="container">
        <header>
            <a href="/" class="back-btn">←</a>
            <h1>小说列表</h1>
        </header>
        <main>
            <div id="novels-list" class="novels-list">
                <div class="loading">加载中...</div>
            </div>
        </main>
    </div>
    <script src="/static/novels.js"></script>
</body>
</html>`;
}

// 阅读页HTML
function getReaderPage(novelName, chapterFile) {
  // 允许直接进入 /novel/:name 时默认定位到第一章（前端也有兜底）
  const safeNovel = (novelName || '').replace(/</g, '<').replace(/>/g, '>');
  const safeChapter = (chapterFile || '').replace(/</g, '<').replace(/>/g, '>');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>${safeNovel} - 移动端阅读</title>
    <link rel="stylesheet" href="/static/reader.css">
</head>
<body>
    <div class="reader-container">
        <header class="reader-header">
            <a href="/novels" class="back-btn" aria-label="返回">←</a>
            <h1 id="novel-title">${safeNovel}</h1>
            <button id="menu-btn" class="menu-btn" aria-label="目录">☰</button>
        </header>
        
        <div class="chapter-content" id="chapter-content" role="main">
            <div class="loading">加载中...</div>
        </div>
        
        <div class="reader-footer">
            <button id="prev-btn" class="nav-btn" disabled>上一章</button>
            <span id="chapter-title" class="chapter-title" aria-live="polite"></span>
            <button id="next-btn" class="nav-btn" disabled>下一章</button>
        </div>
        
        <div id="toc-overlay" class="toc-overlay" aria-hidden="true">
            <div class="toc-panel">
                <div class="toc-header">
                    <h3>目录</h3>
                    <button id="close-toc" class="close-btn" aria-label="关闭目录">×</button>
                </div>
                <div id="toc-list" class="toc-list"></div>
            </div>
        </div>
    </div>
    
    <script>
        window.NOVEL_NAME = '${safeNovel}';
        window.CHAPTER_FILE = '${safeChapter}';
    </script>
    <script src="/static/reader.js"></script>
</body>
</html>`;
}