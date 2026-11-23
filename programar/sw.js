// Service worker de Programar Cajeros: permite abrir la app sin internet.
// La página siempre se pide primero a internet (así llegan las versiones nuevas); si no hay, se usa la copia guardada.
// Solo cubre la carpeta programar/ (la app de cajeros tiene el suyo).
const VERSION = "pcaj-v1.0";
const ARCHIVOS = ["./", "./index.html", "./manifest.json", "../icon-192.png", "../icon-512.png", "../apple-touch-icon.png", "../favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(ARCHIVOS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("pcaj-") && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // La página: primero internet (para recibir actualizaciones), si no hay, la copia guardada
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => { const cp = r.clone(); if (r.ok) caches.open(VERSION).then(c => c.put("./index.html", cp)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // Resto (íconos, tipografía, Firebase): primero la copia guardada, si no, internet y se guarda
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com"))) {
      const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp));
    }
    return r;
  }).catch(() => hit)));
});
