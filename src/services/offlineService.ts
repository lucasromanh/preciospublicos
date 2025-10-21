// Servicio para manejo offline (Cache API)
export async function isOffline(): Promise<boolean> {
  return !navigator.onLine;
}

export async function cacheUrl(url: string) {
  if ('caches' in window) {
    const cache = await caches.open('precios-ar-v1');
    await cache.add(url);
  }
}
