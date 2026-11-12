/**
 * POST /api/push-subscribe  ->  save a push subscription (public, rate limited)
 * POST /api/push-send       ->  send a notification to everybody (superadmin only)
 */
import { json, corsHeaders, readJson, noDb, requireSession, serverError } from './_shared.js';
import { sendPush } from './_push.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const payload = await readJson(request);
  if (!payload) return json({ ok: false, error: 'invalid json' }, 400, request);

  /* ---------------- subscribe (public) ---------------- */
  if (payload.action === 'subscribe' || payload.endpoint) {
    const endpoint = String(payload.endpoint || '').trim();
    const keys = payload.keys || {};
    const p256dh = String(keys.p256dh || '').trim();
    const auth = String(keys.auth || '').trim();
    /* only real push endpoints */
    if (!/^https:\/\/([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}/i.test(endpoint) ||
        !p256dh || !auth) {
      return json({ ok: false, error: 'invalid subscription' }, 400, request);
    }
    try {
      await env.ALALFI_DB.prepare(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
      ).bind(endpoint, p256dh, auth).run();
      return json({ ok: true }, 200, request);
    } catch (e) {
      return serverError(e, request);
    }
  }

  /* ---------------- send (superadmin only) ---------------- */
  if (payload.action === 'send') {
    const auth = await requireSession(env, request);
    if (auth.error) return auth.error;
    if (auth.user.role !== 'superadmin') {
      return json({ ok: false, error: 'superadmin only' }, 403, request);
    }
    let vapid = null;
    try { vapid = env.VAPID_KEYS ? JSON.parse(env.VAPID_KEYS) : null; } catch (e) { vapid = null; }
    if (!vapid) return json({ ok: true, sent: 0, note: 'push is not configured' }, 200, request);

    const title = String(payload.title || 'مدرسة الالفي').slice(0, 120);
    const body = String(payload.body || '').slice(0, 300);
    const url = String(payload.url || '/news.html').slice(0, 200);
    const message = JSON.stringify({ title, body, url, tag: 'alalfi-news' });

    try {
      const { results } = await env.ALALFI_DB.prepare(
        'SELECT id, endpoint, p256dh, auth FROM push_subscriptions'
      ).all();
      const subs = results || [];
      let sent = 0;
      let failed = 0;
      const dead = [];
      for (const s of subs) {
        const r = await sendPush(s, message, vapid);
        if (r === true) { sent++; await env.ALALFI_DB.prepare("UPDATE push_subscriptions SET last_ok = datetime('now') WHERE id = ?").bind(s.id).run(); }
        else if (r === 'gone') dead.push(s.id);
        else failed++;
      }
      for (const id of dead) {
        await env.ALALFI_DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(id).run();
      }
      return json({ ok: true, sent, failed, removed: dead.length }, 200, request);
    } catch (e) {
      return serverError(e, request);
    }
  }

  return json({ ok: false, error: 'unknown action' }, 400, request);
}
