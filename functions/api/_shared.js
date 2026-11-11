/**
 * Shared helpers - AlAlfi school API (Cloudflare Pages Functions)
 * Storage: D1 (SQLite) for users, sessions and content.
 */

export const ALLOWED_ORIGINS = ['https://alalfi-school.pages.dev'];
export const SESSION_HOURS = 8;          // auto logout after this
export const CONTENT_KEYS = [
  'settings', 'about', 'news', 'events', 'programs',
  'gallery', 'staff', 'leaders', 'media',
];

export function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Token, X-Session',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

export function json(body, status, request) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, ...corsHeaders(request || { headers: {} }) },
  });
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then((res) => {
    const view = (res && res.buffer && !(res instanceof ArrayBuffer))
      ? new Uint8Array(res.buffer)
      : new Uint8Array(res);
    let hex = '';
    for (let i = 0; i < view.length; i++) hex += (view[i] & 0xff).toString(16).padStart(2, '0');
    return hex;
  });
}

/** hash = sha256(salt + '::' + password) */
export function hashPassword(password, salt) {
  return sha256Hex(salt + '::' + password);
}

export async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

export function noDb(env, request) {
  if (env.ALALFI_DB) return null;
  return json({ ok: false, error: 'database binding missing (ALALFI_DB)' }, 500, request);
}

/* ---------------- session helpers ---------------- */

export function sessionToken(request) {
  return request.headers.get('X-Session') || '';
}

export async function getSessionUser(env, request) {
  const token = sessionToken(request);
  if (!token || !env.ALALFI_DB) return null;
  const row = await env.ALALFI_DB.prepare(
    `SELECT u.id, u.username, u.name, u.role, u.device, u.perms,
            u.last_device, u.last_login, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
  ).bind(token).first();
  return row || null;
}

export async function requireSession(env, request) {
  const u = await getSessionUser(env, request);
  if (!u) return { error: json({ ok: false, error: 'session expired - please log in again' }, 401, request) };
  return { user: u };
}

export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    device: u.device,
    perms: safeJson(u.perms, {}),
    last_device: u.last_device,
    last_login: u.last_login,
  };
}

export function safeJson(text, fallback) {
  try { return JSON.parse(text); } catch (e) { return fallback; }
}
