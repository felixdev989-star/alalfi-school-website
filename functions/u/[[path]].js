/**
 * GET /u/<slug>  ->  the personal link of one admin account.
 *
 * The panel lives on its OWN origin (alalfi-panel.pages.dev) so the
 * home-screen app is never merged with the public school site.
 * The device id travels with the link, so the same phone stays "the same
 * device" and does not need a new approval.
 */
import { noDb } from '../api/_shared.js';

export const DEVICE_COOKIE = 'ald_did';
const PANEL_ORIGIN = 'https://alalfi-panel.pages.dev';

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

  if (!slug) return redirectTo(PANEL_ORIGIN + '/panel/');

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

  if (!user) return redirectTo(PANEL_ORIGIN + '/panel/');

  // device id (cookie)
  const cookies = (request.headers.get('Cookie') || '').split(';').map((c) => c.trim());
  const raw = cookies.find((c) => c.startsWith(DEVICE_COOKIE + '='));
  let deviceId = raw ? decodeURIComponent(raw.split('=').slice(1).join('=')) : '';
  const fresh = !deviceId;
  if (!deviceId) deviceId = randId();

  const cookie = fresh
    ? `${DEVICE_COOKIE}=${deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    : null;

  const target = `${PANEL_ORIGIN}/panel/?u=${encodeURIComponent(user.username)}` +
                 `&link=${encodeURIComponent(slug)}&did=${encodeURIComponent(deviceId)}`;
  return redirectTo(target, cookie);
}

export async function onRequestPost(context) {
  return noDb(context.env, context.request);
}
