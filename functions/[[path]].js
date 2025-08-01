/**
 * 注意：优先通过原生静态托管返回 /static/* 资源，只有在 Pages 无法命中时才兜底读取。
 * 为规避构建期对 Node 内置模块的静态解析，保留动态导入 node:fs/node:path。
 * 若线上出现 500，请打开 DEBUG_LOG=true 查看错误栈。
 */
let _fs = null;
let _path = null;
async function useNode() {
  if (!_fs) _fs = await import('node:fs');
  if (!_path) _path = await import('node:path');
  return { fs: _fs.default || _fs, path: _path.default || _path };
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 静态资源：严格限定只读取 /static 目录，防止路径穿越；统一规范化路径
  if (url.pathname.startsWith('/static/')) {
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
    const { fs, path } = await useNode();

    // 规范化并强制限定在 /static 根下，防止路径穿越
    const rel = filePath.replace(/^\/+/, ''); // 去掉开头斜杠
    const safeRel = rel.replace(/\\/g, '/');   // 统一分隔符
    if (!safeRel.startsWith('static/')) {
      return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    const fullPath = path.join(process.cwd(), safeRel);
    const staticRoot = path.join(process.cwd(), 'static');

    // 额外校验：确保最终路径仍在 static 目录内
    const isInside = fullPath.startsWith(staticRoot);
    if (!isInside) {
      return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }

    if (!fs.existsSync(fullPath)) {
      return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const isText = ['.css', '.js', '.html', '.svg'].includes(ext);
    const content = isText ? fs.readFileSync(fullPath, 'utf-8') : fs.readFileSync(fullPath);

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
    }[ext] || (isText ? 'text/plain; charset=utf-8' : 'application/octet-stream');

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    if (DEBUG_LOG) console.error('handleStaticFile error:', error?.stack || String(error));
    return new Response('Internal Error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

async function handleAPI(pathname) {
  try {
    if (pathname.endsWith('/')) pathname = pathname.replace(/\/+$/, '');

    // GET /api/novels 读取小说目录
    if (pathname === '/api/novels') {
      const novels = await getNovels();
      return json(novels);
    }

    // GET /api/novels/:novel/chapters
    if (pathname.startsWith('/api/novels/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      // /api/novels/{novel}/chapters
      if (parts.length >= 5 && parts[4] === 'chapters') {
        const novelName = parts[3];
        const chapters = await getChapters(novelName);
        return json(chapters);
      }
    }

    // 兼容旧路径：GET /api/novel/:novel
    if (pathname.startsWith('/api/novel/')) {
      const novelName = decodeURIComponent(pathname.split('/')[3] || '');
      const chapters = await getChapters(novelName);
      return json(chapters);
    }

    // GET /api/novels/:novel/chapters/:file
    if (pathname.startsWith('/api/novels/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      if (parts.length >= 6 && parts[4] === 'chapters') {
        const novelName = parts[3];
        const chapterFile = parts.slice(5).join('/');
        const data = await getChapterContent(novelName, chapterFile);
        return json(data);
      }
    }

    // 兼容旧路径：GET /api/chapter/:novel/:file
    if (pathname.startsWith('/api/chapter/')) {
      const parts = pathname.split('/').map(decodeURIComponent);
      const novelName = parts[3] || '';
      const chapterFile = parts.slice(4).join('/');
      const data = await getChapterContent(novelName, chapterFile);
      return json(data);
    }

    // API 根路径兜底，便于前端健康检查
    if (pathname === '/api' || pathname === '/api/') {
      return json({ ok: true });
    }

    return new Response('Not Found', { status: 404 });
  } catch (e) {
    // 返回可见错误，便于前端显示“暂无小说”而不是一直加载
    return json({ error: e?.message || 'Internal Server Error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// 尝试让原生静态层处理；若无法处理则返回 null 交给本函数兜底
async function tryNativeStatic(filePath) {
  try {
    // 在 Pages Functions 中无法直接“转发”到静态层，这里仅作为占位可扩展。
    // 返回 null 代表继续由 handleStaticFile 读取文件。
    return null;
  } catch {
    return null;
  }
}

// 简易日志开关（可通过临时在代码中置 true 开启）
const DEBUG_LOG = false;

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
async function getNovels() {
  const { fs, path } = await useNode();
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
async function getChapters(novelName) {
  const { fs, path } = await useNode();
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
async function getChapterContent(novelName, chapterFile) {
  const { fs, path } = await useNode();
  try {
    const novelDir = path.join(process.cwd(), 'novels', novelName);
    const files = fs.readdirSync(novelDir).filter(f => f.endsWith('.md'));
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