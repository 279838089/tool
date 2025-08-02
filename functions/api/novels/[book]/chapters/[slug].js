/**
 * GET /api/novels/:book/chapters/:slug
 * 使用 import.meta.glob 在构建期内联所有 Markdown，运行时零 fs/Deno
 * 响应：{ book, slug, title, index, total, content }
 */
export async function onRequestGet(context) {
  const { params } = context;
  const book = params.book || '';
  const slug = params.slug || '';
  if (!book || !slug) return json({ error: 'Missing params' }, 400);

  try {
    // 收集所有 markdown 原文：key 为绝对路径，value 为字符串（内容）
    const files = import.meta.glob('/novels/**/*.md', { as: 'raw', eager: true });

    const dirPrefix = `/novels/${book}/`;
    const fullPath = `${dirPrefix}${slug}`;
    const content = files[fullPath];
    if (typeof content !== 'string') {
      return json({ error: 'Chapter not found' }, 404);
    }

    // 计算该书的章节列表，用于 index/total
    const chapters = Object.keys(files)
      .filter(p => p.startsWith(dirPrefix) && p.toLowerCase().endsWith('.md'))
      .map(p => p.substring(dirPrefix.length))
      .sort((a, b) => compareByPrefixNumber(a, b));

    const index = Math.max(0, chapters.findIndex(n => n === slug));
    const total = chapters.length || 1;
    const title = deriveTitleFromFilename(slug);

    return json({ book, slug, title, index, total, content });
  } catch (err) {
    console.error('[api/novels/:book/chapters/:slug] glob error:', err);
    return json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500);
  }
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