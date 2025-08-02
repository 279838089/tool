/**
 * 全局中间件：设置 CORS、基本安全头与缓存策略，并兜底重写到 /index.html（用于 SPA）
 */
export const onRequest = async ({ request, next }) => {
  // 先执行正常的函数/静态资产解析
  let res = await next();

  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/');
  const isGetLike = request.method === 'GET' || request.method === 'HEAD';

  // 若未命中（404）且是非 API 的 GET/HEAD 请求，则兜底到 /index.html
  if ((!res || res.status === 404) && isGetLike && !isApi) {
    const indexUrl = new URL('/index.html', url.origin);
    const rewritten = new Request(indexUrl.toString(), request);
    const fallback = await fetch(rewritten);
    if (fallback && fallback.ok) {
      res = fallback;
    }
  }

  // 统一设置响应头
  const headers = new Headers(res.headers);

  // CORS（允许同源与预览）
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');

  // 缓存：API 不缓存，静态可由 Pages 处理
  if (isApi) headers.set('cache-control', 'no-store');

  // 基本安全头
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'SAMEORIGIN');

  return new Response(res.body, { status: res.status, headers });
};