/**
 * GET /api/session -> check whether the current session token is still valid.
 * Used by the admin panel to auto-lock when the session expires.
 */
import { json, corsHeaders, noDb, getSessionUser, publicUser } from './_shared.js';

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const missing = noDb(env, request);
  if (missing) return missing;

  const user = await getSessionUser(env, request);
  if (!user) return json({ ok: false, authenticated: false }, 401, request);
  return json({ ok: true, authenticated: true, user: publicUser(user) }, 200, request);
}
