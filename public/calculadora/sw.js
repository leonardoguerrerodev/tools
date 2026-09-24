// Calculadora offline: la página y el motor quedan guardados. Página y catálogo: red primero (así se ven los cambios);
// el motor (lleva la versión en el nombre): caché primero. Solo se guardan respuestas OK, nunca la página de contraseña (401).
const CACHE = "calculadora-v1";
const BASICOS = ["./", "qalc/libqalculate-0.0.6.js", "qalc/libqalculate-0.0.6.wasm", "qalc/catalogo.json", "icono-192.png"];

self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // tasas de cambio y demás: directo a la red
  const guardar = r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); } return r; };
  if (/\/qalc\/libqalculate-/.test(url.pathname))
    e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).then(guardar)));
  else
    e.respondWith(fetch(e.request).then(guardar).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
