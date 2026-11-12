/**
 * POST /api/panel-auth  ->  check the panel key and open the gate cookie.
 *
 * body: { key: "..." }
 * The key is stored in an HttpOnly cookie (path /panel) and the browser
 * also keeps it in localStorage so every API call can send it.
 */
import { json, readJson, timingSafeEqual, corsHeaders } from './_shared.js';

const COOKIE = 'ald_pk';
const MAX_AGE = 60 * 60 * 24 * 30;   // 30 days

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.PANEL_KEY) {
    return json({ ok: true, note: 'no key configured' }, 200, request);
  }

  const payload = await readJson(request);
  const key = String((payload && payload.key) || '').trim();
  if (!key || !timingSafeEqual(key, env.PANEL_KEY)) {
    return json({ ok: false, error: 'المفتاح غير صحيح' }, 403, request);
  }

  const cookie = `${COOKIE}=${encodeURIComponent(key)}; Path=/panel; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie,
      ...corsHeaders(request),
    },
  });
}
