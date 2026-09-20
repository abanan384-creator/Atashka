const CACHE_NAME = "sma-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Network-first for navigation requests (HTML) so deployments update immediately
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((res) => res || caches.match("/index.html"));
        })
    );
    return;
  }

  // Cache-first with network fallback for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          return null;
        })
      );
    })
  );
});

// PWA Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        client.focus();
        client.postMessage({
          type: "NOTIFICATION_CLICKED",
          eventId: event.notification.data?.eventId,
        });
        return;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
