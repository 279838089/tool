/**
 * GET /api/novels/:book/chapters
 * 列出某本书的章节（Markdown 文件），返回 { chapters: [{ slug, title }] }
 * 兼容：若本地环境不支持 fs/Deno，则回退静态目录表，避免 500。
 */
export async function onRequestGet(context) {
  const { params } = context;
  const book = params.book || '';
  if (!book) return json({ error: 'Missing book' }, 400);

  try {
    // 1) Deno 分支
    if (typeof globalThis.Deno !== 'undefined' && Deno.readDir && Deno.cwd) {
      const dir = joinPath(Deno.cwd(), 'novels', book);
      const out = [];
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && entry.name.toLowerCase().endsWith('.md')) {
          out.push({ slug: entry.name, title: deriveTitleFromFilename(entry.name) });
        }
      }
      const sorted = dedupAndSort(out);
      return json({ book, chapters: sorted });
    }

    // 2) Node 分支（如不可用 fs，则捕获并回退）
    try {
      const fs = await import('node:fs/promises');
      const dir = joinPath((typeof process !== 'undefined' ? process.cwd() : '.'), 'novels', book);
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const out = dirents
        .filter(d => d.isFile())
        .map(d => d.name)
        .filter(n => n.toLowerCase().endsWith('.md'))
        .map(name => ({ slug: name, title: deriveTitleFromFilename(name) }));
      const sorted = dedupAndSort(out);
      return json({ book, chapters: sorted });
    } catch (_e) {
      // 3) 回退静态（本地 dev 无 fs 能力时）
      return json({ book, chapters: fallbackChapters(book) });
    }
  } catch (err) {
    console.error('[api/novels/:book/chapters] error:', err);
    return json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500);
  }
}

function joinPath(...segs) {
  return segs.join('/').replace(/\\+/g, '/').replace(/\/+/g, '/');
}

function fallbackChapters(book) {
  // 用仓库中已知的样本作为本地 dev 的静态目录，线上会走 Deno 分支拿真实目录
  if (book === '斗罗大陆') {
    return [
      { slug: '001_第1章 斗罗大陆，异界唐三.md', title: '第1章 斗罗大陆，异界唐三' },
      { slug: '002_第2章 废武魂与先天满魂力.md', title: '第2章 废武魂与先天满魂力' },
      { slug: '003_第3章 双生武魂.md', title: '第3章 双生武魂' },
    ];
  }
  if (book === '斗罗外传') {
    // 只列出前若干章，足够联调
    return [
      { slug: '001_第1章 史莱克广场.md', title: '第1章 史莱克广场' },
      { slug: '002_第2章 千年.md', title: '第2章 千年' },
      { slug: '003_第3章 考核开始.md', title: '第3章 考核开始' },
      { slug: '004_第4章 教师天团.md', title: '第4章 教师天团' },
      { slug: '005_第5章 宠坏了爸爸养.md', title: '第5章 宠坏了爸爸养' },
    ];
  }
  return [];
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