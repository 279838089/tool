/**
 * Cloudflare Workers (Modules) - 单 Worker 同时服务静态与 API
 * - 静态资源：通过 assets = "public" 由 Wrangler/Workers-Assets 提供
 * - 动态 API：/api/novels、/api/novels/:book/chapters、/api/novels/:book/chapters/:slug
 * - SPA 兜底：非 /api/** 的 GET/HEAD 404 时回退到 /index.html
 */

export default {
  /**
   * 入口：根据路径路由到 API 或静态
   * 依赖 Wrangler 提供的 env.ASSETS.fetch 用于读取 public 目录
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 预检请求直接返回 CORS 头
    if (request.method === 'OPTIONS') {
      return withCommonHeaders(new Response(null, { status: 204 }));
    }

    try {
      // API 路由
      if (pathname === '/api/novels') {
        // GET /api/novels
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return json({ error: 'Method Not Allowed' }, 405);
        }
        const res = await apiListBooks(env);
        return withCommonHeaders(res, true);
      }

      // /api/novels/:book/chapters
      {
        const m = pathname.match(/^\/api\/novels\/([^/]+)\/chapters\/?$/);
        if (m) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return json({ error: 'Method Not Allowed' }, 405);
          }
          const book = decodeURIComponent(m[1]);
          const res = await apiListChapters(book);
          return withCommonHeaders(res, true);
        }
      }

      // /api/novels/:book/chapters/:slug
      {
        const m = pathname.match(/^\/api\/novels\/([^/]+)\/chapters\/(.+)$/);
        if (m) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return json({ error: 'Method Not Allowed' }, 405);
          }
          const book = decodeURIComponent(m[1]);
          const slug = decodeURIComponent(m[2]);
          const res = await apiReadChapter(book, slug);
          return withCommonHeaders(res, true);
        }
      }

      // 非 API：交给静态资源
      let res = await env.ASSETS.fetch(request);

      const isGetLike = request.method === 'GET' || request.method === 'HEAD';
      const isApi = pathname.startsWith('/api/');

      // SPA 兜底：非 API 的 GET/HEAD 且 404 时，回退到 /index.html
      if ((!res || res.status === 404) && isGetLike && !isApi) {
        const rewritten = new Request(new URL('/index.html', url.origin), request);
        res = await env.ASSETS.fetch(rewritten);
      }

      // 统一添加基础响应头（静态默认可缓存，由 CF Assets 控制；此处仅安全与 CORS）
      return withCommonHeaders(res, false);
    } catch (err) {
      console.error('Worker error:', err);
      return withCommonHeaders(json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500), true);
    }
  },
};

/* ---------------- API 实现（基于 import.meta.glob 收集 Markdown） ---------------- */

/**
 * GET /api/novels
 * 返回 { books: string[] }
 * 通过 import.meta.glob 收集 /novels/* 目录名（从文件路径推导）
 */
async function apiListBooks(env) {
  // 收集所有 markdown 文件路径
  const files = import.meta.glob('/novels/**/*.md', { as: 'raw', eager: true });
  const set = new Set();
  for (const fullPath of Object.keys(files)) {
    // 形如 /novels/<book>/xxx.md
    const m = fullPath.match(/^\/novels\/([^/]+)\//);
    if (m) set.add(m[1]);
  }
  const books = Array.from(set.values()).sort((a, b) =>
    a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' })
  );
  return json({ books });
}

/**
 * GET /api/novels/:book/chapters
 * 返回 { book, chapters: [{ slug, title }] }
 */
async function apiListChapters(book) {
  const files = import.meta.glob('/novels/**/*.md', { as: 'raw', eager: true });
  const prefix = `/novels/${book}/`;
  const out = [];
  for (const fullPath of Object.keys(files)) {
    if (!fullPath.startsWith(prefix)) continue;
    const slug = fullPath.substring(prefix.length);
    if (!slug.toLowerCase().endsWith('.md')) continue;
    out.push({ slug, title: deriveTitleFromFilename(slug) });
  }
  const chapters = dedupAndSort(out);
  return json({ book, chapters });
}

/**
 * GET /api/novels/:book/chapters/:slug
 * 返回 { book, slug, title, index, total, content }
 */
async function apiReadChapter(book, slug) {
  const files = import.meta.glob('/novels/**/*.md', { as: 'raw', eager: true });
  const dirPrefix = `/novels/${book}/`;
  const fullPath = `${dirPrefix}${slug}`;
  const content = files[fullPath];
  if (typeof content !== 'string') {
    return json({ error: 'Chapter not found' }, 404);
  }

  const chapters = Object.keys(files)
    .filter((p) => p.startsWith(dirPrefix) && p.toLowerCase().endsWith('.md'))
    .map((p) => p.substring(dirPrefix.length))
    .sort((a, b) => compareByPrefixNumber(a, b));

  const index = Math.max(0, chapters.findIndex((n) => n === slug));
  const total = chapters.length || 1;
  const title = deriveTitleFromFilename(slug);

  return json({ book, slug, title, index, total, content });
}

/* ---------------- 工具函数 ---------------- */

function dedupAndSort(arr) {
  const map = new Map();
  for (const c of arr) if (!map.has(c.slug)) map.set(c.slug, c);
  return Array.from(map.values()).sort((a, b) => compareByPrefixNumber(a.slug, b.slug));
}

function deriveTitleFromFilename(name) {
  let t = name.replace(/\.md$/i, '');
  const m = t.match(/^\d+[_\-\s]*(.+)$/);
  if (m) t = m[1];
  return t;
}

function compareByPrefixNumber(a, b) {
  const ka = naturalKey(a);
  const kb = naturalKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  return ka[1].localeCompare(kb[1], 'zh-CN', { numeric: true, sensitivity: 'base' });
}
function naturalKey(name) {
  const m = name.match(/^(\d+)[^\d]?/);
  const n = m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  return [n, name.toLowerCase()];
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/**
 * 给任意响应附加通用头：
 * - CORS: *
 * - 安全头: X-Content-Type-Options, X-Frame-Options
 * - API 响应强制 no-store（已在 json() 内设置，这里仅确保非 json 响应时同样处理）
 */
function withCommonHeaders(res, isApi = false) {
  const headers = new Headers(res.headers);
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'SAMEORIGIN');
  if (isApi) headers.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers });
}