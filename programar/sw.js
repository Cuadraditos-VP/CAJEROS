// Programar Cajeros se mudó a su propio repositorio (porogramar-cajeros): este service worker viejo se borra solo.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("pcaj-")) await caches.delete(k);
    await self.registration.unregister();
  })());
});
