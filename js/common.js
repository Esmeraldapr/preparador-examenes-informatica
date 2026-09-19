// ============================================================
// Utilidades comunes: sesión, usuario, navbar, logout, asignatura activa
// Requiere que config.js se haya cargado antes.
// ============================================================

// Icono de la pestaña en todas las páginas
(function () {
  if (!document.querySelector('link[rel~="icon"]')) {
    const l = document.createElement("link");
    l.rel = "icon";
    l.type = "image/png";
    l.href = "img/favicon-64.png";
    document.head.appendChild(l);
  }
})();

/** Devuelve la sesión activa o null. */
async function obtenerSesion() {
  const { data } = await sb.auth.getSession();
  return data.session || null;
}

/** Si no hay sesión, redirige a login.html. Devuelve la sesión si la hay. */
async function exigirSesion() {
  const sesion = await obtenerSesion();
  if (!sesion) {
    window.location.href = "login.html";
    return null;
  }
  return sesion;
}

/**
 * Obtiene (o crea si no existe) la fila de public.usuarios asociada
 * al usuario autenticado, y actualiza su última conexión / contador.
 */
async function obtenerOCrearUsuario(sesion) {
  const authId = sesion.user.id;
  let { data: usuario, error } = await sb
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", authId)
    .maybeSingle();

  if (!usuario) {
    const nombre = sesion.user.user_metadata?.nombre || null;
    const { data: nuevo, error: errInsert } = await sb
      .from("usuarios")
      .insert({
        auth_user_id: authId,
        email: sesion.user.email,
        nombre,
        numero_conexiones: 1,
        ultima_conexion: new Date().toISOString(),
      })
      .select()
      .single();
    if (errInsert) {
      console.error("Error creando usuario:", errInsert);
      return null;
    }
    usuario = nuevo;
  } else {
    const { data: actualizado } = await sb
      .from("usuarios")
      .update({
        ultima_conexion: new Date().toISOString(),
        numero_conexiones: (usuario.numero_conexiones || 0) + 1,
      })
      .eq("id", usuario.id)
      .select()
      .single();
    if (actualizado) usuario = actualizado;
  }
  return usuario;
}

async function cerrarSesion() {
  await sb.auth.signOut();
  window.location.href = "login.html";
}

/** Lee el id de asignatura activa desde la URL (?asignatura=ID). */
function obtenerAsignaturaId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("asignatura");
  return id ? parseInt(id, 10) : null;
}

/** Si no hay asignatura en la URL, vuelve a la portada. Devuelve el id o null. */
function exigirAsignaturaId() {
  const id = obtenerAsignaturaId();
  if (!id) {
    window.location.href = "index.html";
    return null;
  }
  return id;
}

/** Construye un enlace a `pagina` conservando la asignatura activa (y parámetros extra). */
function enlaceAsignatura(pagina, asignaturaId, extra) {
  return `${pagina}?asignatura=${asignaturaId}${extra ? "&" + extra : ""}`;
}

/**
 * Pinta la barra de navegación en el elemento con id="navbar".
 * `activa` es el nombre de archivo actual (ej. "temas.html").
 * `asignatura` es {id, nombre} de la asignatura activa, o null/undefined en la portada.
 */
function pintarNavbar(activa, usuario, asignatura) {
  const el = document.getElementById("navbar");
  if (!el) return;
  const nombre = usuario?.nombre || usuario?.email || "Estudiante";

  if (!asignatura) {
    el.innerHTML = `
      <div class="marca"><span class="emoji">🎓</span> Ingeniería Informática</div>
      <nav>
        <a href="index.html" class="${activa === "index.html" ? "activa" : ""}">🏫 Asignaturas</a>
        <a href="racha.html" class="${activa === "racha.html" ? "activa" : ""}">🔥 Mi racha</a>
      </nav>
      <div class="usuario">
        <span>👋 ${nombre}</span>
        <button id="btn-logout">Salir</button>
      </div>
    `;
    document.getElementById("btn-logout")?.addEventListener("click", cerrarSesion);
    return;
  }

  const enlaces = [
    ["asignatura.html", "🏠", "Dashboard"],
    ["aula0.html", "🌱", "Aula 0"],
    ["temas.html", "📚", "Repasar Tema"],
    ["practica.html", "⚡", "Practicar"],
    ["examenes.html", "📝", "Cuestionarios"],
    ["trucos.html", "💡", "Trucos"],
    ["graficas.html", "📈", "Gráficas"],
    ["formulas.html", "🧮", "Fórmulas"],
  ];

  el.innerHTML = `
    <div class="marca"><span class="emoji">🎓</span> ${asignatura.nombre}</div>
    <nav>
      <a href="index.html" title="Cambiar de asignatura">🏫 Asignaturas</a>
      <a href="racha.html">🔥 Mi racha</a>
      ${enlaces
        .map(
          ([href, icono, texto]) =>
            `<a href="${enlaceAsignatura(href, asignatura.id)}" class="${href === activa ? "activa" : ""}">${icono} ${texto}</a>`
        )
        .join("")}
    </nav>
    <div class="usuario">
      <span>👋 ${nombre}</span>
      <button id="btn-logout">Salir</button>
    </div>
  `;
  document.getElementById("btn-logout")?.addEventListener("click", cerrarSesion);
}

/** Formatea una fecha ISO a DD/MM. */
function formatoDiaMes(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Clave YYYY-MM-DD en horario local, usada para agrupar por día. */
function claveDia(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================================
// Accesibilidad: lectura en voz alta (para dislexia y similares) + lightbox de imágenes
// Disponible en todas las páginas porque common.js se carga siempre.
// ============================================================
const sintesisVoz = window.speechSynthesis || null;
let botonVozActivo = null;

const CLAVE_VELOCIDAD_VOZ = "velocidadLecturaWeb";
let velocidadLectura = parseFloat(localStorage.getItem(CLAVE_VELOCIDAD_VOZ)) || 1;

/** Inserta (una sola vez) el control flotante de velocidad de lectura. */
function crearControlVelocidadVoz() {
  if (!sintesisVoz || document.getElementById("control-velocidad-voz")) return;
  const cont = document.createElement("div");
  cont.id = "control-velocidad-voz";
  cont.className = "control-velocidad-voz";
  cont.title = "Velocidad de la lectura en voz alta";
  cont.innerHTML = `
    <span aria-hidden="true">🔊</span>
    <select id="selector-velocidad-voz" aria-label="Velocidad de lectura en voz alta">
      <option value="0.75">0.75×</option>
      <option value="1">1× (normal)</option>
      <option value="1.25">1.25×</option>
      <option value="1.5">1.5×</option>
      <option value="1.75">1.75×</option>
      <option value="2">2×</option>
    </select>
  `;
  document.body.appendChild(cont);
  const selector = document.getElementById("selector-velocidad-voz");
  selector.value = String(velocidadLectura);
  selector.addEventListener("change", () => {
    velocidadLectura = parseFloat(selector.value) || 1;
    localStorage.setItem(CLAVE_VELOCIDAD_VOZ, String(velocidadLectura));
  });
}
document.addEventListener("DOMContentLoaded", crearControlVelocidadVoz);
if (document.readyState === "complete" || document.readyState === "interactive") {
  crearControlVelocidadVoz();
}

// --- Resaltado palabra por palabra mientras se lee (como "Leer en voz alta"
// de Word), para dislexia y dificultades lectoras similares. ---
let palabrasResaltables = [];
let indicePalabraActual = -1;

/** Cuenta palabras separadas por espacios en un texto plano. */
function contarPalabras(txt) {
  const m = String(txt || "").trim().match(/\S+/g);
  return m ? m.length : 0;
}

/**
 * Envuelve (una sola vez, es idempotente) cada palabra del texto visible de
 * `el` en un <span class="palabra-tts">. Devuelve esos spans en orden.
 */
function envolverPalabras(el) {
  if (!el) return [];
  if (!el.dataset.palabrasEnvueltas) {
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((hijo) => {
        if (hijo.nodeType === Node.TEXT_NODE) {
          if (!hijo.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          hijo.textContent.split(/(\s+)/).forEach((parte) => {
            if (parte === "") return;
            if (/^\s+$/.test(parte)) {
              frag.appendChild(document.createTextNode(parte));
            } else {
              const span = document.createElement("span");
              span.className = "palabra-tts";
              span.textContent = parte;
              frag.appendChild(span);
            }
          });
          hijo.replaceWith(frag);
        } else if (hijo.nodeType === Node.ELEMENT_NODE && !hijo.classList.contains("palabra-tts")) {
          recorrer(hijo);
        }
      });
    };
    recorrer(el);
    el.dataset.palabrasEnvueltas = "1";
  }
  return Array.from(el.querySelectorAll(".palabra-tts"));
}

/** Quita el resaltado de palabra actual y olvida la lista en curso. */
function limpiarResaltadoPalabras() {
  if (indicePalabraActual >= 0 && palabrasResaltables[indicePalabraActual]) {
    palabrasResaltables[indicePalabraActual].classList.remove("palabra-tts-activa");
  }
  indicePalabraActual = -1;
  palabrasResaltables = [];
}

/** Detiene cualquier lectura en curso y restaura el icono del botón activo. */
function detenerLectura() {
  if (sintesisVoz && sintesisVoz.speaking) sintesisVoz.cancel();
  if (botonVozActivo) {
    botonVozActivo.textContent = botonVozActivo.dataset.iconoReposo || "🔊";
    botonVozActivo.dataset.leyendo = "0";
  }
  botonVozActivo = null;
  limpiarResaltadoPalabras();
}

/**
 * Lee en voz alta `prefijo` (texto plano corto, no se resalta; puede ser "")
 * seguido del texto visible de `elementos` (uno o varios nodos del DOM),
 * resaltando cada palabra de esos elementos según se va pronunciando — igual
 * que "Leer en voz alta" de Word. Si `elementos` es null, sólo lee `prefijo`
 * sin resaltar nada. Si se pasa `boton`, alterna su icono entre 🔊/⏸️ y si se
 * pulsa dos veces el mismo botón, para la lectura en vez de reiniciarla.
 */
function leerTexto(prefijo, elementos, boton) {
  if (!sintesisVoz) return;
  const eraElMismo = boton && boton.dataset.leyendo === "1";
  detenerLectura();
  if (eraElMismo) return;

  const lista = elementos ? (Array.isArray(elementos) ? elementos : [elementos]) : [];
  palabrasResaltables = [];
  lista.forEach((el) => palabrasResaltables.push(...envolverPalabras(el)));
  const textoElementos = palabrasResaltables.map((s) => s.textContent).join(" ");

  const limpio = `${prefijo || ""} ${textoElementos}`.replace(/\s+/g, " ").trim();
  if (!limpio) return;

  const utterancia = new SpeechSynthesisUtterance(limpio);
  utterancia.lang = "es-ES";
  utterancia.rate = velocidadLectura;

  const palabrasPrefijo = contarPalabras(prefijo);
  let contadorPalabraHablada = 0;
  if (palabrasResaltables.length) {
    utterancia.onboundary = (ev) => {
      if (ev.name && ev.name !== "word") return;
      if (indicePalabraActual >= 0 && palabrasResaltables[indicePalabraActual]) {
        palabrasResaltables[indicePalabraActual].classList.remove("palabra-tts-activa");
      }
      contadorPalabraHablada++;
      const idx = contadorPalabraHablada - palabrasPrefijo - 1;
      if (idx < 0 || idx >= palabrasResaltables.length) {
        indicePalabraActual = -1;
        return;
      }
      indicePalabraActual = idx;
      const span = palabrasResaltables[idx];
      span.classList.add("palabra-tts-activa");
      span.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
  }

  if (boton) {
    if (!boton.dataset.iconoReposo) boton.dataset.iconoReposo = boton.textContent;
    boton.textContent = "⏸️";
    boton.dataset.leyendo = "1";
    botonVozActivo = boton;
  }
  utterancia.onend = () => {
    limpiarResaltadoPalabras();
    if (boton && botonVozActivo === boton) {
      boton.textContent = boton.dataset.iconoReposo;
      boton.dataset.leyendo = "0";
      botonVozActivo = null;
    }
  };

  sintesisVoz.speak(utterancia);
}

/** Abre la imagen a pantalla completa (lightbox). */
function abrirLightbox(src, alt) {
  let overlay = document.getElementById("lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.innerHTML = `<img id="lightbox-img" src="" alt="" /><button id="lightbox-cerrar" title="Cerrar" aria-label="Cerrar">✕</button>`;
    document.body.appendChild(overlay);
  }
  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox-img").alt = alt || "";
  overlay.classList.add("activo");
}
function cerrarLightbox() {
  document.getElementById("lightbox-overlay")?.classList.remove("activo");
}

// Delegación global: párrafos pulsables (empiezan a leer desde donde se pulsa) y lightbox.
document.addEventListener("click", (e) => {
  const parrafo = e.target.closest(".parrafo-leible");
  if (parrafo) {
    const hermanos = Array.from(parrafo.parentElement.querySelectorAll(".parrafo-leible"));
    const desde = hermanos.indexOf(parrafo);
    hermanos.forEach((p) => p.classList.remove("leyendo-desde"));
    parrafo.classList.add("leyendo-desde");
    detenerLectura();
    leerTexto("", hermanos.slice(desde), null);
    return;
  }

  const img = e.target.closest(".ampliable");
  if (img) {
    abrirLightbox(img.currentSrc || img.src, img.alt);
    return;
  }

  if (e.target.closest("#lightbox-cerrar") || e.target.id === "lightbox-overlay") {
    cerrarLightbox();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarLightbox();
});
