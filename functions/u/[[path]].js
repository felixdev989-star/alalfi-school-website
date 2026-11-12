/**
 * GET /admin/<slug>  ->  the personal link of one admin account.
 *
 *   https://alalfi-school.pages.dev/admin/ahmed  ->  /admin.html?u=ahmed&link=ahmed
 *
 * The device id is stored in a cookie so the browser stays "recognised".
 * The real binding decision is made by /api/devices (register) which the
 * admin page calls right after it loads - that way the server also knows
 * the device model (Realme C55, Windows, ...).
 */
import { noDb } from '../api/_shared.js';

export const DEVICE_COOKIE = 'ald_did';

function randId() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

function redirectTo(path, cookie) {
  const headers = { Location: path, 'Cache-Control': 'no-store' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 302, headers });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = (url.pathname.split('/').filter(Boolean)[1] || '').trim();

  if (!slug) return redirectTo('/admin.html');

  let user = null;
  try {
    if (env.ALALFI_DB) {
      user = await env.ALALFI_DB.prepare(
        'SELECT id, username FROM users WHERE slug = ? COLLATE NOCASE AND is_active = 1 LIMIT 1'
      ).bind(slug).first();
    }
  } catch (e) {
    user = null;
  }

  if (!user) return redirectTo('/admin.html');

  // device id (cookie)
  const cookies = (request.headers.get('Cookie') || '').split(';').map((c) => c.trim());
  const raw = cookies.find((c) => c.startsWith(DEVICE_COOKIE + '='));
  let deviceId = raw ? decodeURIComponent(raw.split('=').slice(1).join('=')) : '';
  const fresh = !deviceId;
  if (!deviceId) deviceId = randId();

  const cookie = fresh
    ? `${DEVICE_COOKIE}=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    : null;

  return redirectTo(
    `/admin.html?u=${encodeURIComponent(user.username)}&link=${encodeURIComponent(slug)}`,
    cookie
  );
}

export async function onRequestPost(context) {
  return noDb(context.env, context.request);
}
