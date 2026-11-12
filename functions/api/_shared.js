/**
 * Shared helpers - AlAlfi school API (Cloudflare Pages Functions)
 * Storage: D1 (SQLite) for users, sessions and content.
 *
 * Security notes:
 *  - passwords: PBKDF2-HMAC-SHA256 (120k rounds) with a per-user random salt.
 *    Old SHA-256 hashes are still VERIFIED (so nobody loses access) and are
 *    silently upgraded to PBKDF2 on the next successful login.
 *  - sessions: 64 hex random characters, stored server side, 8h expiry.
 *  - every 500 response hides the internal error message.
 */

export const ALLOWED_ORIGINS = ['https://alalfi-school.pages.dev'];
export const SESSION_HOURS = 8;          // auto logout after this
export const CONTENT_KEYS = [
  'settings', 'about', 'news', 'events', 'programs',
  'gallery', 'staff', 'leaders', 'media',
];
export const PBKDF2_ITERATIONS = 100000;   // Cloudflare WebCrypto max is 100000

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

/** never leak the internal exception to the client */
export function serverError(e, request, extra) {
  try { console.error('API error:', (e && e.stack) || e); } catch (x) { /* ignore */ }
  return json({ ok: false, error: 'خطأ في الخادم - حاول تاني', ...(extra || {}) }, 500, request);
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += (bytes[i] & 0xff).toString(16).padStart(2, '0');
  return hex;
}

export function hexToBytes(hex) {
  const s = String(hex || '').trim();
  const out = new Uint8Array(Math.floor(s.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16) || 0;
  return out;
}

export function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then((res) => {
    const view = (res && res.buffer && !(res instanceof ArrayBuffer))
      ? new Uint8Array(res.buffer)
      : new Uint8Array(res);
    return bytesToHex(view);
  });
}

/** compare two hex strings without leaking the position of the difference */
export function timingSafeEqual(a, b) {
  const x = String(a == null ? '' : a);
  const y = String(b == null ? '' : b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/* ---------------- password hashing ---------------- */

export async function pbkdf2Hash(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const salt = hexToBytes(saltHex);
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, base, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

/**
 * Hash a NEW password -> "pbkdf2$<rounds>$<salt>$<hash>"
 */
export async function hashPassword(password, salt) {
  const h = await pbkdf2Hash(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${h}`;
}

/**
 * Verify a password against the stored hash.
 * Supports the new PBKDF2 format AND the legacy sha256(salt + '::' + password).
 * Returns { ok, upgrade } - upgrade holds the new hash when the old format was used.
 */
export async function verifyPassword(password, storedHash, salt) {
  const pwd = String(password == null ? '' : password);
  const stored = String(storedHash || '');
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    const s = parts[2] || salt || '';
    const expected = parts[3] || '';
    const got = await pbkdf2Hash(pwd, s, iterations);
    return { ok: timingSafeEqual(got, expected), upgrade: null };
  }
  /* legacy sha256 */
  const got = await sha256Hex((salt || '') + '::' + pwd);
  const ok = timingSafeEqual(got, stored);
  if (!ok) return { ok: false, upgrade: null };
  const newSalt = randomToken(16);
  const newHash = await pbkdf2Hash(pwd, newSalt);
  return {
    ok: true,
    upgrade: { salt: newSalt, hash: `pbkdf2$${PBKDF2_ITERATIONS}$${newSalt}$${newHash}` },
  };
}

/* ---------------- generic rate limiting ---------------- */

export async function limitHit(env, key, max, minutes) {
  try {
    const row = await env.ALALFI_DB.prepare(
      'SELECT attempts, last_try FROM login_attempts WHERE ip = ?'
    ).bind(key).first();
    if (!row) return false;
    const last = new Date(String(row.last_try).replace(' ', 'T') + 'Z').getTime();
    const mins = (Date.now() - last) / 60000;
    if (mins > minutes) return false;          // the old attempt expired
    return (row.attempts || 0) >= max;
  } catch (e) {
    return false;
  }
}

export async function limitAdd(env, key) {
  try {
    await env.ALALFI_DB.prepare(
      `INSERT INTO login_attempts (ip, attempts, last_try) VALUES (?, 1, datetime('now'))
       ON CONFLICT(ip) DO UPDATE SET attempts = attempts + 1, last_try = datetime('now')`
    ).bind(key).run();
  } catch (e) { /* ignore */ }
}

export async function limitClear(env, key) {
  try {
    await env.ALALFI_DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(key).run();
  } catch (e) { /* ignore */ }
}

/* ---------------- panel key ----------------
   The admin panel is protected by a secret key (PANEL_KEY).
   The page itself is behind a cookie gate; every API call must also
   carry the key in the X-Panel-Key header. */

export function panelKeyOk(request, env) {
  if (!env.PANEL_KEY) return true;              // not configured -> open
  const given = request.headers.get('X-Panel-Key') || '';
  return timingSafeEqual(given, env.PANEL_KEY);
}

export function requirePanelKey(request, env) {
  if (panelKeyOk(request, env)) return null;
  return json({ ok: false, error: 'panel_key_required' }, 403, request);
}

/* ---------------- request helpers ---------------- */

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

/* the raw token never touches the database - only its SHA-256 hash does,
   so a leak of the database cannot be used to open a live session */
export async function sessionHash(token) {
  return sha256Hex(String(token || ''));
}

export async function getSessionUser(env, request) {
  const token = sessionToken(request);
  if (!token || !env.ALALFI_DB) return null;
  const hash = await sessionHash(token);
  const row = await env.ALALFI_DB.prepare(
    `SELECT u.id, u.username, u.name, u.role, u.device, u.perms,
            u.last_device, u.last_login, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
  ).bind(hash).first();
  return row || null;
}

export async function requireSession(env, request) {
  const u = await getSessionUser(env, request);
  if (!u) return { error: json({ ok: false, error: 'انتهت الجلسة - سجل دخول تاني' }, 401, request) };
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
