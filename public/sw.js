// Minimal, seguro y sin duplicados
const CACHE_NAME = "precios-ar-v1";
const STATIC_ASSETS = [
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Ignorar errores de archivos que no existen (útil en desarrollo)
        }
      }
    })
  );
});

self.addEventListener("fetch", (e) => {
  // No interferir con Vite dev server
  if (e.request.url.includes(":5173") || e.request.url.includes("hot-update")) return;
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const response = await fetch(e.request);
        try {
          const cache = await caches.open(CACHE_NAME);
          cache.put(e.request, response.clone()).catch(() => {});
        } catch (e) {}
        return response;
      } catch (err) {
        return cached || new Response('', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});
// ...existing code...

  self.addEventListener("activate", (e) => {
    e.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    );
  });
