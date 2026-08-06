// ============================================================
// Utilidades comunes: sesión, usuario, navbar, logout, asignatura activa
// Requiere que config.js se haya cargado antes.
// ============================================================

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

/** Detiene cualquier lectura en curso y restaura el icono del botón activo. */
function detenerLectura() {
  if (sintesisVoz && sintesisVoz.speaking) sintesisVoz.cancel();
  if (botonVozActivo) {
    botonVozActivo.textContent = botonVozActivo.dataset.iconoReposo || "🔊";
    botonVozActivo.dataset.leyendo = "0";
  }
  botonVozActivo = null;
}

/**
 * Lee un texto en voz alta. Si se pasa `boton`, alterna su icono entre 🔊/⏸️
 * y si se pulsa dos veces el mismo botón, para la lectura en vez de reiniciarla.
 */
function leerTexto(texto, boton) {
  if (!sintesisVoz) return;
  const eraElMismo = boton && boton.dataset.leyendo === "1";
  detenerLectura();
  if (eraElMismo) return;

  const limpio = String(texto || "").replace(/\s+/g, " ").trim();
  if (!limpio) return;

  const utterancia = new SpeechSynthesisUtterance(limpio);
  utterancia.lang = "es-ES";
  utterancia.rate = 0.95;

  if (boton) {
    if (!boton.dataset.iconoReposo) boton.dataset.iconoReposo = boton.textContent;
    boton.textContent = "⏸️";
    boton.dataset.leyendo = "1";
    botonVozActivo = boton;
    utterancia.onend = () => {
      if (botonVozActivo === boton) {
        boton.textContent = boton.dataset.iconoReposo;
        boton.dataset.leyendo = "0";
        botonVozActivo = null;
      }
    };
  }

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
    const texto = hermanos.slice(desde).map((p) => p.textContent).join(". ");
    hermanos.forEach((p) => p.classList.remove("leyendo-desde"));
    parrafo.classList.add("leyendo-desde");
    detenerLectura();
    leerTexto(texto, null);
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
