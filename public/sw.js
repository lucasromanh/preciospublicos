// ========================================================
// 🚀 SERVICE WORKER — PWA "Precios Claros Argentina"
// Versión 2.1 — con actualización inmediata y caché segura
// ========================================================

const CACHE_NAME = "precios-ar-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

// ========== INSTALACIÓN ==========
self.addEventListener("install", (event) => {
  console.log("📦 Instalando Service Worker...");
  self.skipWaiting(); // 🔥 fuerza activación inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn("⚠️ No se pudo cachear:", asset);
        }
      }
    })
  );
});

// ========== ACTIVACIÓN ==========
self.addEventListener("activate", (event) => {
  console.log("✅ Activando Service Worker...");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim(); // 🔥 toma control inmediato de todas las pestañas
    })()
  );
});

// ========== FETCH ==========
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Evitar interferir con Vite y hot reload
  if (request.url.includes(":5173") || request.url.includes("hot-update")) return;

  // Evitar cachear peticiones de geolocalización o API dinámicas
  if (request.url.includes("/api") || request.url.startsWith("chrome-extension")) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch (error) {
        return cached || new Response("Offline", { status: 503 });
      }
    })()
  );
});
