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
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    const ext = path.extname(filePath);
    const contentType = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.html': 'text/html'
    }[ext] || 'text/plain';
    
    return new Response(content, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    return new Response('File not found', { status: 404 });
  }
}

async function handleAPI(pathname) {
  // 获取小说列表
  if (pathname === '/api/novels') {
    const novels = getNovels();
    return new Response(JSON.stringify(novels), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取小说章节列表
  if (pathname.startsWith('/api/novel/')) {
    const novelName = decodeURIComponent(pathname.split('/')[3]);
    const chapters = getChapters(novelName);
    return new Response(JSON.stringify(chapters), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 获取章节内容
  if (pathname.startsWith('/api/chapter/')) {
    const parts = pathname.split('/');
    const novelName = decodeURIComponent(parts[3]);
    const chapterFile = decodeURIComponent(parts[4]);
    const content = getChapterContent(novelName, chapterFile);
    return new Response(JSON.stringify(content), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}

async function handlePage(pathname) {
  // 主页
  if (pathname === '/' || pathname === '/index.html') {
    return new Response(getHomePage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 小说列表页
  if (pathname === '/novels') {
    return new Response(getNovelsPage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 小说阅读页
  if (pathname.startsWith('/novel/')) {
    const parts = pathname.split('/');
    const novelName = decodeURIComponent(parts[2]);
    const chapterFile = parts[3] ? decodeURIComponent(parts[3]) : null;
    return new Response(getReaderPage(novelName, chapterFile), {
      headers: { 'Content-Type': 'text/html' }
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
    const filePath = path.join(process.cwd(), 'novels', novelName, chapterFile);
    if (!fs.existsSync(filePath)) {
      return { error: 'Chapter not found' };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      title: chapterFile.replace(/^\d+_/, '').replace(/\.md$/, ''),
      content: content.trim()
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
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${novelName} - 移动端阅读</title>
    <link rel="stylesheet" href="/static/reader.css">
</head>
<body>
    <div class="reader-container">
        <header class="reader-header">
            <a href="/novels" class="back-btn">←</a>
            <h1 id="novel-title">${novelName}</h1>
            <button id="menu-btn" class="menu-btn">☰</button>
        </header>
        
        <div class="chapter-content" id="chapter-content">
            <div class="loading">加载中...</div>
        </div>
        
        <div class="reader-footer">
            <button id="prev-btn" class="nav-btn" disabled>上一章</button>
            <span id="chapter-title" class="chapter-title"></span>
            <button id="next-btn" class="nav-btn" disabled>下一章</button>
        </div>
        
        <div id="toc-overlay" class="toc-overlay">
            <div class="toc-panel">
                <div class="toc-header">
                    <h3>目录</h3>
                    <button id="close-toc" class="close-btn">×</button>
                </div>
                <div id="toc-list" class="toc-list"></div>
            </div>
        </div>
    </div>
    
    <script>
        window.NOVEL_NAME = '${novelName}';
        window.CHAPTER_FILE = '${chapterFile}';
    </script>
    <script src="/static/reader.js"></script>
</body>
</html>`;
}