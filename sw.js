/* ===== Service worker - Evts notifications for the school site ===== */
const CACHE = 'alalfi-v1';
const NEWS_TAG = 'alalfi-news';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

/* a real push (the app is closed) */
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (err) {
    data = { title: 'مدرسة الالفي', body: e.data ? e.data.text() : '' };
  }
  const title = data.title || 'مدرسة الالفي الثانوية المشتركة';
  const options = {
    body: data.body || '',
    icon: '/images/favicon.png',
    badge: '/images/favicon.png',
    image: data.image || '/images/logo.png',
    tag: data.tag || NEWS_TAG,
    renotify: true,
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/news.html' },
    vibrate: [120, 60, 120],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

/* a notification created by the page itself (the site is open) */
self.addEventListener('message', (e) => {
  const d = (e.data && e.data.type === 'notify') ? e.data : null;
  if (!d) return;
  e.waitUntil(self.registration.showNotification(d.title || 'مدرسة الالفي', {
    body: d.body || '',
    icon: '/images/favicon.png',
    badge: '/images/favicon.png',
    image: d.image || '/images/logo.png',
    tag: d.tag || NEWS_TAG,
    dir: 'rtl',
    lang: 'ar',
    data: { url: d.url || '/news.html' },
    vibrate: [120, 60, 120],
  }));
});

/* clicking a notification opens the right page */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/news.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
