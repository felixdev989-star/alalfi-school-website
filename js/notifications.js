/* ===== News notifications for the school site =====
   1) asks the visitor for the notification permission
   2) shows a notification whenever a new news item is published
   3) subscribes to the real push service so the notification arrives
      even when the site is closed                                          */
(function () {
  'use strict';

  var VAPID_PUBLIC = 'BFAyjc4S3lGK_ldVWoDINYbwJL6fzAgwh6ziQel8fFemEHEo78u9ookZdIdRFv5qxuzj66jdK8oQ2L3uXAJBfyw';
  var LAST_KEY = 'alalfi_last_news';
  var SUB_KEY = 'alalfi_push_sub';
  var ASKED_KEY = 'alalfi_notify_asked';
  var CHECK_EVERY = 120000;   /* 2 minutes */

  var supported = ('Notification' in window) && ('serviceWorker' in navigator);

  /* ---------- the service worker ---------- */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) { return reg; })
      .catch(function () { return null; });
  }

  /* ---------- the permission banner ---------- */
  function askBanner() {
    if (!supported) return;
    if (Notification.permission === 'granted') { start(); return; }
    if (Notification.permission === 'denied') return;
    try { if (localStorage.getItem(ASKED_KEY)) return; } catch (e) { /* ignore */ }
    try { localStorage.setItem(ASKED_KEY, '1'); } catch (e) { /* ignore */ }

    var box = document.createElement('div');
    box.className = 'notify-banner';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<div class="notify-banner-icon">🔔</div>' +
      '<div class="notify-banner-text"><strong>وصلّك كل خبر جديد</strong>' +
      '<span>فعّل الإشعارات عشان يوصلك أي خبر جديد أول ما ينزل.</span></div>' +
      '<button class="notify-banner-yes">فعّل</button>' +
      '<button class="notify-banner-no" aria-label="إغلاق">✕</button>';
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('show'); });

    var close = function () {
      box.classList.remove('show');
      setTimeout(function () { box.remove(); }, 400);
    };
    box.querySelector('.notify-banner-no').addEventListener('click', close);
    box.querySelector('.notify-banner-yes').addEventListener('click', function () {
      Notification.requestPermission().then(function (perm) {
        close();
        if (perm === 'granted') start();
      });
    });
    setTimeout(function () { if (box.isConnected) close(); }, 20000);
  }

  /* ---------- the real push subscription ---------- */
  function subscribe(reg) {
    if (!reg || !reg.pushManager || !('PushManager' in window)) return Promise.resolve(null);
    return reg.pushManager.getSubscription().then(function (sub) {
      if (sub) return sub;
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }).then(function (sub) {
      if (!sub) return null;
      var json = sub.toJSON ? sub.toJSON() : { endpoint: sub.endpoint, keys: sub.keys };
      try { localStorage.setItem(SUB_KEY, JSON.stringify(json)); } catch (e) { /* ignore */ }
      return fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      }).catch(function () { /* ignore */ }).then(function () { return json; });
    }).catch(function () { return null; });
  }

  function urlB64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  /* ---------- the new-news check ---------- */
  function latestNewsId() {
    try {
      var d = (window.SITE_DATA && window.SITE_DATA.news) || [];
      if (!d.length) return '';
      var newest = d.reduce(function (a, b) {
        return (String(b.date || '') + String(b.id || '')) > (String(a.date || '') + String(a.id || '')) ? b : a;
      }, d[0]);
      return String(newest.id || '');
    } catch (e) { return ''; }
  }

  function notifyNew(reg, id) {
    if (!id) return;
    var seen = '';
    try { seen = localStorage.getItem(LAST_KEY) || ''; } catch (e) { /* ignore */ }
    if (!seen) {
      try { localStorage.setItem(LAST_KEY, id); } catch (e) { /* ignore */ }
      return;                                   /* the first visit: no notification */
    }
    if (seen === id) return;
    try { localStorage.setItem(LAST_KEY, id); } catch (e) { /* ignore */ }

    var item = null;
    try {
      var d = (window.SITE_DATA && window.SITE_DATA.news) || [];
      item = d.find(function (n) { return String(n.id || '') === id; });
    } catch (e) { /* ignore */ }

    var title = 'خبر جديد من مدرسة الالفي';
    var body = (item && item.title) ? item.title : 'تم نشر خبر جديد على الموقع';
    if (reg && reg.active) {
      reg.active.postMessage({ type: 'notify', title: title, body: body, url: '/news.html' });
    } else if (supported && Notification.permission === 'granted') {
      try { new Notification(title, { body: body, icon: '/images/favicon.png', tag: 'alalfi-news' }); } catch (e) { /* ignore */ }
    }
  }

  var regRef = null;

  function start() {
    registerSW().then(function (reg) {
      regRef = reg;
      subscribe(reg);
      setTimeout(function () { check(); }, 1500);
    });
    setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) check();
    });
    window.addEventListener('focus', check);
  }

  function check() {
    fetch('/api/data', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) {
        if (res && res.data && res.data.news) {
          window.SITE_DATA = res.data;
          notifyNew(regRef, latestNewsId());
        }
      })
      .catch(function () { /* ignore */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(askBanner, 2500);
  });
})();
