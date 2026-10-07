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
    avisarRespuestasNuevas();
    return;
  }

  // La pestaña Entregables es solo para Esmeralda (en todas las asignaturas)
  const VE_ENTREGABLES = (usuario?.email || "").toLowerCase() === "esmeraldaparaiso7@gmail.com";
  const enlaces = [
    ["asignatura.html", "🏠", "Dashboard"],
    ["aula0.html", "🌱", "Aula 0"],
    ["temas.html", "📚", "Repasar Tema"],
    ["practica.html", "⚡", "Practicar"],
    ["examenes.html", "📝", "Cuestionarios"],
    ["trucos.html", "💡", "Trucos"],
    ["entregables.html", "📋", "Entregables"],
    ["graficas.html", "📈", "Gráficas"],
    ["formulas.html", "🧮", "Fórmulas"],
  ].filter(([href]) => href !== "entregables.html" || VE_ENTREGABLES);

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
  avisarRespuestasNuevas();
}

/**
 * Bocadillo que avisa de que ya hay respuesta a tus dudas (las que escribiste
 * en el desplegable 💬 de una pregunta). Sale una vez por página y desaparece
 * cuando lo cierras o entras en la pregunta.
 */
let avisoRespuestasHecho = false;
async function avisarRespuestasNuevas() {
  if (avisoRespuestasHecho) return;
  avisoRespuestasHecho = true;
  try {
    const { data, error } = await sb.rpc("comentarios_respuestas_nuevas");
    if (error || !data || !data.length) return;
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const ids = data.map((d) => d.id);
    const caja = document.createElement("div");
    caja.className = "aviso-respuestas";
    caja.setAttribute("role", "status");
    caja.innerHTML = `
      <button type="button" class="aviso-resp-cerrar" aria-label="Cerrar">✕</button>
      <div class="aviso-resp-titulo">💬 ${data.length === 1 ? "Tu respuesta está lista" : "Tus respuestas están listas"}</div>
      <ul>${data
        .map((d) => `<li><a href="${enlaceAsignatura("quiz.html", d.asignatura_id, "modo=examen&examen_id=" + d.examen_id)}" data-id="${d.id}">${esc(d.asignatura)} · ${esc(d.examen)} · pregunta ${d.orden}</a><span>${esc(d.texto).slice(0, 80)}</span></li>`)
        .join("")}</ul>
      <div class="aviso-resp-pie">Ábrela y mira el desplegable 💬</div>
      <button type="button" class="aviso-resp-vale">✓ Ya lo he visto, no me lo vuelvas a enseñar</button>`;
    document.body.appendChild(caja);

    // Marca las respuestas como vistas. IMPORTANTE: hay que ESPERAR a que
    // termine. Antes se lanzaba sin esperar y, al pulsar el enlace, el
    // navegador cambiaba de página y cancelaba la petición a medias: el aviso
    // volvía a salir una y otra vez aunque ya se hubiera leído.
    let marcado = false;
    const marcar = async () => {
      if (marcado) return;
      marcado = true;
      try {
        await sb.rpc("comentarios_marcar_vistos", { p_ids: ids });
      } catch (e) {
        marcado = false; // si falló, que se pueda reintentar
      }
    };

    const quitar = async () => {
      caja.remove();
      await marcar();
    };

    caja.querySelector(".aviso-resp-cerrar").addEventListener("click", quitar);
    caja.querySelector(".aviso-resp-vale").addEventListener("click", quitar);

    // Al abrir la pregunta: primero se marca y después se navega, para que no
    // se quede la petición a medias.
    caja.querySelectorAll("a[data-id]").forEach((a) =>
      a.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const destino = a.getAttribute("href");
        await marcar();
        window.location.href = destino;
      })
    );
  } catch (e) {
    /* el aviso es opcional: si falla, no molesta */
  }
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
    // Se sigue leyendo dentro del mismo bloque (por ejemplo, de un párrafo a la tabla que viene después).
    const bloque = parrafo.closest("[data-lectura]") || parrafo.parentElement;
    const hermanos = Array.from(bloque.querySelectorAll(".parrafo-leible"));
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

// ============================================================
// FRACCIONES APILADAS (numerador arriba, denominador abajo)
// Solo cambia cómo SE VE el texto: lo guardado en la base de datos no se toca.
// Se aplica únicamente a las asignaturas de la lista, para no estropear
// unidades como km/h o m/s en las demás.
// ============================================================
// INICIO-FRACCIONES
const ASIGNATURAS_CON_FRACCIONES = [1, 8]; // 1 = Cálculo, 8 = Matemática Discreta y Álgebra

(function () {
  const GRUPO = "\\((?:[^()]|\\([^()]*\\))*\\)";
  const PALABRA = "(?:[0-9]+(?:[.,][0-9]+)?|[A-Za-zπ]+|[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻⁺]+)";
  const TERMINO = "(?:" + GRUPO + "|" + PALABRA + ")+";
  const PATRON = new RegExp("(^|[^\\w/.:])(" + TERMINO + ")[ ]?/[ ]?(" + TERMINO + ")(?![/(0-9A-Za-zπ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻⁺])", "g");

  // ¿Todo el texto es un único paréntesis que abre al principio y cierra al final?
  function esUnSoloGrupo(t) {
    if (t.charAt(0) !== "(" || t.charAt(t.length - 1) !== ")") return false;
    let nivel = 0;
    for (let i = 0; i < t.length; i++) {
      if (t.charAt(i) === "(") nivel++;
      else if (t.charAt(i) === ")") {
        nivel--;
        if (nivel === 0 && i < t.length - 1) return false;
      }
    }
    return nivel === 0;
  }

  function quitarParentesis(t) {
    return esUnSoloGrupo(t) ? t.slice(1, -1) : t;
  }

  function convertir(texto) {
    return texto.replace(PATRON, function (m, previo, num, den, pos, todo) {
      const soloLetras = /^[A-Za-zπ]+$/;
      // dos palabras (km/h, TCP/IP, y/o...) no son una fracción
      if (soloLetras.test(num) && soloLetras.test(den)) return m;
      // "5 m/s²", "100 km/h": una cantidad con su unidad
      if (soloLetras.test(num) && num.length <= 3 && /[0-9]\s?$/.test(todo.slice(0, pos + previo.length))) return m;
      // un paréntesis seguido de una cifra o letra pegada, como (3/4)1/4, viene mal escrito: se deja tal cual
      if (/\)[0-9A-Za-zπ]/.test(num) || /\)[0-9A-Za-zπ]/.test(den)) return m;
      const n = convertir(quitarParentesis(num));
      const d = convertir(quitarParentesis(den));
      return (
        previo +
        '<span class="fr"><span class="n">' + n + '</span><span class="sr"> entre </span><span class="d">' + d + "</span></span>"
      );
    });
  }

  window.fraccionesApiladas = function (html, asignaturaId) {
    if (html === null || html === undefined) return html;
    const s = String(html);
    if (s.indexOf("/") === -1) return s;
    if (!ASIGNATURAS_CON_FRACCIONES.includes(Number(asignaturaId))) return s;
    // el texto se convierte; las etiquetas HTML y los dibujos SVG se dejan intactos
    return s
      .split(/(<svg[\s\S]*?<\/svg>|<[^>]+>)/i)
      .map(function (parte, i) { return i % 2 === 1 ? parte : convertir(parte); })
      .join("");
  };
})();
// FIN-FRACCIONES
