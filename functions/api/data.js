/**
 * GET  /api/data   -> public content (no users, no passwords) - anyone can read
 * PUT  /api/data   -> save public content   (valid session + edit permission)
 * DELETE /api/data -> reset content          (superadmin session required)
 *
 * The permissions are checked on the SERVER as well (the panel hides the
 * buttons, but the API is the real gate).
 */
import {
  json, corsHeaders, readJson, noDb, requireSession, CONTENT_KEYS, safeJson, serverError,
  requirePanelKey,
} from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

const PERM_RANK = { none: 0, view: 1, edit: 2, full: 3 };

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  try {
    const { results } = await env.ALALFI_DB.prepare('SELECT key, value FROM content').all();
    const data = {};
    for (const r of results || []) {
      if (CONTENT_KEYS.includes(r.key)) data[r.key] = safeJson(r.value, null);
    }
    return json({ ok: true, data: data }, 200, request);
  } catch (e) {
    return serverError(e, request);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const noKey = requirePanelKey(request, env);
  if (noKey) return noKey;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);
  const data = payload.data !== undefined ? payload.data : payload;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'no data' }, 400, request);
  }

  try {
    /* the permissions of the account decide which sections can be saved */
    const perms = auth.user.role === 'superadmin' ? {} : (safeJson(auth.user.perms, {}) || {});
    const allowed = (key) => {
      if (auth.user.role === 'superadmin') return true;
      const lvl = perms[key] || 'none';
      return (PERM_RANK[lvl] || 0) >= PERM_RANK.edit;
    };

    const stmt = env.ALALFI_DB.prepare(
      `INSERT INTO content (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    );
    const keys = Object.keys(data).filter((k) => CONTENT_KEYS.includes(k) && allowed(k));
    const denied = Object.keys(data).filter((k) => CONTENT_KEYS.includes(k) && !allowed(k));
    if (!keys.length) {
      return json({ ok: false, error: 'مفيش صلاحية تعديل الأقسام دي' }, 403, request);
    }
    for (const k of keys) {
      await stmt.bind(k, JSON.stringify(data[k])).run();
    }
    await env.ALALFI_DB.prepare(
      `INSERT INTO audit_log (user_id, action, detail) VALUES (?, 'content_update', ?)`
    ).bind(auth.user.id, keys.join(',')).run();

    return json({ ok: true, savedAt: new Date().toISOString(), keys: keys }, 200, request);
  } catch (e) {
    return serverError(e, request);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const noKey = requirePanelKey(request, env);
  if (noKey) return noKey;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'superadmin') {
    return json({ ok: false, error: 'superadmin only' }, 403, request);
  }

  try {
    await env.ALALFI_DB.prepare('DELETE FROM content').run();
    await env.ALALFI_DB.prepare('DELETE FROM sessions').run();
    return json({ ok: true, reset: true }, 200, request);
  } catch (e) {
    return serverError(e, request);
  }
}
