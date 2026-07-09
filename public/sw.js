const CACHE_PREFIX = "bird-view-cache-";
const CACHE_NAME = `${CACHE_PREFIX}2026-07-09-1`;
const APP_SCOPE = "/bird-view/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE)) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(fetch(new Request(request, { cache: "no-store" })).catch(() => caches.match(APP_SCOPE)));
    return;
  }

  if (request.destination === "manifest") {
    event.respondWith(fetch(new Request(request, { cache: "no-store" })));
  }
});
