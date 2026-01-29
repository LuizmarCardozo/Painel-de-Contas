const CACHE_NAME = "contas-pwa-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/db.js",
  "/pwa.js",
  "/manifest.webmanifest",
  // CDN pode falhar em alguns ambientes; se quiser 100% offline, baixe o dexie e sirva local.
  "https://unpkg.com/dexie@3/dist/dexie.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // best-effort: se algum asset falhar, ainda instala
    await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

// Estratégia:
// - HTML: network-first (para pegar updates)
// - Outros: cache-first (para desempenho/offline)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  event.respondWith((async () => {
    if (isHTML) {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("/index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("/index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    }

    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return new Response("", { status: 504 });
    }
  })());
});
