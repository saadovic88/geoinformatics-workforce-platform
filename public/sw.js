const CACHE_NAME = 'geoinformatics-shell-v7';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/assets/logo.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || /\.(?:js|css|woff2?)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Geoinformatics';
  const body = payload.body || '';
  const actionUrl = payload.actionUrl || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // The platform already plays its in-app sound/banner while visible; avoid
    // duplicate system popups in that case while still notifying in background.
    if (windows.some((client) => client.visibilityState === 'visible')) return;
    await self.registration.showNotification(title, {
      body,
      icon: '/assets/logo.jpg',
      badge: '/assets/logo.jpg',
      tag: payload.notificationId || `geoinformatics-${Date.now()}`,
      renotify: true,
      data: { actionUrl },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || '';
  const destination = new URL('/', self.location.origin);
  if (actionUrl) destination.searchParams.set('notification', actionUrl);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'OPEN_NOTIFICATION_ACTION', actionUrl });
      return;
    }
    await self.clients.openWindow(destination.href);
  })());
});
