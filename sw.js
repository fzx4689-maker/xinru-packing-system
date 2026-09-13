const CACHE_NAME = "xinru-pwa-v1";

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

// 網路優先，避免系統一直卡在舊版
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
    tag: data.tag || "xinru-work",
    renotify: true,
    requireInteraction: !!data.urgent,
    data: {
      url: data.url || "./",
      kind: data.kind || ""
    }
  };

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clients) => {

      // App 正在前景開著時，交給網頁內的提醒聲處理，
      // 避免同一張訂單「系統通知 + 網頁聲音」重複提醒。
      const visibleClient = clients.find(
        (client) => client.visibilityState === "visible"
      );

      if (visibleClient) {
        visibleClient.postMessage({
          type: "PUSH_RECEIVED",
          payload: data
        });

        return;
      }

      // App 在背景或關閉時，顯示手機系統通知。
      return self.registration.showNotification(title, options);
    })
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
