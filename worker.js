import {
  handleOptions,
  register,
  login,
  logout,
  session,
  json
} from './authService.js';
import { formatContent } from './formatService.js';

const routes = new Map([
  ['POST /cloud/register', register],
  ['POST /cloud/login', login],
  ['POST /cloud/logout', logout],
  ['GET /cloud/session', session],
  ['POST /cloud/format', formatContent]
]);

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const routeKey = `${request.method.toUpperCase()} ${url.pathname}`;
    const handler = routes.get(routeKey);

    if (!handler) {
      return json(request, { error: 'Not Found' }, 404);
    }

    try {
      return await handler(request, env, ctx);
    } catch (error) {
      console.error('Worker runtime error', error);
      return json(request, { error: 'Internal Server Error' }, 500);
    }
  }
};
