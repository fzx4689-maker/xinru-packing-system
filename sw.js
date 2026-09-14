const SW_VERSION = 'xinru-pwa-v3-ios';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: '欣儒系統',
      body: event.data ? event.data.text() : '有新的通知'
    };
  }

  const title = data.title || '欣儒系統';

  const options = {
    body: data.body || '有新的工作通知',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'xinru-work',
    renotify: true,
    data: {
      url: data.url || './'
    },
    silent: false
  };

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    windows.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: data
      });
    });

    if (self.registration.setAppBadge) {
      try {
        await self.registration.setAppBadge(1);
      } catch (e) {}
    }

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || './',
    self.location.origin
  ).href;

  event.waitUntil((async () => {
    if (self.registration.clearAppBadge) {
      try {
        await self.registration.clearAppBadge();
      } catch (e) {}
    }

    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windows) {
      if ('focus' in client) {
        try {
          await client.navigate(target);
        } catch (e) {}

        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(target);
    }
  })());
});
