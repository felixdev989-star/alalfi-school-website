/**
 * GET    /api/users      -> list users (valid session required)
 * PUT    /api/users      -> create / update users (superadmin session required)
 * DELETE /api/users/:id  -> delete one user (superadmin session required)
 *
 * Passwords are hashed here, never stored in plain text, never returned.
 */
import { json, corsHeaders, readJson, noDb, requireSession, hashPassword, randomToken, safeJson } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

/* ---------------- list ---------------- */
export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;

  try {
    const { results } = await env.ALALFI_DB.prepare(
      `SELECT id, username, slug, name, role, device, perms, last_device, last_login, is_active, created_at
         FROM users ORDER BY id`
    ).all();
    const users = (results || []).map((u) => ({
      id: u.id,
      username: u.username,
      slug: u.slug || '',
      name: u.name,
      role: u.role,
      device: u.device,
      perms: safeJson(u.perms, {}),
      last_device: u.last_device,
      last_login: u.last_login,
      is_active: u.is_active,
      created_at: u.created_at,
      hasPassword: true,          // never the password itself
    }));
    return json({ ok: true, users: users }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}

/* ---------------- create / update ---------------- */
export async function onRequestPut(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'superadmin') {
    return json({ ok: false, error: 'superadmin only' }, 403, request);
  }

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);
  const list = Array.isArray(payload) ? payload : (payload.users || []);

  try {
    for (const u of list) {
      if (!u || !u.username) continue;
      const username = String(u.username).trim();
      const existing = await env.ALALFI_DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
        .bind(username).first();

      const perms = JSON.stringify(u.perms || {});
      const role = u.role === 'superadmin' ? 'superadmin' : 'admin';
      const slug = String(u.slug || '').trim().toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || null;

      if (existing) {
        await env.ALALFI_DB.prepare(
          `UPDATE users SET name = ?, role = ?, device = ?, perms = ?, slug = ?, updated_at = datetime('now')
            WHERE id = ?`
        ).bind(u.name || '', role, u.device || '', perms, slug, existing.id).run();

        if (u.password) {
          const salt = randomToken(16);
          const h = await hashPassword(u.password, salt);
          await env.ALALFI_DB.prepare(
            "UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(h, salt, existing.id).run();
          // force a re-login on every device after a password change
          await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(existing.id).run();
        }
      } else {
        if (!u.password) continue;
        const salt = randomToken(16);
        const h = await hashPassword(u.password, salt);
        await env.ALALFI_DB.prepare(
          `INSERT INTO users (username, slug, name, role, device, perms, password_hash, salt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(username, slug, u.name || '', role, u.device || '', perms, h, salt).run();
      }
    }

    await env.ALALFI_DB.prepare(
      `INSERT INTO audit_log (user_id, action, detail) VALUES (?, 'users_update', ?)`
    ).bind(auth.user.id, String(list.length)).run();

    return json({ ok: true, savedAt: new Date().toISOString() }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}

/* ---------------- delete ----------------
   DELETE /api/users   body: { id: 12 }              -> delete one user
   DELETE /api/users   body: { id: 0, all: true }     -> delete every other user
*/
export async function onRequestDelete(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'superadmin') {
    return json({ ok: false, error: 'superadmin only' }, 403, request);
  }

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);

  try {
    // id may also come from the path (/api/users/12)
    const m = new URL(request.url).pathname.match(/\/users\/(\d+)$/);
    const id = parseInt(payload.id || (m ? m[1] : 0), 10);

    if (payload.all || !id) {
      await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE user_id != ?').bind(auth.user.id).run();
      await env.ALALFI_DB.prepare('DELETE FROM user_devices WHERE user_id != ?').bind(auth.user.id).run();
      await env.ALALFI_DB.prepare('DELETE FROM users WHERE id != ?').bind(auth.user.id).run();
      return json({ ok: true, deletedAll: true }, 200, request);
    }

    if (id === auth.user.id) {
      return json({ ok: false, error: 'لا يمكنك حذف حسابك الحالي' }, 400, request);
    }
    const target = await env.ALALFI_DB.prepare('SELECT id, username, role FROM users WHERE id = ?').bind(id).first();
    if (!target) return json({ ok: false, error: 'المستخدم غير موجود' }, 404, request);
    if (target.role === 'superadmin') {
      return json({ ok: false, error: 'لا يمكن حذف حساب مدير عام' }, 403, request);
    }
    await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    await env.ALALFI_DB.prepare('DELETE FROM user_devices WHERE user_id = ?').bind(id).run();
    await env.ALALFI_DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await env.ALALFI_DB.prepare(
      `INSERT INTO audit_log (user_id, action, detail) VALUES (?, 'user_deleted', ?)`
    ).bind(auth.user.id, String(target.username)).run();
    return json({ ok: true, deleted: id }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
