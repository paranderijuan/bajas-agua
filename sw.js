/* Hace que la app abra sin señal.
   La página se busca primero en internet (para que siempre tengas la última versión)
   y, si no hay señal, se usa la copia guardada. El resto va directo de la copia. */
var CACHE = "ypoti-v2";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(["./", "./index.html"]); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function guardar(req, res) {
  var copia = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copia); }).catch(function () {});
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  // Nunca guardar las llamadas a la planilla
  if (req.url.indexOf("script.google.com") !== -1 ||
      req.url.indexOf("script.googleusercontent.com") !== -1) return;

  var esPagina = req.mode === "navigate" ||
                 (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (esPagina) {
    e.respondWith(
      fetch(req).then(function (res) { return guardar(req, res); })
                .catch(function () {
                  return caches.match(req).then(function (hit) {
                    return hit || caches.match("./index.html");
                  });
                })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return guardar(req, res); })
                              .catch(function () { return hit; });
    })
  );
});
