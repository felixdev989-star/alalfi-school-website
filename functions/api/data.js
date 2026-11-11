/**
 * Cloudflare Pages Function — global content store for the school website.
 *
 * GET  /api/data  -> returns the current site content JSON
 * PUT  /api/data  -> saves the content JSON (requires the edit token)
 *
 * Storage: Cloudflare KV (global, shared by every visitor).
 */

const KEY = 'site-data';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Token',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const raw = await env.CONTENT.get(KEY, 'json');
    if (!raw) return json({ ok: true, empty: true, data: null });
    return json({ ok: true, data: raw });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  // token check (token comes from the admin panel; keep it out of the public repo)
  const expected = env.EDIT_TOKEN || '';
  const provided = request.headers.get('X-Edit-Token') || '';
  if (expected && provided !== expected) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ ok: false, error: 'invalid json' }, 400);
  }
  const data = payload && payload.data !== undefined ? payload.data : payload;
  if (!data || typeof data !== 'object') {
    return json({ ok: false, error: 'no data' }, 400);
  }

  try {
    await env.CONTENT.put(KEY, JSON.stringify(data));
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}

/* DELETE /api/data -> reset the shared content back to the built-in defaults */
export async function onRequestDelete(context) {
  const { request, env } = context;
  const expected = env.EDIT_TOKEN || '';
  const provided = request.headers.get('X-Edit-Token') || '';
  if (expected && provided !== expected) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  try {
    await env.CONTENT.delete(KEY);
    return json({ ok: true, reset: true });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message || e) }, 500);
  }
}
