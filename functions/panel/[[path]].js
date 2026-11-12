/**
 * The admin panel is behind a secret key.
 *
 *   /panel/            -> the gate (asks for the key)
 *   /panel/ + cookie   -> the panel itself
 *   /panel/<key>/      -> a secret link: checks the key and sets the cookie
 *
 * The panel has its OWN web manifest, so "add to home screen" creates a
 * SEPARATE app - it never mixes with the public school site.
 */
import { corsHeaders, readJson, timingSafeEqual } from '../api/_shared.js';

const COOKIE = 'ald_pk';
const MAX_AGE = 60 * 60 * 24 * 30;   // 30 days

const SECURITY = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; " +
    "connect-src 'self'; media-src 'self' data: blob:; object-src 'none'; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const bits = part.trim().split('=');
    if (bits[0] === name) return decodeURIComponent(bits.slice(1).join('='));
  }
  return '';
}

function html(body, status, extra) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...SECURITY,
      ...(extra || {}),
    },
  });
}

function setCookie(value, maxAge) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/panel; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

const GATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>لوحة التحكم — مدرسة الالفي</title>
<link rel="icon" type="image/png" sizes="192x192" href="/images/favicon.png">
<link rel="apple-touch-icon" href="/images/favicon.png">
<link rel="manifest" href="/panel/manifest.webmanifest">
<meta name="theme-color" content="#0b1220">
<meta name="robots" content="noindex, nofollow">
<meta name="mobile-web-app-capable" content="no">
<meta name="apple-mobile-web-app-capable" content="no">
<link rel="stylesheet" href="/css/fonts.css?v=20261112">
<style>
  :root { --bg:#0b1220; --card:#121b2e; --line:#24324d; --ink:#e8eefc; --muted:#8fa0b8; --gold:#c9a227; }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; }
  body { background: radial-gradient(1200px 600px at 70% -10%, #14203a 0%, var(--bg) 60%);
         color:var(--ink); font-family:'Tajawal', system-ui, sans-serif; direction:rtl;
         display:grid; place-items:center; padding:24px; }
  .box { width:100%; max-width:420px; background:var(--card); border:1px solid var(--line);
         border-radius:18px; padding:30px 26px; box-shadow:0 30px 70px -30px #000; text-align:center; }
  .box img { width:78px; height:78px; margin:0 auto 14px; display:block; }
  h1 { font-family:'Amiri', serif; font-size:26px; margin:0 0 6px; }
  p.sub { color:var(--muted); font-size:13px; margin:0 0 22px; line-height:1.8; }
  label { display:block; text-align:right; font-size:12px; font-weight:700; color:var(--muted); margin:0 0 6px; }
  input { width:100%; padding:13px 14px; border-radius:10px; border:1px solid var(--line);
          background:#0e1626; color:var(--ink); font-size:15px; font-family:inherit; }
  input:focus { outline:none; border-color:var(--gold); }
  button { width:100%; margin-top:14px; padding:14px; border:0; border-radius:10px; cursor:pointer;
           font-family:inherit; font-size:15px; font-weight:800; color:#0b1220;
           background:linear-gradient(135deg,#c9a227,#1fa89a); }
  button:disabled { opacity:.6; cursor:wait; }
  .err { display:none; margin-top:14px; padding:11px 13px; border-radius:10px; font-size:13px;
         background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.45); color:#f4b4b4; }
  .err.on { display:block; }
  .home { display:inline-block; margin-top:18px; color:var(--muted); font-size:12px; text-decoration:none; }
</style>
</head>
<body>
  <div class="box">
    <img src="/images/logo.svg" alt="">
    <h1>لوحة التحكم</h1>
    <p class="sub">مدرسة الالفي الثانوية المشتركة<br>أدخل مفتاح اللوحة للمتابعة</p>
    <label for="pk">مفتاح اللوحة</label>
    <input id="pk" type="password" inputmode="text" autocomplete="off" placeholder="••••••••••••" autofocus>
    <button id="go">فتح اللوحة</button>
    <div class="err" id="err"></div>
    <a class="home" href="/">رجوع للموقع</a>
  </div>
<script>
(function () {
  var input = document.getElementById('pk');
  var btn = document.getElementById('go');
  var err = document.getElementById('err');
  var saved = localStorage.getItem('alalfi_panel_key');
  if (saved) input.value = saved;

  /* the key may come in the link: /panel/?k=... */
  var q = new URLSearchParams(location.search).get('k');
  if (q) { input.value = q; }

  function fail(msg) {
    err.textContent = msg;
    err.classList.add('on');
    btn.disabled = false;
    btn.textContent = 'فتح اللوحة';
  }

  async function go() {
    var key = input.value.trim();
    if (!key) { fail('اكتب المفتاح الأول'); return; }
    btn.disabled = true;
    btn.textContent = 'جارٍ التحقق...';
    err.classList.remove('on');
    try {
      var r = await fetch('/api/panel-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key })
      });
      var j = await r.json();
      if (j && j.ok) {
        localStorage.setItem('alalfi_panel_key', key);
        /* keep the query (u / link / did) so the personal link still works */
        location.href = '/panel/' + (location.search || '');
      } else {
        fail((j && j.error) || 'المفتاح غير صحيح');
      }
    } catch (e) {
      fail('تعذّر الاتصال بالسيرفر');
    }
  }
  btn.addEventListener('click', go);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });

  /* the key is remembered - so the gate opens by itself next time */
  if (input.value.trim()) setTimeout(go, 300);
})();
</script>
</body>
</html>`;

const PANEL_ORIGIN = 'https://alalfi-panel.pages.dev';
const PANEL_HOST = 'alalfi-panel.pages.dev';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  /* On the public site this path only points to the panel's own origin,
     so the home-screen app of the school site never contains the panel. */
  if (url.hostname !== PANEL_HOST) {
    const rest = url.pathname.replace(/^\/panel/, '') || '/';
    const target = PANEL_ORIGIN + '/panel' + (rest === '/' ? '/' : rest) + url.search;
    return html('', 302, { Location: target });
  }

  /* static files inside /panel/ (the manifest, icons...) are served as they are */
  const parts = url.pathname.split('/').filter(Boolean);   // ['panel', '<key>']
  const sub = parts[1] ? decodeURIComponent(parts[1]) : '';
  if (sub && sub.includes('.')) {
    const asset = await env.ASSETS.fetch(new Request(new URL(url.pathname, request.url)));
    if (asset && asset.ok) return new Response(asset.body, {
      status: 200,
      headers: {
        'Content-Type': asset.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    return html('<!doctype html><meta charset="utf-8"><title>404</title>', 404);
  }

  /* ---- a secret link: /panel/<key>/ ---- */
  const fromPath = sub;
  if (fromPath) {
    if (env.PANEL_KEY && timingSafeEqual(fromPath, env.PANEL_KEY)) {
      return html('', 302, { Location: '/panel/', 'Set-Cookie': setCookie(fromPath, MAX_AGE) });
    }
    return html('<!doctype html><meta charset="utf-8"><title>404</title>' +
      '<body style="font-family:sans-serif;background:#0b1220;color:#e8eefc;display:grid;place-items:center;height:100vh">' +
      '<div style="text-align:center"><h1 style="font-size:40px;margin:0">404</h1>' +
      '<p style="color:#8fa0b8">الصفحة غير موجودة</p></div></body>', 404);
  }

  /* ---- the cookie from a previous visit ---- */
  const cookie = readCookie(request, COOKIE);
  const ok = env.PANEL_KEY && cookie && timingSafeEqual(cookie, env.PANEL_KEY);
  if (!ok) {
    return html(GATE, 200, { 'Set-Cookie': setCookie('', 0) });
  }

  /* ---- the panel itself ---- */
  try {
    const asset = await env.ASSETS.fetch(new Request(new URL('/panel/index.html', request.url)));
    if (!asset || !asset.ok) throw new Error('missing panel page');
    let body = await asset.text();
    /* the panel is never indexed and never installed as its own app by mistake */
    body = body.replace('</head>',
      '<meta name="mobile-web-app-capable" content="no">\n' +
      '<meta name="apple-mobile-web-app-capable" content="no">\n' +
      '<link rel="manifest" href="/panel/manifest.webmanifest">\n</head>');
    return html(body, 200);
  } catch (e) {
    return html('<!doctype html><meta charset="utf-8"><title>خطأ</title>' +
      '<body style="font-family:sans-serif;background:#0b1220;color:#e8eefc;padding:40px">' +
      '<p>تعذّر تحميل اللوحة</p></body>', 500);
  }
}

export async function onRequestPost(context) {
  return new Response(null, { status: 405, headers: { ...SECURITY, Allow: 'GET' } });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
