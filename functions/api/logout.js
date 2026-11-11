/**
 * POST /api/logout -> destroy the current server-side session.
 */
import { json, corsHeaders, noDb } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const token = request.headers.get('X-Session') || '';
  if (token) {
    try {
      await env.ALALFI_DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 500, request);
    }
  }
  return json({ ok: true, loggedOut: true }, 200, request);
}
