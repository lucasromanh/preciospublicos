const CACHE_NAME = "precios-ar-v1";
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Ignorar errores de archivos que no existen (útil en desarrollo)
          // console.warn(`No se pudo cachear: ${asset}`);
        }
      }
    })
  );
});

self.addEventListener("fetch", (e) => {
  // Redirigir '/' a '/index.html' en desarrollo para evitar 404 con Vite
  if (e.request.mode === "navigate" && e.request.url.endsWith(":5173/")) {
    e.respondWith(fetch("/index.html"));
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (async () => {
        if (cached) return cached;
        try {
          const response = await fetch(e.request);
          try {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          } catch (err) {
            // ignore cache put errors
          }
          return response;
        } catch (err) {
          // Si falla el fetch, devolver cached si existe o un Response vacío
          return cached || new Response('', { status: 503, statusText: 'Service Unavailable' });
        }
      })();
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});
