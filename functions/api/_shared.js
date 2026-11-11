/**
 * Shared helpers for the AlAlfi school API (Cloudflare Pages Functions).
 */

export const DATA_KEY = 'site-data';
export const USERS_KEY = 'admin-users';
export const SALT = 'alalfi-school-2026::';

export const ALLOWED_ORIGINS = ['https://alalfi-school.pages.dev'];

export function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Token',
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
  const c = corsHeaders(request || { headers: {} });
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...c } });
}

export function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then((res) => {
    const view = (res && res.buffer && !(res instanceof ArrayBuffer))
      ? new Uint8Array(res.buffer)
      : new Uint8Array(res);
    let hex = '';
    for (let i = 0; i < view.length; i++) {
      hex += (view[i] & 0xff).toString(16).padStart(2, '0');
    }
    return hex;
  }).catch(() => fallbackSha256(text));
}

/* Pure-JS SHA-256 fallback (used only if WebCrypto is unavailable) */
function fallbackSha256(text) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(text));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w = new Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let j = 0; j < bytes.length; j += 64) {
    for (let t = 0; t < 16; t++) w[t] = (bytes[j + t * 4] << 24) | (bytes[j + t * 4 + 1] << 16) | (bytes[j + t * 4 + 2] << 8) | bytes[j + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

export function hashPassword(password, salt) {
  return sha256Hex((salt || SALT) + '::' + password);
}

export function authorized(request, env) {
  const expected = env.EDIT_TOKEN || '';
  if (!expected) return false;
  const provided = request.headers.get('X-Edit-Token') || '';
  return provided === expected;
}

/** strip anything sensitive out of the public payload */
export function publicView(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'users' || k === 'secrets' || k === 'tokens') continue;
    out[k] = v;
  }
  return out;
}

export async function readJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}

export function noKv(env, request) {
  if (env.CONTENT) return null;
  return json({ ok: false, error: 'KV binding missing (CONTENT)' }, 500, request);
}
