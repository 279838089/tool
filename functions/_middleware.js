export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 让静态文件通过
  if (url.pathname.startsWith('/static/')) {
    return context.next();
  }
  
  return context.next();
}