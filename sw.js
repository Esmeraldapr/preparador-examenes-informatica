// ============================================================
// Service worker: hace que la web funcione con mala cobertura
// (metro, túneles) y abra al momento aunque Render esté «dormido».
//
// - Páginas, CSS y JS: se piden a internet; si tarda más de 4 s
//   o no hay conexión, se usa la copia guardada.
// - Imágenes y librería de Supabase: se usa la copia guardada al
//   momento y se actualiza por detrás.
// - Datos de Supabase (solo lecturas GET): se piden a internet;
//   si tarda más de 6 s o no hay conexión, se usa la última copia.
// - Nunca se guarda nada de inicio de sesión ni las escrituras.
// ============================================================

const VERSION = "v1-2026-10-16";
const CACHE_WEB = "web-" + VERSION;
const CACHE_IMG = "img-" + VERSION;
const CACHE_DATOS = "datos-" + VERSION;

// Lo básico para poder abrir la web sin conexión.
const PRECARGA = [
  "./",
  "index.html", "login.html", "asignatura.html", "examenes.html", "quiz.html",
  "practica.html", "temas.html", "tema.html", "clases.html", "clase.html",
  "formulas.html", "graficas.html", "trucos.html", "aula0.html", "aula0-unidad.html",
  "racha.html", "repaso.html", "plan.html", "historial.html", "entregables.html",
  "css/style.css", "css/racha.css", "css/login.css", "css/tema.css", "css/clase.css",
  "css/plan.css", "css/historial.css",
  "js/config.js", "js/common.js", "js/portada.js", "js/asignatura.js", "js/quiz.js",
  "js/examenes.js", "js/practica.js", "js/temas.js", "js/tema.js", "js/clases.js",
  "js/clase.js", "js/formulas.js", "js/graficas.js", "js/trucos.js", "js/aula0.js",
  "js/aula0-unidad.js", "js/racha.js", "js/repaso.js", "js/plan.js", "js/historial.js",
  "js/entregables.js",
  "img/logo.png", "img/favicon-64.png", "img/circuito-lateral.svg", "img/login-fondo.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_WEB).then((c) =>
      // Uno a uno: si falta alguno, no se rompe todo lo demás.
      Promise.all(PRECARGA.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves
          .filter((k) => ![CACHE_WEB, CACHE_IMG, CACHE_DATOS].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Al cerrar sesión, la web pide borrar los datos guardados.
self.addEventListener("message", (e) => {
  if (e.data === "borrar-datos") caches.delete(CACHE_DATOS);
});

/** Internet primero; si tarda más de `ms`, falla o el servidor da error 5xx, la copia guardada. */
function redPrimero(req, cacheNombre, ms, opcionesBusqueda) {
  const buscar = (cache) =>
    cache.match(req, { ignoreVary: true }).then(
      (m) => m || (opcionesBusqueda ? cache.match(req, { ignoreVary: true, ...opcionesBusqueda }) : undefined)
    );
  return caches.open(cacheNombre).then((cache) => {
    const red = fetch(req).then((resp) => {
      if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
      return resp;
    });
    const copia = new Promise((resolver) => {
      setTimeout(() => buscar(cache).then((m) => m && resolver(m)), ms);
    });
    return Promise.race([red.catch(() => null), copia]).then((r) => {
      if (r && r.status < 500) return r;
      return buscar(cache).then((m) => m || r || red);
    });
  });
}

/** Copia guardada al momento; se actualiza por detrás. */
function copiaPrimero(req, cacheNombre) {
  return caches.open(cacheNombre).then((cache) =>
    cache.match(req, { ignoreVary: true }).then((m) => {
      const red = fetch(req)
        .then((resp) => {
          if (resp && (resp.ok || resp.type === "opaque")) cache.put(req, resp.clone()).catch(() => {});
          return resp;
        })
        .catch(() => m);
      return m || red;
    })
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // Las escrituras van siempre directas.
  const url = new URL(req.url);

  // Inicio de sesión y tiempo real: nunca se guardan.
  if (url.pathname.includes("/auth/v1/") || url.pathname.includes("/realtime/")) return;

  // Datos de Supabase (lecturas).
  if (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/rest/v1/")) {
    e.respondWith(redPrimero(req, CACHE_DATOS, 6000));
    return;
  }

  // Imágenes de Supabase Storage y librerías de CDN.
  if (
    (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/")) ||
    url.hostname === "cdn.jsdelivr.net"
  ) {
    e.respondWith(copiaPrimero(req, CACHE_IMG));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Imágenes propias.
  if (/\.(png|jpe?g|svg|gif|webp|ico)$/i.test(url.pathname)) {
    e.respondWith(copiaPrimero(req, CACHE_IMG));
    return;
  }

  // Páginas, CSS y JS: internet primero (así se ven los cambios nuevos).
  e.respondWith(
    redPrimero(req, CACHE_WEB, 4000, { ignoreSearch: true }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(
        (m) => m || new Response("<h1>Sin conexión</h1><p>Vuelve a intentarlo cuando tengas cobertura.</p>", {
          status: 503, headers: { "Content-Type": "text/html; charset=utf-8" },
        })
      )
    )
  );
});
