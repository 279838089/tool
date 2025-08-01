/**
 * GET /api/novels/:book/chapters/:slug
 * 返回指定章节的 Markdown 原文（前端负责渲染）
 * { book, slug, title, index, total, content }
 * 兼容运行时；在本地无 fs 能力时回退静态内容，避免 500。
 */
export async function onRequestGet(context) {
  const { params } = context;
  const book = params.book || '';
  const slug = params.slug || '';
  if (!book || !slug) return json({ error: 'Missing params' }, 400);

  try {
    // 1) Deno 分支
    if (typeof globalThis.Deno !== 'undefined' && Deno.readTextFile && Deno.readDir && Deno.cwd) {
      const dir = joinPath(Deno.cwd(), 'novels', book);
      const filePath = joinPath(dir, slug);

      const content = await Deno.readTextFile(filePath).catch(() => null);
      if (content == null) return json({ error: 'Chapter not found' }, 404);

      const entries = [];
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile) entries.push(entry.name);
      }
      const chapters = dedupSort(entries.filter(n => n.toLowerCase().endsWith('.md')));

      const index = Math.max(0, chapters.findIndex(n => n === slug));
      const total = chapters.length || 1;
      const title = deriveTitleFromFilename(slug);
      return json({ book, slug, title, index, total, content });
    }

    // 2) Node 分支（尝试 fs，失败则静态回退）
    try {
      const fs = await import('node:fs/promises');
      const dir = joinPath((typeof process !== 'undefined' ? process.cwd() : '.'), 'novels', book);
      const filePath = joinPath(dir, slug);

      const content = await fs.readFile(filePath, 'utf-8');
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const entries = dirents.filter(d => d.isFile()).map(d => d.name);
      const chapters = dedupSort(entries.filter(n => n.toLowerCase().endsWith('.md')));

      const index = Math.max(0, chapters.findIndex(n => n === slug));
      const total = chapters.length || 1;
      const title = deriveTitleFromFilename(slug);
      return json({ book, slug, title, index, total, content });
    } catch (_e) {
      // 3) 静态回退：返回示例章节，保证前端可联调
      const fallback = fallbackContent(book, slug);
      if (!fallback) return json({ error: 'Chapter not found' }, 404);
      const { content, index, total, title } = fallback;
      return json({ book, slug, title, index, total, content });
    }
  } catch (err) {
    console.error('[api/novels/:book/chapters/:slug] error:', err);
    return json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500);
  }
}

function joinPath(...segs) {
  return segs.join('/').replace(/\\+/g, '/').replace(/\/+/g, '/');
}

function fallbackContent(book, slug) {
  const toc = {
    '斗罗大陆': [
      '001_第1章 斗罗大陆，异界唐三.md',
      '002_第2章 废武魂与先天满魂力.md',
      '003_第3章 双生武魂.md',
    ],
    '斗罗外传': [
      '001_第1章 史莱克广场.md',
      '002_第2章 千年.md',
      '003_第3章 考核开始.md',
      '004_第4章 教师天团.md',
      '005_第5章 宠坏了爸爸养.md',
    ],
  };
  const list = toc[book];
  if (!list) return null;
  const idx = Math.max(0, list.indexOf(slug));
  const total = list.length;
  const title = deriveTitleFromFilename(slug);
  // 最简占位内容，指示为本地回退
  const content = `# ${title}\n\n（本地回退示例内容）\n\n请部署到 Cloudflare Pages 或启用兼容的本地 fs/Deno 能力以读取真实 Markdown。`;
  return { content, index: idx, total, title };
}

function deriveTitleFromFilename(name) {
  let t = name.replace(/\.md$/i, '');
  const m = t.match(/^\d+[_\-\s]*(.+)$/);
  if (m) t = m[1];
  return t;
}

function dedupSort(list) {
  const set = new Set();
  const arr = [];
  for (const n of list) {
    if (!set.has(n)) {
      set.add(n);
      arr.push(n);
    }
  }
  return arr.sort((a, b) => compareByPrefixNumber(a, b));
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