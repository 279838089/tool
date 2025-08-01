/**
 * 全局中间件：设置 CORS、基本安全头与缓存策略
 */
export const onRequest = async ({ request, next }) => {
  const res = await next();

  const url = new URL(request.url);
  const isApi = url.pathname.startsWith('/api/');

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