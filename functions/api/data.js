/**
 * GET  /api/data  -> public content (NO users, NO passwords)
 * PUT  /api/data  -> save public content (token required)
 * DELETE /api/data -> reset everything (token required)
 */
import { DATA_KEY, USERS_KEY, json, corsHeaders, publicView, readJson, authorized, noKv } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noKv(env, request);
  if (missing) return missing;
  try {
    const raw = await env.CONTENT.get(DATA_KEY, 'json');
    if (!raw) return json({ ok: true, empty: true, data: null }, 200, request);
    return json({ ok: true, data: publicView(raw) }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401, request);
  const missing = noKv(env, request);
  if (missing) return missing;

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);

  try {
    const data = payload.data !== undefined ? payload.data : payload;
    if (!data || typeof data !== 'object') return json({ ok: false, error: 'no data' }, 400, request);
    delete data.users;
    await env.CONTENT.put(DATA_KEY, JSON.stringify(data));
    return json({ ok: true, savedAt: new Date().toISOString() }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401, request);
  const missing = noKv(env, request);
  if (missing) return missing;
  try {
    await env.CONTENT.delete(DATA_KEY);
    await env.CONTENT.delete(USERS_KEY);
    return json({ ok: true, reset: true }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
