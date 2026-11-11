/**
 * POST /api/login    -> verify credentials, create a server-side session
 * POST /api/logout   -> destroy the session
 * GET  /api/session  -> check if the current session is still valid
 *
 * The plaintext password never leaves the request body and is never stored.
 */
import {
  json, corsHeaders, readJson, noDb, hashPassword, randomToken,
  SESSION_HOURS, publicUser, getSessionUser,
} from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;
  const u = await getSessionUser(env, request);
  if (!u) return json({ ok: false, authenticated: false }, 401, request);
  return json({ ok: true, authenticated: true, user: publicUser(u) }, 200, request);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;
  const missing = noDb(env, request);
  if (missing) return missing;

  /* ---------- logout ---------- */
  if (path.endsWith('/logout')) {
    const token = request.headers.get('X-Session') || '';
    if (token) {
      await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }
    return json({ ok: true, loggedOut: true }, 200, request);
  }

  /* ---------- login ---------- */
  if (!path.endsWith('/login')) return json({ ok: false, error: 'not found' }, 404, request);

  const payload = await readJson(request);
  if (!payload || !payload.username || !payload.password) {
    return json({ ok: false, error: 'missing credentials' }, 400, request);
  }

  try {
    const user = await env.ALALFI_DB.prepare(
      'SELECT id, username, name, role, device, perms, password_hash, salt, last_device, last_login, is_active FROM users WHERE username = ? COLLATE NOCASE'
    ).bind(String(payload.username).trim()).first();

    if (!user || !user.is_active) {
      // same message for unknown user and wrong password (no user enumeration)
      return json({ ok: false, error: 'invalid credentials' }, 401, request);
    }

    const h = await hashPassword(payload.password, user.salt);
    if (h !== user.password_hash) {
      await env.ALALFI_DB.prepare(
        `INSERT INTO audit_log (user_id, action, detail) VALUES (?, 'login_failed', ?)`
      ).bind(user.id, String(payload.device || '')).run();
      return json({ ok: false, error: 'invalid credentials' }, 401, request);
    }

    // ---- device check: every account is bound to approved devices only ----
    const deviceId = String(payload.deviceId || '').trim();
    const deviceInfo = String(payload.deviceInfo || '').trim();
    const recoveryKey = String(payload.recoveryKey || '').trim();
    const isRecovery = !!(env.EDIT_TOKEN && recoveryKey && recoveryKey === env.EDIT_TOKEN);

    if (deviceId) {
      const bound = await env.ALALFI_DB.prepare(
        "SELECT id, status FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1"
      ).bind(user.id, deviceId).first();

      if (bound && bound.status !== 'active' && !isRecovery) {
        return json({
          ok: false,
          error: 'device_pending',
          recoveryAllowed: !!env.EDIT_TOKEN,
        }, 403, request);
      }
      if (!bound) {
        if (!isRecovery) {
          // unknown device -> needs approval first
          await env.ALALFI_DB.prepare(
            `INSERT INTO user_devices (user_id, device_id, device_info, status)
             VALUES (?, ?, ?, 'pending')
             ON CONFLICT(user_id, device_id) DO UPDATE SET device_info = excluded.device_info`
          ).bind(user.id, deviceId, deviceInfo).run();
          return json({
            ok: false,
            error: 'device_pending',
            recoveryAllowed: !!env.EDIT_TOKEN,
          }, 403, request);
        }
        // recovery key -> bind this device right away
        await env.ALALFI_DB.prepare(
          `INSERT INTO user_devices (user_id, device_id, device_info, status, last_seen)
           VALUES (?, ?, ?, 'active', datetime('now'))
           ON CONFLICT(user_id, device_id) DO UPDATE SET status='active', device_info=excluded.device_info, last_seen=datetime('now')`
        ).bind(user.id, deviceId, deviceInfo).run();
      } else {
        if (isRecovery && bound.status !== 'active') {
          await env.ALALFI_DB.prepare(
            "UPDATE user_devices SET status='active', last_seen = datetime('now') WHERE id = ?"
          ).bind(bound.id).run();
        } else {
          await env.ALALFI_DB.prepare(
            "UPDATE user_devices SET device_info = ?, last_seen = datetime('now') WHERE id = ?"
          ).bind(deviceInfo, bound.id).run();
        }
      }
    }

    // create a server-side session
    const token = randomToken(32);
    const expiry = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString()
      .replace('T', ' ').slice(0, 19);
    await env.ALALFI_DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, user.id, expiry).run();

    await env.ALALFI_DB.prepare(
      `UPDATE users SET last_device = ?, last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(payload.device || '', user.id).run();

    await env.ALALFI_DB.prepare(
      `INSERT INTO audit_log (user_id, action, detail) VALUES (?, 'login', ?)`
    ).bind(user.id, payload.device || '').run();

    // clean up expired sessions
    await env.ALALFI_DB.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run();

    return json({
      ok: true,
      token: token,
      expiresIn: SESSION_HOURS * 3600,
      user: publicUser({
        ...user,
        last_device: payload.device || user.last_device,
        last_login: new Date().toISOString(),
      }),
    }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
