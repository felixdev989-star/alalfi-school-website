/**
 * GET    /api/users      -> list users
 *                          (superadmin sees everybody, a normal admin sees only
 *                           himself - the personal links stay secret)
 * PUT    /api/users      -> create / update users (superadmin session required)
 * DELETE /api/users/:id  -> delete one user (superadmin session required)
 *
 * Passwords are hashed here (PBKDF2), never stored in plain text, never returned.
 * Editing a user keeps the SAME id and the SAME personal link.
 */
import {
  json, corsHeaders, readJson, noDb, requireSession, hashPassword, verifyPassword,
  randomToken, safeJson, serverError, requirePanelKey,
} from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

/* ---------------- list ---------------- */
export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const noKey = requirePanelKey(request, env);
  if (noKey) return noKey;

  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;

  try {
    /* a normal admin must not see the other accounts or their personal links */
    const onlyMe = auth.user.role !== 'superadmin';
    const { results } = await env.ALALFI_DB.prepare(
      `SELECT id, username, slug, name, role, device, perms, last_device, last_login, is_active, created_at
         FROM users ${onlyMe ? 'WHERE id = ?' : ''} ORDER BY id`
    ).bind(...(onlyMe ? [auth.user.id] : [])).all();

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
    return serverError(e, request);
  }
}

/* ---------------- create / update ---------------- */
export async function onRequestPut(context) {
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

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);
  const list = Array.isArray(payload) ? payload : (payload.users || []);
  if (!Array.isArray(list) || list.length > 50) {
    return json({ ok: false, error: 'invalid payload' }, 400, request);
  }

  try {
    for (const u of list) {
      if (!u || !u.username) continue;
      const username = String(u.username).trim().slice(0, 64);
      if (!username) continue;

      /* find the EXISTING row by id first, then by username */
      let existing = null;
      const wantedId = parseInt(u.id || 0, 10);
      if (wantedId > 0) {
        existing = await env.ALALFI_DB.prepare('SELECT id, slug, username, role, name, device, perms, password_hash, salt FROM users WHERE id = ?')
          .bind(wantedId).first();
      }
      if (!existing) {
        existing = await env.ALALFI_DB.prepare('SELECT id, slug, username, role, name, device, perms, password_hash, salt FROM users WHERE username = ? COLLATE NOCASE')
          .bind(username).first();
      }

      /* a partial update must NEVER clear a field that was not sent */
      const perms = JSON.stringify(u.perms !== undefined && u.perms !== null ? u.perms : (safeJson(existing ? existing.perms : null, {}) || {}));
      const role = (u.role === 'superadmin' || u.role === 'admin')
        ? u.role
        : (existing ? existing.role : 'admin');        // no role sent -> keep the old one
      const displayName = (u.name !== undefined && u.name !== null) ? u.name : (existing ? existing.name : '');
      const deviceName = (u.device !== undefined && u.device !== null) ? u.device : (existing ? existing.device : '');

      /* the personal link stays the same unless the superadmin typed a new one */
      let slug = String(u.slug || '').trim().toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || null;
      const autoSlug = username.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '').slice(0, 40) || null;

      if (existing) {
        const touched = u.slugTouched === true;
        const old = existing.slug || null;
        if (!touched) {
          /* the client did not touch the field -> keep the personal link.
             (an old client that sends the auto-generated slug is ignored too) */
          const looksAuto = !slug || slug === autoSlug;
          if (old && (u.slugTouched === false || looksAuto)) slug = old;
        }
      }
      if (!slug) slug = existing ? (existing.slug || autoSlug) : autoSlug;

      /* the slug must be unique */
      if (slug) {
        const taken = await env.ALALFI_DB.prepare(
          'SELECT id FROM users WHERE slug = ? COLLATE NOCASE AND id != ? LIMIT 1'
        ).bind(slug, existing ? existing.id : 0).first();
        if (taken) {
          return json({ ok: false, error: 'الرابط الشخصي مستخدم من قبل - اختار رابط تاني' }, 409, request);
        }
      }

      /* the username must be unique */
      const nameTaken = await env.ALALFI_DB.prepare(
        'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ? LIMIT 1'
      ).bind(username, existing ? existing.id : 0).first();
      if (nameTaken) {
        return json({ ok: false, error: 'اسم المستخدم مستخدم من قبل' }, 409, request);
      }

      if (existing) {
        /* ---- validate FIRST, then write (no partial updates) ---- */
        let newPassword = null;
        if (u.password) {
          const pw = String(u.password);
          /* changing YOUR OWN password needs the current one */
          if (existing.id === auth.user.id) {
            const oldPw = String(u.old_password || '');
            if (!oldPw) {
              return json({
                ok: false,
                error: 'لتغيير كلمة مرورك استخدم قسم «حسابي» وحط كلمة المرور الحالية',
              }, 400, request);
            }
            const check = await verifyPassword(oldPw, existing.password_hash, existing.salt);
            if (!check.ok) {
              return json({ ok: false, error: 'كلمة المرور الحالية غلط' }, 403, request);
            }
          }
          /* password policy */
          if (pw.length < 8) {
            return json({ ok: false, error: 'كلمة المرور لازم تكون 8 حروف على الأقل' }, 400, request);
          }
          if (pw.toLowerCase() === username.toLowerCase()) {
            return json({ ok: false, error: 'كلمة المرور ماتكونش زي اسم المستخدم' }, 400, request);
          }
          newPassword = pw;
        }

        await env.ALALFI_DB.prepare(
          `UPDATE users SET username = ?, name = ?, role = ?, device = ?, perms = ?, slug = ?, updated_at = datetime('now')
            WHERE id = ?`
        ).bind(username, displayName, role, deviceName, perms, slug, existing.id).run();

        if (newPassword) {
          const salt = randomToken(16);
          const h = await hashPassword(newPassword, salt);
          await env.ALALFI_DB.prepare(
            "UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(h, salt, existing.id).run();
          // force a re-login on every device after a password change
          await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(existing.id).run();
        }
      } else {
        if (!u.password) continue;
        const pw = String(u.password);
        if (pw.length < 8) {
          return json({ ok: false, error: 'كلمة المرور لازم تكون 8 حروف على الأقل' }, 400, request);
        }
        if (pw.toLowerCase() === username.toLowerCase()) {
          return json({ ok: false, error: 'كلمة المرور ماتكونش زي اسم المستخدم' }, 400, request);
        }
        const salt = randomToken(16);
        const h = await hashPassword(pw, salt);
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
    return serverError(e, request);
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

  const noKey = requirePanelKey(request, env);
  if (noKey) return noKey;

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
    return serverError(e, request);
  }
}
