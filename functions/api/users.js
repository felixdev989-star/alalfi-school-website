/**
 * GET /api/users -> admin only (token required) - passwords are hashed
 * PUT /api/users -> save users (token required) - plaintext is hashed here
 */
import { USERS_KEY, json, corsHeaders, readJson, authorized, hashPassword, noKv } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401, request);
  const missing = noKv(env, request);
  if (missing) return missing;
  try {
    const raw = await env.CONTENT.get(USERS_KEY, 'json');
    return json({ ok: true, users: raw || [] }, 200, request);
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
  const list = Array.isArray(payload) ? payload : (payload.users || []);

  try {
    const safe = [];
    for (const u of list) {
      if (!u || !u.username) continue;
      const entry = {
        id: u.id,
        username: String(u.username),
        name: u.name || '',
        role: u.role || 'admin',
        device: u.device || '',
        perms: u.perms || {},
        lastDevice: u.lastDevice || '',
        lastLogin: u.lastLogin || '',
        passwordHash: '',
      };
      if (u.passwordHash) entry.passwordHash = u.passwordHash;
      else if (u.password) entry.passwordHash = await hashPassword(u.password, entry.username);
      safe.push(entry);
    }
    await env.CONTENT.put(USERS_KEY, JSON.stringify(safe));
    return json({ ok: true, savedAt: new Date().toISOString() }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
