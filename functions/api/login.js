/**
 * POST /api/login -> verify credentials against the stored hash
 * The plaintext password never leaves the request and is never stored.
 */
import { USERS_KEY, json, corsHeaders, readJson, hashPassword, noKv } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = noKv(env, request);
  if (missing) return missing;

  const payload = await readJson(request);
  if (!payload || !payload.username || !payload.password) {
    return json({ ok: false, error: 'missing credentials' }, 400, request);
  }

  try {
    const list = (await env.CONTENT.get(USERS_KEY, 'json')) || [];
    const user = list.find((u) => (u.username || '').toLowerCase() === String(payload.username).toLowerCase());
    if (!user) return json({ ok: false, error: 'invalid credentials' }, 401, request);

    const h = await hashPassword(payload.password, user.username);
    if (!user.passwordHash || user.passwordHash !== h) {
      return json({ ok: false, error: 'invalid credentials' }, 401, request);
    }

    user.lastDevice = payload.device || user.lastDevice || '';
    user.lastLogin = new Date().toISOString();
    await env.CONTENT.put(USERS_KEY, JSON.stringify(list));

    return json({
      ok: true,
      user: {
        id: user.id, username: user.username, name: user.name,
        role: user.role, device: user.device, perms: user.perms || {},
      },
    }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
