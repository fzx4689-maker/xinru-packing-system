const CACHE_NAME = "xinru-pwa-v2";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// 安裝
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .catch(() => null)
  );
});

// 啟用新版
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),

      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
    ])
  );
});

// 網路優先
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, copy))
          .catch(() => {});

        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then((cached) => cached || caches.match("./index.html"))
      )
  );
});

// 收到手機 Push
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {
      title: "欣儒系統",
      body: event.data ? event.data.text() : "有新的工作通知"
    };
  }

  const title = data.title || "欣儒系統";

  const options = {
    body: data.body || "有新的工作通知",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.tag || ("xinru-work-" + Date.now()),
    renotify: true,
    requireInteraction: !!data.urgent,

    data: {
      url: data.url || "./",
      kind: data.kind || "",
      target_user_id: data.target_user_id || null
    }
  };

  event.waitUntil(
    Promise.all([
      // 不管 App 在前景、背景或關閉
      // 都一定顯示手機系統通知
      self.registration.showNotification(title, options),

      // 如果 App 有開著，再通知網頁播放自訂提醒聲
      self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      }).then((clients) => {
        clients.forEach((client) => {
          if (client.visibilityState === "visible") {
            client.postMessage({
              type: "PUSH_RECEIVED",
              payload: data
            });
          }
        });
      })
    ])
  );
});

// 點手機通知
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    event.notification?.data?.url || "./";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(async (clients) => {

      for (const client of clients) {
        if ("focus" in client) {
          try {
            await client.navigate(targetUrl);
          } catch (_) {}

          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
