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

// ============================================================
// Mala cobertura (metro): copia de la web en el móvil, aviso de
// «sin conexión» y respuestas que se guardan y se envían al volver.
// ============================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

const COLA_INTENTOS = "cola_intentos";
const COLA_RACHA = "cola_racha";

function leerCola(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave)) || [];
  } catch (e) {
    return [];
  }
}
function escribirCola(clave, lista) {
  try {
    if (lista.length) localStorage.setItem(clave, JSON.stringify(lista));
    else localStorage.removeItem(clave);
  } catch (e) {}
}
/** Un error «de red» (sin cobertura o tiempo agotado) no trae código de la base de datos. */
function esErrorDeRed(error) {
  return !!error && !error.code;
}
function hoyMadrid() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

/** Guarda una respuesta. Si no hay cobertura, la deja en cola y la envía al volver. */
async function guardarIntento(fila) {
  const conFecha = { ...fila, fecha: fila.fecha || new Date().toISOString() };
  let error = null;
  try {
    ({ error } = await sb.from("intentos").insert(conFecha));
  } catch (e) {
    error = { message: String(e) };
  }
  if (error && esErrorDeRed(error)) {
    escribirCola(COLA_INTENTOS, [...leerCola(COLA_INTENTOS), conFecha]);
    pintarAvisoConexion();
  }
}

/** Marca una tarea de la racha; si no hay cobertura, la deja apuntada para hoy. */
async function completarBarraRacha(barra) {
  let res;
  try {
    res = await sb.rpc("racha_completar_barra_web", { p_barra: barra });
  } catch (e) {
    res = { data: null, error: { message: String(e) } };
  }
  if (res.error && esErrorDeRed(res.error)) {
    const cola = leerCola(COLA_RACHA).filter((x) => x.dia === hoyMadrid() && x.barra !== barra);
    escribirCola(COLA_RACHA, [...cola, { barra, dia: hoyMadrid() }]);
    res.pendiente = true;
    pintarAvisoConexion();
  }
  return res;
}

let enviandoPendientes = false;
/** Envía lo que se quedó guardado sin conexión (respuestas y tareas de la racha). */
async function enviarPendientes() {
  if (enviandoPendientes || !navigator.onLine) return;
  enviandoPendientes = true;
  try {
    const intentos = leerCola(COLA_INTENTOS);
    if (intentos.length) {
      const { error } = await sb.from("intentos").insert(intentos);
      if (!error || !esErrorDeRed(error)) escribirCola(COLA_INTENTOS, []);
    }
    const racha = leerCola(COLA_RACHA).filter((x) => x.dia === hoyMadrid());
    const quedan = [];
    for (const r of racha) {
      const { error } = await sb.rpc("racha_completar_barra_web", { p_barra: r.barra });
      if (error && esErrorDeRed(error)) quedan.push(r);
    }
    escribirCola(COLA_RACHA, quedan);
  } catch (e) {
  } finally {
    enviandoPendientes = false;
    pintarAvisoConexion();
  }
}

/** Pastilla abajo: «Sin conexión» o «X respuestas por enviar». */
function pintarAvisoConexion() {
  if (!document.body) return;
  let el = document.getElementById("aviso-conexion");
  const pendientes = leerCola(COLA_INTENTOS).length + leerCola(COLA_RACHA).length;
  const sinRed = !navigator.onLine;
  if (!sinRed && !pendientes) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "aviso-conexion";
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9000;" +
      "background:#00203F;color:#fff;border:1.5px solid #36ECDE;border-radius:999px;" +
      "padding:9px 16px;font-size:.88rem;font-weight:600;box-shadow:0 0 16px rgba(54,236,222,.45);" +
      "max-width:calc(100vw - 32px);text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = sinRed
    ? "📴 Sin cobertura: puedes seguir; lo que hagas se envía al volver" +
      (pendientes ? ` (${pendientes} pendiente${pendientes === 1 ? "" : "s"})` : "")
    : `🔄 Enviando ${pendientes} respuesta${pendientes === 1 ? "" : "s"} guardada${pendientes === 1 ? "" : "s"}…`;
}

window.addEventListener("online", () => {
  pintarAvisoConexion();
  enviarPendientes();
});
window.addEventListener("offline", pintarAvisoConexion);
window.addEventListener("load", () => {
  pintarAvisoConexion();
  enviarPendientes();
});

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
  // Se usa la copia guardada en el móvil para abrir al momento (también sin cobertura)
  // y por detrás se pide la versión nueva.
  const authId = sesion.user.id;
  const claveCopia = "usuario_" + authId;
  let copia = null;
  try {
    copia = JSON.parse(localStorage.getItem(claveCopia));
  } catch (e) {}

  const pedir = async () => {
    const { data: usuario, error } = await sb
      .from("usuarios")
      .select("*")
      .eq("auth_user_id", authId)
      .maybeSingle();
    if (error) return null; // Sin cobertura: no se intenta crear nada.

    let resultado = usuario;
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
      resultado = nuevo;
    } else {
      // La conexión se cuenta como mucho una vez cada 30 minutos (antes, en cada página).
      const ultima = Date.parse(usuario.ultima_conexion || 0) || 0;
      if (Date.now() - ultima > 30 * 60 * 1000) {
        const { data: actualizado } = await sb
          .from("usuarios")
          .update({
            ultima_conexion: new Date().toISOString(),
            numero_conexiones: (usuario.numero_conexiones || 0) + 1,
          })
          .eq("id", usuario.id)
          .select()
          .single();
        if (actualizado) resultado = actualizado;
      }
    }
    try {
      localStorage.setItem(claveCopia, JSON.stringify(resultado));
    } catch (e) {}
    return resultado;
  };

  if (copia && copia.auth_user_id === authId) {
    pedir().catch(() => {});
    return copia;
  }
  return await pedir();
}

async function cerrarSesion() {
  await enviarPendientes();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("usuario_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  // Borra la copia de los datos guardada en este dispositivo.
  try {
    navigator.serviceWorker?.controller?.postMessage("borrar-datos");
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k.startsWith("datos-")).map((k) => caches.delete(k)));
  } catch (e) {}
  await sb.auth.signOut().catch(() => {});
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
  const nombre = String(usuario?.nombre || usuario?.email || "Estudiante")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (!asignatura) {
    el.innerHTML = `
      <div class="marca"><span class="emoji">🎓</span> Ingeniería Informática</div>
      <nav>
        <a href="index.html" class="${activa === "index.html" ? "activa" : ""}">🏫 Asignaturas</a>
        ${usuario?.email === "esmeraldaparaiso7@gmail.com" ? `<a href="plan.html" class="${activa === "plan.html" ? "activa" : ""}">📅 Mi plan</a>` : ""}
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

  // Entregables ya no va en la barra de arriba: está en «Accesos rápidos» del dashboard.
  const enlaces = [
    ["asignatura.html", "🏠", "Dashboard"],
    ["aula0.html", "🌱", "Aula 0"],
    ["temas.html", "📚", "Repasar Tema"],
    ["clases.html", "🎓", "Clases"],
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
      ${usuario?.email === "esmeraldaparaiso7@gmail.com" ? `<a href="plan.html">📅 Mi plan</a>` : ""}
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
    caja.style.maxHeight = "85vh";
    caja.style.overflowY = "auto";
    caja.setAttribute("role", "status");
    caja.innerHTML = `
      <button type="button" class="aviso-resp-cerrar" aria-label="Cerrar">✕</button>
      <div class="aviso-resp-titulo">💬 ${data.length === 1 ? "Tu respuesta está lista" : "Tus respuestas están listas"}</div>
      <ul>${data
        .map((d) => `<li style="margin-bottom:10px">
          <div><b>Tu mensaje:</b> ${esc(d.texto).slice(0, 140)}</div>
          <div class="parrafo-leible" style="white-space:pre-line;max-height:40vh;overflow:auto;margin:6px 0;padding:8px;border-radius:8px;background:rgba(124,58,237,.08)"><b>Respuesta:</b> ${esc(d.respuesta || "")}</div>
          <a href="${enlaceAsignatura("quiz.html", d.asignatura_id, "modo=examen&examen_id=" + d.examen_id)}" data-id="${d.id}">Ver la pregunta (${esc(d.asignatura)} · ${esc(d.examen)} · pregunta ${d.orden})</a></li>`)
        .join("")}</ul>
      <div class="aviso-resp-pie">Pulsa en el texto de la respuesta para escucharla 🔊</div>
      <button type="button" class="aviso-resp-vale">✓ Ya lo he visto, no me lo vuelvas a enseñar</button>`;
    document.body.appendChild(caja);

    // Marca las respuestas como vistas. IMPORTANTE: hay que ESPERAR a que
    // termine. Antes se lanzaba sin esperar y, al pulsar el enlace, el
    // navegador cambiaba de página y cancelaba la petición a medias: el aviso
    // volvía a salir una y otra vez aunque ya se hubiera leído.
    let marcado = false;
    const marcar = async (lista) => {
      // Sin lista = todas (al cerrar el aviso o pulsar «Ya lo he visto»).
      // Con lista = solo esas (al abrir UNA pregunta; las demás siguen pendientes).
      const aMarcar = lista || ids;
      if (!lista) {
        if (marcado) return;
        marcado = true;
      }
      try {
        await sb.rpc("comentarios_marcar_vistos", { p_ids: aMarcar });
      } catch (e) {
        if (!lista) marcado = false; // si falló, que se pueda reintentar
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
        // Solo se marca la respuesta que se abre: al volver, las otras siguen saliendo.
        await marcar([Number(a.dataset.id)]);
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
    // Marca la última palabra de cada línea (salto de línea, <br> o fin de un bloque)
    // para que la voz haga una pausa aunque la línea no acabe en punto.
    let ultima = null;
    const marcarFin = () => { if (ultima) ultima.dataset.finLinea = "1"; };
    const BLOQUES = /^(P|DIV|LI|H[1-6]|TR|TD|TH|FIGCAPTION|BLOCKQUOTE|SECTION|UL|OL|TABLE)$/;
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((hijo) => {
        if (hijo.nodeType === Node.TEXT_NODE) {
          if (!hijo.textContent.trim()) { if (/\n/.test(hijo.textContent)) marcarFin(); return; }
          const frag = document.createDocumentFragment();
          hijo.textContent.split(/(\s+)/).forEach((parte) => {
            if (parte === "") return;
            if (/^\s+$/.test(parte)) {
              if (/\n/.test(parte)) marcarFin();
              frag.appendChild(document.createTextNode(parte));
            } else {
              const span = document.createElement("span");
              span.className = "palabra-tts";
              span.textContent = parte;
              frag.appendChild(span);
              ultima = span;
            }
          });
          hijo.replaceWith(frag);
        } else if (hijo.nodeType === Node.ELEMENT_NODE && !hijo.classList.contains("palabra-tts")) {
          if (hijo.dataset.noLeer === "1") return;
          if (hijo.tagName === "BR") { marcarFin(); return; }
          recorrer(hijo);
          if (BLOQUES.test(hijo.tagName)) marcarFin();
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
let lecturaActual = 0;

/** Botón «⏹ Parar» fijo abajo, visible solo mientras la voz está leyendo. */
function botonPararVoz(mostrar) {
  let b = document.getElementById("btn-parar-voz");
  if (!mostrar) { if (b) b.style.display = "none"; return; }
  if (!b) {
    b = document.createElement("button");
    b.id = "btn-parar-voz";
    b.type = "button";
    b.textContent = "🔊";
    b.title = "Pulsa para parar la voz";
    b.setAttribute("aria-label", "Parar la voz");
    b.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:10000;width:54px;height:54px;padding:0;" +
      "border:3px solid #fff;border-radius:50%;background:#7c3aed;font-size:24px;line-height:1;" +
      "box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;";
    b.addEventListener("click", (e) => { e.stopPropagation(); detenerLectura(); });
    document.body.appendChild(b);
  }
  b.style.display = "block";
}

function detenerLectura() {
  lecturaActual++;
  botonPararVoz(false);
  if (sintesisVoz && (sintesisVoz.speaking || sintesisVoz.pending)) sintesisVoz.cancel();
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
  // Trozos cortos (frase a frase): Android se calla sin avisar si recibe un texto muy largo de golpe.
  const trozos = [];
  const pre = String(prefijo || "").replace(/\s+/g, " ").trim();
  if (pre) trozos.push({ texto: pre, desde: -1 });
  lista.forEach((el) => {
    const spans = envolverPalabras(el);
    let actual = null;
    spans.forEach((sp) => {
      const idx = palabrasResaltables.push(sp) - 1;
      let w = sp.textContent;
      if (!actual) { actual = { palabras: [], desde: idx }; trozos.push(actual); }
      // Fin de línea sin punto: se le añade uno (solo para la voz, no se ve) y se corta ahí.
      const finLinea = sp.dataset.finLinea === "1";
      if (finLinea && !/[.!?;:,…]["»)]?$/.test(w)) w += ".";
      actual.palabras.push(w);
      const largo = actual.palabras.join(" ").length;
      if (finLinea || (/[.!?;:]["»)]?$/.test(w) && largo > 40) || largo > 220) actual = null;
    });
  });
  trozos.forEach((t) => { if (t.palabras) t.texto = t.palabras.join(" "); });
  const validos = trozos.filter((t) => t.texto && t.texto.trim());
  if (!validos.length) return;

  const miLectura = ++lecturaActual;
  botonPararVoz(true);
  if (boton) {
    if (!boton.dataset.iconoReposo) boton.dataset.iconoReposo = boton.textContent;
    boton.textContent = "⏸️";
    boton.dataset.leyendo = "1";
    botonVozActivo = boton;
  }
  const terminar = () => {
    if (miLectura !== lecturaActual) return;
    limpiarResaltadoPalabras();
    botonPararVoz(false);
    if (boton && botonVozActivo === boton) {
      boton.textContent = boton.dataset.iconoReposo;
      boton.dataset.leyendo = "0";
      botonVozActivo = null;
    }
  };

  const decir = (n) => {
    if (miLectura !== lecturaActual) return;
    if (n >= validos.length) { terminar(); return; }
    const t = validos[n];
    const u = new SpeechSynthesisUtterance(t.texto);
    u.lang = "es-ES";
    u.rate = velocidadLectura;
    if (t.desde >= 0) {
      let contador = 0;
      u.onboundary = (ev) => {
        if (miLectura !== lecturaActual) return;
        if (ev.name && ev.name !== "word") return;
        if (indicePalabraActual >= 0 && palabrasResaltables[indicePalabraActual]) {
          palabrasResaltables[indicePalabraActual].classList.remove("palabra-tts-activa");
        }
        const idx = t.desde + contador;
        contador++;
        if (idx >= t.desde + t.palabras.length || !palabrasResaltables[idx]) { indicePalabraActual = -1; return; }
        indicePalabraActual = idx;
        palabrasResaltables[idx].classList.add("palabra-tts-activa");
        palabrasResaltables[idx].scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
    }
    let hecho = false;
    const siguiente = () => { if (hecho) return; hecho = true; decir(n + 1); };
    u.onend = siguiente;
    u.onerror = (ev) => { if (ev && (ev.error === "interrupted" || ev.error === "canceled")) return; siguiente(); };
    sintesisVoz.speak(u);
  };
  decir(0);
}

/** Abre la imagen a pantalla completa (lightbox). */
// Visor de imágenes: tocar la imagen la amplía más (x2, x3 y vuelve al tamaño normal),
// se puede ampliar con dos dedos o con la rueda del ratón, y arrastrar para moverla.
const LB = { escala: 1, x: 0, y: 0 };
function lbAplicar(suave = true) {
  const img = document.getElementById("lightbox-img");
  if (!img) return;
  img.classList.toggle("lb-zoom", LB.escala > 1.01);
  if (!suave) img.classList.add("lb-arrastrando");
  img.style.transform = `translate(${LB.x}px, ${LB.y}px) scale(${LB.escala})`;
  const t = document.getElementById("lightbox-nivel");
  if (t) t.textContent = `x${LB.escala.toFixed(LB.escala % 1 ? 1 : 0)}`;
}
// Cambia la escala dejando quieto el punto (px, py) de la pantalla que se toca.
function lbZoomEn(nueva, px, py, suave = true) {
  const img = document.getElementById("lightbox-img");
  nueva = Math.min(6, Math.max(1, nueva));
  const ox = img.offsetLeft, oy = img.offsetTop; // esquina de la imagen sin mover (el visor ocupa toda la pantalla)
  const lx = (px - ox - LB.x) / LB.escala, ly = (py - oy - LB.y) / LB.escala; // punto dentro de la imagen
  LB.escala = nueva;
  if (nueva <= 1.01) { LB.escala = 1; LB.x = 0; LB.y = 0; }
  else { LB.x = px - ox - lx * nueva; LB.y = py - oy - ly * nueva; }
  lbAplicar(suave);
}
function lbCentro() {
  return [window.innerWidth / 2, window.innerHeight / 2];
}
function abrirLightbox(src, alt) {
  let overlay = document.getElementById("lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.innerHTML = `<img id="lightbox-img" src="" alt="" draggable="false" />
      <button id="lightbox-cerrar" title="Cerrar" aria-label="Cerrar">✕</button>
      <div id="lightbox-ayuda">Toca la imagen para ampliar más. Arrastra para moverla.</div>
      <div id="lightbox-barra">
        <button id="lightbox-menos" title="Hacer más pequeña" aria-label="Hacer más pequeña">➖</button>
        <span id="lightbox-nivel">x1</span>
        <button id="lightbox-mas" title="Ampliar más" aria-label="Ampliar más">➕</button>
        <button id="lightbox-normal" title="Tamaño normal" aria-label="Tamaño normal">↺</button>
      </div>`;
    document.body.appendChild(overlay);
    lbGestos(overlay, overlay.querySelector("#lightbox-img"));
  }
  const img = document.getElementById("lightbox-img");
  LB.escala = 1; LB.x = 0; LB.y = 0;
  img.style.transform = "";
  img.classList.remove("lb-zoom", "lb-arrastrando");
  img.src = src;
  img.alt = alt || "";
  document.getElementById("lightbox-nivel").textContent = "x1";
  overlay.classList.add("activo");
}
function lbGestos(overlay, img) {
  const dedos = new Map();
  let inicio = null, movido = false, pinza = null;
  img.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    img.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movido = false;
    if (dedos.size === 1) inicio = { x: e.clientX, y: e.clientY, lx: LB.x, ly: LB.y };
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      pinza = { d: Math.hypot(a.x - b.x, a.y - b.y), escala: LB.escala };
    }
  });
  img.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2 && pinza) {
      const [a, b] = [...dedos.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      movido = true;
      lbZoomEn(pinza.escala * (d / pinza.d), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
    } else if (dedos.size === 1 && inicio && LB.escala > 1) {
      const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) movido = true;
      LB.x = inicio.lx + dx; LB.y = inicio.ly + dy;
      lbAplicar(false);
    } else if (dedos.size === 1 && inicio) {
      if (Math.abs(e.clientX - inicio.x) + Math.abs(e.clientY - inicio.y) > 6) movido = true;
    }
  });
  const soltar = (e) => {
    if (!dedos.has(e.pointerId)) return;
    const eraUno = dedos.size === 1;
    dedos.delete(e.pointerId);
    img.classList.remove("lb-arrastrando");
    if (dedos.size < 2) pinza = null;
    if (eraUno && !movido && e.type === "pointerup") {
      // Toque sin mover: x1 → x2 → x3 → x1, ampliando donde se toca.
      const siguiente = LB.escala < 1.9 ? 2 : LB.escala < 2.9 ? 3 : 1;
      lbZoomEn(siguiente, e.clientX, e.clientY);
    }
    if (dedos.size === 1) {
      const [p] = [...dedos.values()];
      inicio = { x: p.x, y: p.y, lx: LB.x, ly: LB.y };
    } else inicio = null;
  };
  img.addEventListener("pointerup", soltar);
  img.addEventListener("pointercancel", soltar);
  overlay.addEventListener("wheel", (e) => {
    if (!overlay.classList.contains("activo")) return;
    e.preventDefault();
    lbZoomEn(LB.escala * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
  }, { passive: false });
  overlay.querySelector("#lightbox-mas").addEventListener("click", () => lbZoomEn(LB.escala + 1, ...lbCentro()));
  overlay.querySelector("#lightbox-menos").addEventListener("click", () => lbZoomEn(LB.escala - 1, ...lbCentro()));
  overlay.querySelector("#lightbox-normal").addEventListener("click", () => lbZoomEn(1, 0, 0));
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
    // Solo se encadena lo que se ve: nada de lo que está dentro de un desplegable cerrado ni oculto.
    // Y los trucos (💡 Ver trucos) no se leen solos: solo si se pulsa dentro de ellos.
    const dentroTrucos = !!parrafo.closest(".qz-trucos");
    const hermanos = Array.from(bloque.querySelectorAll(".parrafo-leible")).filter(
      (p) =>
        p === parrafo ||
        (!p.closest("details:not([open])") &&
          p.getClientRects().length > 0 &&
          (dentroTrucos || !p.closest(".qz-trucos")))
    );
    const desde = hermanos.indexOf(parrafo);
    // Si vuelve a pulsar el mismo párrafo desde el que se está leyendo, se para.
    if (parrafo.classList.contains("leyendo-desde") && sintesisVoz && sintesisVoz.speaking) {
      hermanos.forEach((p) => p.classList.remove("leyendo-desde"));
      detenerLectura();
      return;
    }
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
  if (!document.getElementById("lightbox-overlay")?.classList.contains("activo")) return;
  if (e.key === "+" || e.key === "=") lbZoomEn(LB.escala + 1, ...lbCentro());
  if (e.key === "-") lbZoomEn(LB.escala - 1, ...lbCentro());
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

// ============================================================
// ⏱ Cronómetro de Mi plan: empieza al abrir una tarea desde Mi plan y suma
// el tiempo de estudio de HOY en Supabase (tabla plan_tiempo). Solo cuenta con
// la página a la vista y si has tocado algo en los últimos 5 minutos
// (o si la voz está leyendo). Si no hay conexión, se guarda y se envía después.
// ============================================================
const CRONO_DIA = "plan_crono_dia";
const CRONO_PEND = "plan_crono_pend";
let cronoUltimoToque = Date.now();
let cronoEnviando = false;

function cronoActivar() {
  try { localStorage.setItem(CRONO_DIA, hoyMadrid()); } catch (e) { /* sin almacenamiento */ }
}
function cronoActivo() {
  try { return localStorage.getItem(CRONO_DIA) === hoyMadrid(); } catch (e) { return false; }
}
function cronoPendiente() {
  try {
    const o = JSON.parse(localStorage.getItem(CRONO_PEND) || "null");
    return o && o.dia === hoyMadrid() ? o.seg : 0;
  } catch (e) { return 0; }
}
function cronoGuardarPendiente(seg) {
  try { localStorage.setItem(CRONO_PEND, JSON.stringify({ dia: hoyMadrid(), seg })); } catch (e) { /* sin almacenamiento */ }
}
/** Suma `seg` segundos al tiempo de hoy (se envían en cuanto se pueda). */
function cronoSumar(seg) {
  if (seg > 0) cronoGuardarPendiente(cronoPendiente() + seg);
}
async function cronoEnviar() {
  const seg = Math.round(cronoPendiente());
  if (seg < 1 || cronoEnviando || typeof sb === "undefined") return;
  cronoEnviando = true;
  cronoGuardarPendiente(0);
  try {
    const { error } = await sb.rpc("plan_sumar_tiempo", { p_segundos: seg });
    if (error) cronoSumar(seg);
  } catch (e) {
    cronoSumar(seg);
  }
  cronoEnviando = false;
}
["click", "keydown", "scroll", "touchstart", "pointermove"].forEach((ev) =>
  document.addEventListener(ev, () => { cronoUltimoToque = Date.now(); }, { passive: true })
);
setInterval(() => {
  if (!cronoActivo() || document.visibilityState !== "visible") return;
  const hablando = (window.speechSynthesis && window.speechSynthesis.speaking) || window.cronoVideoSonando === true;
  if (!hablando && Date.now() - cronoUltimoToque > 5 * 60 * 1000) return;
  cronoSumar(15);
  if (cronoPendiente() >= 60) cronoEnviar();
}, 15000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") cronoEnviar(); });
window.addEventListener("pagehide", () => { cronoEnviar(); });
