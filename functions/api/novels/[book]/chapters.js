/**
 * GET /api/novels/:book/chapters
 * 使用 import.meta.glob 在构建期收集 novels 下的 Markdown，运行时零 fs/Deno 依赖
 * 响应：{ book, chapters: [{ slug, title }] }
 */
export async function onRequestGet(context) {
  const { params } = context;
  const book = params.book || '';
  if (!book) return json({ error: 'Missing book' }, 400);

  try {
    // 通过 Vite/ESBuild 的 import.meta.glob 在构建期把文件内联为模块字符串
    // 注意：路径以项目根为基准，匹配 novels/**/* .md
    const files = import.meta.glob('/novels/**/*.md', { as: 'raw', eager: true });

    // 过滤到指定 book 子目录，并提取文件名作为 slug
    const prefix = `/novels/${book}/`;
    const out = [];
    for (const fullPath in files) {
      if (!fullPath.startsWith(prefix)) continue;
      const slug = fullPath.substring(prefix.length);
      if (!slug.toLowerCase().endsWith('.md')) continue;
      out.push({ slug, title: deriveTitleFromFilename(slug) });
    }

    const sorted = dedupAndSort(out);
    return json({ book, chapters: sorted });
  } catch (err) {
    console.error('[api/novels/:book/chapters] glob error:', err);
    return json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500);
  }
}

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