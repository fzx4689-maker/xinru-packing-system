
/* 欣儒系統 PWA Service Worker */
'use strict';

const CACHE_NAME = 'xinru-static-v20261011-1';
const BASE = new URL('./', self.location.href);

const STATIC_FILES = [
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await Promise.allSettled(
      STATIC_FILES.map((path) =>
        cache.add(
          new Request(new URL(path, BASE), {
            cache: 'reload'
          })
        )
      )
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) =>
          key.startsWith('xinru-static-') &&
          key !== CACHE_NAME
        )
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE.pathname)
  ) return;

  // 首頁與 App 頁面優先使用網路新版
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-store' }))
    );
    return;
  }

  // 只快取 App 圖示及設定檔
  const isStatic = STATIC_FILES.some(
    (path) =>
      url.pathname === new URL(path, BASE).pathname
  );

  if (!isStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) return cached;

    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  })());
});
