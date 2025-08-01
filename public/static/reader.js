function qs(sel, root = document) { return root.querySelector(sel); }
function getQuery(k) { return new URL(location.href).searchParams.get(k) || ''; }
function encodePath(p) { return encodeURIComponent(p).replace(/%2F/g, '/'); }

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function naturalKey(name) {
  const m = name.match(/^(\d+)[^\d]?/);
  const n = m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  return [n, name.toLowerCase()];
}

function sortChapters(list) {
  const dedup = new Map();
  for (const it of list) {
    if (!dedup.has(it.slug)) dedup.set(it.slug, it);
  }
  return Array.from(dedup.values()).sort((a, b) => {
    const ka = naturalKey(a.slug);
    const kb = naturalKey(b.slug);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1].localeCompare(kb[1]);
  });
}

function persist(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function restore(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}

async function main() {
  const book = getQuery('book');
  const slugParam = getQuery('chapter');
  if (!book) {
    alert('缺少参数 book');
    history.replaceState(null, '', '/');
    return;
  }

  qs('#backBtn').addEventListener('click', () => {
    history.length > 1 ? history.back() : (location.href = '/');
  });

  qs('#toggleMenu').addEventListener('click', () => {
    qs('#panel').classList.toggle('hidden');
  });

  const prefKey = `reader-pref:${book}`;
  const posKey = `reader-pos:${book}`;
  const pref = restore(prefKey, { dark: false, font: 18 });
  const pos = restore(posKey, { index: 0 });

  if (pref.dark) document.body.classList.add('dark');
  document.documentElement.style.setProperty('--font-size', `${pref.font}px`);
  qs('#darkMode').checked = !!pref.dark;
  qs('#fontSizeVal').textContent = String(pref.font);

  qs('#darkMode').addEventListener('change', (e) => {
    const on = e.target.checked;
    document.body.classList.toggle('dark', on);
    pref.dark = on; persist(prefKey, pref);
  });
  qs('#fontInc').addEventListener('click', () => {
    pref.font = Math.min(28, (pref.font || 18) + 1);
    document.documentElement.style.setProperty('--font-size', `${pref.font}px`);
    qs('#fontSizeVal').textContent = String(pref.font);
    persist(prefKey, pref);
  });
  qs('#fontDec').addEventListener('click', () => {
    pref.font = Math.max(14, (pref.font || 18) - 1);
    document.documentElement.style.setProperty('--font-size', `${pref.font}px`);
    qs('#fontSizeVal').textContent = String(pref.font);
    persist(prefKey, pref);
  });

  qs('#bookTitle').textContent = book;

  // 兼容本地回退：如果 chapters 为空，尝试构建静态目录用于演示
  function fallbackChaptersFor(book) {
    if (book === '斗罗大陆') {
      return [
        { slug: '001_第1章 斗罗大陆，异界唐三.md', title: '第1章 斗罗大陆，异界唐三' },
        { slug: '002_第2章 废武魂与先天满魂力.md', title: '第2章 废武魂与先天满魂力' },
        { slug: '003_第3章 双生武魂.md', title: '第3章 双生武魂' },
      ];
    }
    if (book === '斗罗外传') {
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

  const tocData = await fetchJSON(`/api/novels/${encodeURIComponent(book)}/chapters`).catch(() => ({ chapters: [] }));
  let chapters = sortChapters(tocData.chapters || []);
  if (chapters.length === 0) {
    // 使用前端静态回退，避免“该书暂无章节”
    chapters = sortChapters(fallbackChaptersFor(book));
  }
  if (chapters.length === 0) {
    qs('#content').innerHTML = '<p style="color:#888">该书暂无章节。</p>';
    return;
  }

  let index = 0;
  if (slugParam) {
    const idx = chapters.findIndex(c => c.slug === slugParam);
    index = idx >= 0 ? idx : 0;
  } else if (typeof pos.index === 'number') {
    index = Math.min(Math.max(0, pos.index), chapters.length - 1);
  }

  async function loadByIndex(i) {
    index = Math.min(Math.max(0, i), chapters.length - 1);
    const cur = chapters[index];

    // 先尝试真实接口，失败则用占位内容
    let data;
    try {
      data = await fetchJSON(`/api/novels/${encodeURIComponent(book)}/chapters/${encodeURIComponent(cur.slug)}`);
    } catch {
      data = {
        book,
        slug: cur.slug,
        title: cur.title || cur.slug,
        content: `# ${cur.title || cur.slug}\n\n（本地回退示例内容）\n\n请部署到 Cloudflare Pages 或启用兼容的本地 fs/Deno 能力以读取真实 Markdown。`,
        index,
        total: chapters.length,
      };
    }

    const title = data.title || cur.title || cur.slug;
    qs('#chapterTitle').textContent = title;
    qs('#progress').textContent = `${index + 1} / ${chapters.length}`;

    const md = (data.content || '').replace(/\r\n/g, '\n');
    const html = window.marked.parse(md);
    qs('#content').innerHTML = html;

    persist(posKey, { index });

    const url = new URL(location.href);
    url.searchParams.set('book', book);
    url.searchParams.set('chapter', cur.slug);
    history.replaceState(null, '', url.toString());

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  qs('#prevBtn').addEventListener('click', () => {
    if (index > 0) loadByIndex(index - 1);
  });
  qs('#nextBtn').addEventListener('click', () => {
    if (index < chapters.length - 1) loadByIndex(index + 1);
  });

  qs('#reader').addEventListener('click', (e) => {
    const x = e.clientX, w = window.innerWidth;
    if (x < w * 0.33) {
      if (index > 0) loadByIndex(index - 1);
    } else if (x > w * 0.67) {
      if (index < chapters.length - 1) loadByIndex(index + 1);
    } else {
      qs('#panel').classList.toggle('hidden');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') qs('#prevBtn').click();
    if (e.key === 'ArrowRight') qs('#nextBtn').click();
  });

  await loadByIndex(index);
}

document.addEventListener('DOMContentLoaded', () => {
  main().catch(err => {
    console.error(err);
    qs('#content').innerHTML = '<p style="color:#d00">加载失败，请稍后再试。</p>';
  });
});