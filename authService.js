const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}

export async function register(request, env) {
  const { email, password, inviteCode } = await safeJson(request);

  if (!email || !password || !inviteCode) {
    return json(request, { error: '缺少必要字段' }, 400);
  }

  if (!emailPattern.test(email)) {
    return json(request, { error: '邮箱格式不正确' }, 422);
  }

  if (password.length < 6) {
    return json(request, { error: '密码至少需要 6 位字符' }, 422);
  }

  const invite = await env.DB.prepare(
    'SELECT code, used FROM invites WHERE code = ?'
  ).bind(inviteCode.trim()).first();

  if (!invite) {
    return json(request, { error: '邀请码不存在' }, 404);
  }

  if (invite.used) {
    return json(request, { error: '邀请码已被使用' }, 409);
  }

  const lowerEmail = email.toLowerCase();

  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(lowerEmail).first();

  if (existing) {
    return json(request, { error: '该邮箱已注册' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const nowIso = new Date().toISOString();

  const inviteUpdate = await env.DB.prepare(
    'UPDATE invites SET used = 1, used_by = ?, used_at = ? WHERE code = ? AND used = 0'
  ).bind(lowerEmail, nowIso, inviteCode.trim()).run();

  if (!inviteUpdate.success || inviteUpdate.meta.changes === 0) {
    return json(request, { error: '邀请码已被使用' }, 409);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)'
    ).bind(lowerEmail, passwordHash, nowIso).run();
  } catch (err) {
    await env.DB.prepare(
      'UPDATE invites SET used = 0, used_by = NULL, used_at = NULL WHERE code = ?'
    ).bind(inviteCode.trim()).run();
    throw err;
  }

  return json(request, { success: true, message: '注册成功，请登录' }, 201);
}

export async function login(request, env) {
  const { email, password } = await safeJson(request);

  if (!email || !password) {
    return json(request, { error: '缺少必要字段' }, 400);
  }

  const lowerEmail = email.toLowerCase();
  const user = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  ).bind(lowerEmail).first();

  if (!user) {
    return json(request, { error: '邮箱或密码不正确' }, 401);
  }

  const incomingHash = await hashPassword(password);
  if (incomingHash !== user.password_hash) {
    return json(request, { error: '邮箱或密码不正确' }, 401);
  }

  const sessionToken = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionToken, user.id, now.toISOString(), expires.toISOString()).run();

  return json(request, {
    success: true,
    user: { id: user.id, email: user.email }
  }, 200, {
    'Set-Cookie': createCookie(sessionToken, expires)
  });
}

export async function logout(request, env) {
  const { token } = await resolveSession(request, env);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }

  const expired = new Date(0);
  return json(request, { success: true }, 200, {
    'Set-Cookie': createCookie('', expired)
  });
}

export async function session(request, env) {
  const { user } = await resolveSession(request, env);
  if (!user) {
    return json(request, { authenticated: false });
  }
  return json(request, { authenticated: true, user });
}

export async function resolveSession(request, env) {
  const token = getTokenFromCookie(request.headers.get('Cookie'));
  if (!token) {
    return { token: null, user: null };
  }

  const sessionRow = await env.DB.prepare(
    `SELECT sessions.token, sessions.expires_at, users.id as user_id, users.email
     FROM sessions
     INNER JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`
  ).bind(token).first();

  if (!sessionRow) {
    return { token: null, user: null };
  }

  if (new Date(sessionRow.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(sessionRow.token).run();
    return { token: null, user: null };
  }

  return {
    token: sessionRow.token,
    user: {
      id: sessionRow.user_id,
      email: sessionRow.email
    }
  };
}

export function corsHeaders(request, additional = {}) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  const origin = responseOrigin(request);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return { ...headers, ...additional };
}

export function json(request, data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request, additionalHeaders)
  });
}

export async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function responseOrigin(request) {
  return request.headers.get('Origin') || new URL(request.url).origin;
}

function createCookie(value, expires) {
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  const cookie = [
    `session=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${maxAge}`
  ];
  if (value) {
    cookie.push(`Expires=${expires.toUTCString()}`);
  } else {
    cookie.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  return cookie.join('; ');
}

function getTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(item => item.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith('session=')) {
      return cookie.substring('session='.length);
    }
  }
  return null;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
