/**
 * Cloudflare Workers (Modules) - 单 Worker 同时服务静态与 API
 * - 静态资源：通过 assets = "public" 提供
 * - API 从 ASSETS 读取 public/novels 下的 Markdown（不依赖 import.meta.glob）
 * - SPA 兜底：非 /api/** 的 GET/HEAD 404 时回退到 /index.html
 *
 * 注意：URL 编码与文件名匹配
 * - 书名与 slug 在 URL 中可能被编码（如空格 → %20，中文已编码）
 * - 资产路径必须使用与 public/novels 下完全一致的文件名
 * - 某些托管环境（如 *.workers.dev）默认不注入 env.ASSETS，此时需 fallback 到同域静态路径（/novels/...）
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return withCommonHeaders(new Response(null, { status: 204 }));
    }

    try {
      // API 路由
      if (pathname === '/api/novels') {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return json({ error: 'Method Not Allowed' }, 405);
        }
        const res = await apiListBooksFromAssets(env, url);
        return withCommonHeaders(res, true);
      }

      {
        const m = pathname.match(/^\/api\/novels\/([^/]+)\/chapters\/?$/);
        if (m) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return json({ error: 'Method Not Allowed' }, 405);
          }
          const book = decodeURIComponent(m[1]);
          const res = await apiListChaptersFromAssets(env, url, book);
          return withCommonHeaders(res, true);
        }
      }

      {
        const m = pathname.match(/^\/api\/novels\/([^/]+)\/chapters\/(.+)$/);
        if (m) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            return json({ error: 'Method Not Allowed' }, 405);
          }
          const book = decodeURIComponent(m[1]);
          const slug = decodeURIComponent(m[2]);
          const res = await apiReadChapterFromAssets(env, url, book, slug);
          return withCommonHeaders(res, true);
        }
      }

      // 静态资源：兼容 Pages Functions/Workers 不注入 env.ASSETS 的场景
      const isGetLike = request.method === 'GET' || request.method === 'HEAD';
      const isApi = pathname.startsWith('/api/');

      // 如果请求命中 /novels 前缀，直接透传到同域静态路径，避免依赖 env.ASSETS
      if (isGetLike && !isApi && pathname.startsWith('/novels/')) {
        const direct = await fetch(request);
        if (direct && direct.ok) {
          return withCommonHeaders(direct, false);
        }
        // 若直取失败，再尝试 SPA 兜底
        const rewritten = new Request(new URL('/index.html', url.origin), request);
        const fallback = await fetch(rewritten);
        return withCommonHeaders(fallback, false);
      }

      // 其它静态资源：优先 ASSETS，其次同域 fetch
      let res;
      if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        res = await env.ASSETS.fetch(request);
      } else {
        res = await fetch(request);
      }

      // SPA 兜底：非 API 的 GET/HEAD 且 404 时回退到 /index.html
      if ((!res || res.status === 404) && isGetLike && !isApi) {
        const rewritten = new Request(new URL('/index.html', url.origin), request);
        if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
          res = await env.ASSETS.fetch(rewritten);
        } else {
          res = await fetch(rewritten);
        }
      }

      return withCommonHeaders(res, false);
    } catch (err) {
      console.error('Worker error:', err);
      // 输出更多上下文，帮助定位 500 根因（如资产路径/编码问题）
      return withCommonHeaders(
        json(
          {
            error: 'Internal Error',
            detail: String(err?.stack || err),
            hint: '检查 public/novels 是否已生成并部署，slug 是否与 index.json 完全一致（空格/中文/标点），以及静态直链能否 200',
          },
          500
        ),
        true
      );
    }
  },
};

/* ---------------- 从 ASSETS 读取 novels ----------------
   约定：将仓库 novels/ 复制到 public/novels/ 一并部署
   例如：public/novels/斗罗大陆/001_...md
*/

async function apiListBooksFromAssets(env, baseUrl) {
  // 不能列目录，只能基于已知索引文件：public/novels/index.json
  // 若不存在则退化为从两本示例书名推断（与原逻辑一致）
  const index = await fetchAssetJson(env, baseUrl, '/novels/index.json').catch(() => null);
  let books = Array.isArray(index?.books) ? index.books : ['斗罗大陆', '斗罗外传'];
  books = books.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }));
  return json({ books });
}

async function apiListChaptersFromAssets(env, baseUrl, book) {
  // 读取每本书的索引：public/novels/{book}/index.json，包含章节文件名顺序
  const idxPath = `/novels/${encodeURIComponent(book)}/index.json`;
  const idx = await fetchAssetJson(env, baseUrl, idxPath).catch(() => null);

  let files = Array.isArray(idx?.chapters) ? idx.chapters : [];
  files = files
    .filter(name => typeof name === 'string' && name.toLowerCase().endsWith('.md'))
    .sort((a, b) => compareByPrefixNumber(a, b));

  // 同步提供一个 normalizedSlug，供前端或调用方用于构造稳健的 API 路径
  const out = files.map(file => ({
    slug: file,
    normalizedSlug: encodeURIComponent(decodeURIComponent(file)),
    title: deriveTitleFromFilename(file),
  }));

  // 为避免 double-encode，将 normalizedSlug 仅用于 API 路径片段展示；实际比较使用 decode 后小写
  const chapters = out.sort((a, b) => compareByPrefixNumber(a.slug, b.slug));
  return json({ book, chapters });
}

async function apiReadChapterFromAssets(env, baseUrl, book, slug) {
  // 读取索引，准备匹配
  const idxPath = `/novels/${encodeURIComponent(book)}/index.json`;
  const idx = await fetchAssetJson(env, baseUrl, idxPath).catch(() => null);
  let files = Array.isArray(idx?.chapters) ? idx.chapters : [];
  files = files
    .filter(name => typeof name === 'string' && name.toLowerCase().endsWith('.md'))
    .sort((a, b) => compareByPrefixNumber(a, b));

  // 规范 slug：避免 URL 中的空格以 + 形式传递导致 decode 差异
  // 浏览器在 query 中常把空格编码为 +，部分网关也可能把 path 中的 %20 变成 +，这里统一将 + 视为空格再解码
  const normalizeForCompare = (s) => decodeURIComponent(s.replace(/\+/g, ' ')).toLowerCase();

  const wanted = normalizeForCompare(slug);
  // 先进行严格等值（规范化后）匹配
  let matched = files.find(name => normalizeForCompare(name) === wanted);

  // 若未命中，再尝试更宽松的匹配：去掉多余的下划线/空白再比对（缓解不同构建命名差异）
  if (!matched) {
    const loose = (s) => normalizeForCompare(s).replace(/[\s_]+/g, ' ');
    const lw = loose(slug);
    matched = files.find(name => loose(name) === lw);
  }

  // 仍未命中则返回 404
  if (!matched) {
    return json({ error: 'Chapter not found' }, 404);
  }

  // 构造实际读取路径（逐段编码由 fetchAsset 处理）
  const chapterPath = `/novels/${encodeURIComponent(book)}/${matched}`;
  const res = await fetchAsset(env, baseUrl, chapterPath);
  if (!res || !res.ok) return json({ error: 'Chapter not found' }, 404);

  const content = await res.text();

  const index = Math.max(0, files.findIndex(n => n === matched));
  const total = files.length || 1;
  const title = deriveTitleFromFilename(matched);

  // 同时回写 normalizedSlug，便于前端以后直接使用规范化路径
  const normalizedSlug = encodeURIComponent(decodeURIComponent(matched));
  return json({ book, slug: matched, normalizedSlug, title, index, total, content });
}

/* ---------------- 资产读取工具 ---------------- */

async function fetchAsset(env, baseUrl, assetPath) {
  // assetPath 必须以 / 开头，且相对 public 根
  const url = new URL(assetPath, baseUrl);

  // 确保 pathname 段编码与文件名一致（例如空格 -> %20，中文保持编码）
  const parts = url.pathname.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(decodeURIComponent(seg))));
  url.pathname = parts.join('/');

  const req = new Request(url.toString(), { method: 'GET' });

  // 兼容两种运行环境：
  // 1) 本地/某些打包场景：env.ASSETS 可能不可用，直接回退 global fetch 读取同域静态路径
  // 2) 生产 Workers：优先通过 env.ASSETS.fetch 提供的静态资产
  if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(req);
  }
  return fetch(req);
}

async function fetchAssetJson(env, baseUrl, assetPath) {
  // 允许 assetPath 包含已编码片段，确保与静态目录逐字匹配
  const res = await fetchAsset(env, baseUrl, assetPath);
  if (!res || !res.ok) {
    // 额外一次尝试：对可能未编码的段落进行 encode 以兼容其它运行时
    try {
      const url = new URL(assetPath, baseUrl);
      // 仅对 pathname 做一次规范化编码（逐段编码，保留斜杠）
      const parts = url.pathname.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(decodeURIComponent(seg))));
      url.pathname = parts.join('/');
      const retry = await fetchAsset(env, baseUrl, url.pathname);
      if (!retry || !retry.ok) throw new Error(`asset not found: ${assetPath}`);
      return retry.json();
    } catch {
      throw new Error(`asset not found: ${assetPath}`);
    }
  }
  return res.json();
}

/* ---------------- 工具函数 ---------------- */

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