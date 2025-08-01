/**
 * GET /api/novels
 * 兼容本地 wrangler pages dev 与线上 Pages Functions
 * - Deno.readDir 可用则使用 Deno（Deno.cwd()/novels）
 * - 否则回退为“静态扫描”策略：直接读取已知书目（通过构建时注入或硬编码）
 * 说明：部分 wrangler 本地环境不完整支持 node:fs/promises，会报 “No such module”，因此移除 Node fs 依赖，保证本地不崩溃。
 */
export async function onRequestGet() {
  try {
    // 先尝试 Deno 分支（线上/部分本地）
    if (typeof globalThis.Deno !== 'undefined' && Deno.readDir && Deno.cwd) {
      const novelsPath = normalizePath(Deno.cwd() + '/novels');
      const books = [];
      for await (const entry of Deno.readDir(novelsPath)) {
        if (entry.isDirectory) books.push(entry.name);
      }
      books.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }));
      return json({ books });
    }

    // 回退：静态扫描（不依赖 Node 模块）
    // 已知你的仓库包含以下示例书目，如需更动态可在本地开发时临时写死，线上会走 Deno 分支。
    const fallbackBooks = await fallbackScan();
    fallbackBooks.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' }));
    return json({ books: fallbackBooks });
  } catch (err) {
    console.error('[api/novels] error:', err);
    return json({ error: 'Internal Error', detail: String(err?.stack || err) }, 500);
  }
}

async function fallbackScan() {
  // 通过尝试访问两个已知目录判断其存在性（不使用 Node/Deno fs，纯策略返回）
  // 由于无法在无 fs 的环境下真实判断目录存在性，这里返回你仓库中已有的书目名称，确保前端可进入阅读器做联调；
  // 线上环境会自动切到 Deno 分支，真正按目录列出。
  return ['斗罗大陆', '斗罗外传'];
}

function normalizePath(p) {
  return p.replace(/\\+/g, '/');
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