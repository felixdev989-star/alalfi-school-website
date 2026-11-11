/**
 * GET  /api/devices  -> list all devices (superadmin session required)
 * POST /api/devices  -> actions (superadmin session required)
 *        body: { action: 'register', slug, deviceId, deviceInfo }
 *           -> { ok, status: 'active' | 'pending' | 'new' | 'other_account', code }
 *        body: { action: 'approve' | 'reject' | 'unbind', deviceId, userId }
 */
import { json, corsHeaders, readJson, noDb, requireSession } from './_shared.js';

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
  if (auth.user.role !== 'superadmin') {
    return json({ ok: false, error: 'superadmin only' }, 403, request);
  }

  try {
    const { results } = await env.ALALFI_DB.prepare(
      `SELECT d.id, d.user_id, d.device_id, d.device_info, d.label, d.status,
              d.created_at, d.last_seen, u.username, u.name, u.role
         FROM user_devices d JOIN users u ON u.id = d.user_id
        ORDER BY CASE d.status WHEN 'pending' THEN 0 ELSE 1 END, d.id DESC`
    ).all();
    return json({ ok: true, devices: results || [] }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}

/* ---------------- actions ---------------- */
export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);

  /* ---------------- register (no session needed) ---------------- */
  if (payload.action === 'register') {
    const slug = String(payload.slug || '').trim();
    const deviceId = String(payload.deviceId || '').trim();
    const deviceInfo = String(payload.deviceInfo || '').trim();
    if (!slug || !deviceId) return json({ ok: false, error: 'missing slug/deviceId' }, 400, request);

    try {
      const user = await env.ALALFI_DB.prepare(
        'SELECT id, username, name, role FROM users WHERE slug = ? COLLATE NOCASE AND is_active = 1 LIMIT 1'
      ).bind(slug).first();
      if (!user) return json({ ok: true, status: 'unknown' }, 200, request);

      /* 1) a device belongs to ONE account only */
      const other = await env.ALALFI_DB.prepare(
        `SELECT u.username, u.name FROM user_devices d JOIN users u ON u.id = d.user_id
          WHERE d.device_id = ? AND d.user_id != ? LIMIT 1`
      ).bind(deviceId, user.id).first();
      if (other) {
        return json({
          ok: true, status: 'other_account',
          message: 'هذا الجهاز مرتبط بحساب آخر (' + (other.name || other.username) + ')',
        }, 200, request);
      }

      /* 2) the recovery key (the publish key) activates this device right away */
      const recovery = String(request.headers.get('X-Edit-Token') || '');
      const isRecovery = !!(env.EDIT_TOKEN && recovery && recovery === env.EDIT_TOKEN);
      if (isRecovery) {
        await env.ALALFI_DB.prepare(
          `INSERT INTO user_devices (user_id, device_id, device_info, status, last_seen)
           VALUES (?, ?, ?, 'active', datetime('now'))
           ON CONFLICT(user_id, device_id) DO UPDATE SET status='active', device_info=excluded.device_info, last_seen=datetime('now')`
        ).bind(user.id, deviceId, deviceInfo).run();
        return json({ ok: true, status: 'active', username: user.username, byRecovery: true }, 200, request);
      }

      /* 3) already approved? */
      const bound = await env.ALALFI_DB.prepare(
        'SELECT id, status FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1'
      ).bind(user.id, deviceId).first();
      if (bound && bound.status === 'active') {
        await env.ALALFI_DB.prepare(
          "UPDATE user_devices SET device_info = ?, last_seen = datetime('now') WHERE id = ?"
        ).bind(deviceInfo, bound.id).run();
        return json({ ok: true, status: 'active', username: user.username }, 200, request);
      }

      const total = (await env.ALALFI_DB.prepare(
        'SELECT COUNT(*) AS c FROM user_devices WHERE user_id = ?'
      ).bind(user.id).first()).c || 0;

      /* 4) already waiting for approval */
      if (bound) {
        await env.ALALFI_DB.prepare(
          "UPDATE user_devices SET device_info = ?, status = CASE WHEN status='rejected' THEN 'pending' ELSE status END WHERE id = ?"
        ).bind(deviceInfo, bound.id).run();
        const code = (user.id * 1000 + bound.id) % 100000;
        return json({ ok: true, status: 'pending', code: code, username: user.username }, 200, request);
      }

      /* 5) the superadmin's very first device binds itself (nobody else could approve it) */
      if (user.role === 'superadmin' && total === 0) {
        await env.ALALFI_DB.prepare(
          `INSERT INTO user_devices (user_id, device_id, device_info, status, last_seen)
           VALUES (?, ?, ?, 'active', datetime('now'))
           ON CONFLICT(user_id, device_id) DO UPDATE SET status='active', device_info=excluded.device_info, last_seen=datetime('now')`
        ).bind(user.id, deviceId, deviceInfo).run();
        return json({ ok: true, status: 'active', username: user.username }, 200, request);
      }

      /* 6) every other new device needs the superadmin's approval */
      const ins = await env.ALALFI_DB.prepare(
        `INSERT INTO user_devices (user_id, device_id, device_info, status)
         VALUES (?, ?, ?, 'pending')
         ON CONFLICT(user_id, device_id) DO UPDATE SET device_info=excluded.device_info`
      ).bind(user.id, deviceId, deviceInfo).run();
      const newId = (ins && ins.meta && ins.meta.last_row_id) || 0;
      const code = (user.id * 1000 + newId) % 100000;
      return json({ ok: true, status: 'new', code: code, first: total === 0, username: user.username }, 200, request);
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
    }
  }

  /* ---------------- everything else needs a superadmin session ---------------- */
  const auth = await requireSession(env, request);
  if (auth.error) return auth.error;
  if (auth.user.role !== 'superadmin') {
    return json({ ok: false, error: 'superadmin only' }, 403, request);
  }
  if (!payload.deviceId) return json({ ok: false, error: 'deviceId required' }, 400, request);

  const action = payload.action || 'approve';

  try {
    if (action === 'unbind') {
      await env.ALALFI_DB.prepare('DELETE FROM user_devices WHERE device_id = ?').bind(payload.deviceId).run();
      if (payload.userId) {
        await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(payload.userId).run();
      }
      return json({ ok: true, action: 'unbound' }, 200, request);
    }
    const status = action === 'reject' ? 'rejected' : 'active';
    await env.ALALFI_DB.prepare(
      "UPDATE user_devices SET status = ?, last_seen = datetime('now') WHERE device_id = ?"
    ).bind(status, payload.deviceId).run();
    return json({ ok: true, action: action, status: status }, 200, request);
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
  }
}
