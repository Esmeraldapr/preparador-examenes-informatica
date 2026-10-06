// ============================================================
// Tema completo — tema.html?asignatura=ID&tema=UD2
// El tema entero de la unidad (texto + figuras) para leerlo o ESCUCHARLO
// seguido (por ejemplo en el tren). El contenido está en la tabla
// `tema_completo`, en bloques separados por una línea en blanco:
//   ## Título            → apartado (sale en el índice)
//   ### Subtítulo        → subapartado
//   ![pie](img/x.png)    → figura con su pie
//   $ fórmula :: cómo se lee
//   > 🎯 Etiqueta: texto → cuadro (Recuerda, Nota, En el examen, Ojo, Vídeo…)
//   - elemento           → lista (una línea por elemento)
//   cualquier otra cosa  → párrafo
// La lectura va bloque a bloque (no en una sola frase gigante), para que no
// se corte en el móvil, y recuerda por dónde ibas.
// ============================================================

function tmEsc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Quita emojis y símbolos que el lector de voz pronunciaría raro. */
function tmVoz(t) {
  return String(t || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fórmula escrita en texto → HTML con subíndices y exponentes. */
function tmFormula(t) {
  return tmEsc(t)
    .replace(/\^\(([^)]*)\)/g, "<sup>$1</sup>")
    .replace(/_([A-Za-z0-9]+)/g, "<sub>$1</sub>");
}

const TM_TIPOS_NOTA = [
  [/^en el examen/i, "tm-examen"],
  [/^ojo/i, "tm-ojo"],
  [/^v[ií]deo|^viaja/i, "tm-video"],
];

/** Convierte el texto del tema en HTML. Devuelve { html, indice }. */
function tmPintar(texto) {
  const indice = [];
  let n = 0;
  const leible = (extra) => `class="tm-leible${extra ? " " + extra : ""}" title="Pulsa para escuchar desde aquí"`;
  const html = String(texto || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      let m;
      if (b.startsWith("### ")) return `<h3 ${leible()}>${tmEsc(b.slice(4))}</h3>`;
      if (b.startsWith("## ")) {
        const id = "tm-ap-" + ++n;
        indice.push({ id, titulo: b.slice(3) });
        return `<h2 id="${id}" ${leible()}>${tmEsc(b.slice(3))}</h2>`;
      }
      if ((m = b.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) {
        const ancha = /mapa/.test(m[2]) ? " tm-ancha" : "";
        return `<figure class="tm-fig${ancha}"><img class="ampliable" loading="lazy" src="${tmEsc(m[2])}" alt="${tmEsc(m[1])}" title="Pulsa para ver en grande" /><figcaption ${leible()} data-voz="${tmEsc("Imagen. " + tmVoz(m[1]))}">${tmEsc(m[1])}</figcaption></figure>`;
      }
      if (b.startsWith("$ ")) {
        const [exp, lee] = b.slice(2).split("::").map((x) => x.trim());
        return `<div class="tm-formula"><div class="tm-exp">${tmFormula(exp)}</div>${lee ? `<p ${leible("tm-lee")} data-voz="${tmEsc(tmVoz(lee))}">🔊 ${tmEsc(lee)}</p>` : ""}</div>`;
      }
      if (b.startsWith("> ")) {
        const cuerpo = b.slice(2);
        const corte = cuerpo.indexOf(":");
        const etiqueta = corte > 0 && corte < 30 ? cuerpo.slice(0, corte) : "";
        const resto = etiqueta ? cuerpo.slice(corte + 1).trim() : cuerpo;
        const limpia = tmVoz(etiqueta);
        const tipo = (TM_TIPOS_NOTA.find(([re]) => re.test(limpia)) || [null, ""])[1];
        return `<div ${leible("tm-nota " + tipo)} data-voz="${tmEsc(tmVoz(cuerpo))}">${etiqueta ? `<b>${tmEsc(etiqueta)}:</b> ` : ""}${tmEsc(resto)}</div>`;
      }
      if (b.startsWith("- ")) {
        return `<ul>${b.split("\n").map((l) => `<li ${leible()}>${tmEsc(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
      }
      return `<p ${leible()}>${tmEsc(b)}</p>`;
    })
    .join("");
  return { html, indice };
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const params = new URLSearchParams(window.location.search);
  const asigId = parseInt(params.get("asignatura"), 10);
  const clave = params.get("tema") || "";
  const num = /^UD\d+$/.test(clave) ? parseInt(clave.slice(2), 10) : null;
  if (!asigId || num === null) {
    window.location.href = "index.html";
    return;
  }

  const [asig, tema] = await Promise.all([
    sb.from("asignaturas").select("id, nombre").eq("id", asigId).maybeSingle(),
    sb.from("tema_completo").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).maybeSingle(),
  ]);
  pintarNavbar("temas.html", usuario, asig.data || null);

  const cont = document.getElementById("tm-cuerpo");
  if (!tema.data) {
    document.getElementById("tm-titulo").textContent = "📖 Tema completo";
    cont.innerHTML = `<div class="vacio"><div class="icono">📭</div>Todavía no está cargado el tema completo de esta unidad.<br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("temas.html", asigId)}">Volver a los temas</a></div>`;
    return;
  }
  const t = tema.data;
  document.title = `Tema completo · UD${num} ${t.titulo}`;
  document.getElementById("tm-titulo").textContent = `📖 UD${num}. ${t.titulo}`;
  document.getElementById("tm-subtitulo").textContent = `${asig.data ? asig.data.nombre : ""} · Tema completo con sus imágenes. Pulsa ▶ para escucharlo seguido, o toca cualquier párrafo para empezar desde ahí.`;

  const { html, indice } = tmPintar(t.contenido);

  // ---- Enlaces del tema (vídeos, simuladores, fuentes) ----
  const enlaces = Array.isArray(t.enlaces) ? t.enlaces : [];
  const grupos = [];
  enlaces.forEach((e) => {
    let g = grupos.find((x) => x.nombre === (e.grupo || "Enlaces"));
    if (!g) grupos.push((g = { nombre: e.grupo || "Enlaces", lista: [] }));
    g.lista.push(e);
  });
  const htmlEnlaces = enlaces.length
    ? `<details class="panel rc-desplegable" id="tm-enlaces" open>
        <summary>🔗 Enlaces y vídeos del tema (${enlaces.length})</summary>
        ${grupos
          .map(
            (g) => `<div class="tm-grupo">${tmEsc(g.nombre)}</div>` +
              g.lista
                .map(
                  (e) => `<div class="tm-enlace">
                    <div><b>${tmEsc(e.titulo)}</b></div>
                    ${e.para_que ? `<div class="subtitulo">${tmEsc(e.para_que)}</div>` : ""}
                    <a class="btn btn-secundario" href="${tmEsc(e.url)}" target="_blank" rel="noopener">${e.tipo === "video" ? "▶ Ver vídeo" : "Abrir enlace ↗"}</a>
                  </div>`
                )
                .join("")
          )
          .join("")}
      </details>`
    : "";

  const botones = `
    <div class="rc-cta">
      ${t.examen_practica_id ? `<a class="btn btn-primario" href="${enlaceAsignatura("quiz.html", asigId, "modo=examen&examen_id=" + t.examen_practica_id)}">📝 Hacer el test de práctica del tema</a>` : ""}
      ${t.unidad ? `<a class="btn btn-secundario" href="${enlaceAsignatura("quiz.html", asigId, "modo=tema&unidad=" + encodeURIComponent(t.unidad))}">🎯 Todas las preguntas de este tema</a>` : ""}
      <a class="btn btn-secundario" href="${enlaceAsignatura("temas.html", asigId)}">← Volver a los temas</a>
    </div>`;

  cont.innerHTML = `
    <div class="tm-reproductor" id="tm-reproductor">
      <button type="button" id="tm-atras" title="Párrafo anterior" aria-label="Párrafo anterior">⏮</button>
      <button type="button" id="tm-play">▶ Escuchar</button>
      <button type="button" id="tm-adelante" title="Párrafo siguiente" aria-label="Párrafo siguiente">⏭</button>
      <select id="tm-indice" aria-label="Ir a un apartado">
        <option value="">📑 Ir a un apartado…</option>
        ${indice.map((a) => `<option value="${a.id}">${tmEsc(a.titulo)}</option>`).join("")}
        ${enlaces.length ? `<option value="tm-enlaces">🔗 Enlaces y vídeos</option>` : ""}
      </select>
      <div class="tm-barra"><div id="tm-progreso"></div></div>
      <div class="tm-estado" id="tm-estado"></div>
    </div>
    ${botones}
    <div class="panel tm-tema" id="tm-tema">${html}</div>
    ${htmlEnlaces}
    ${botones}`;

  // ---------------- Reproductor ----------------
  const voz = window.speechSynthesis || null;
  const bloques = Array.from(document.querySelectorAll("#tm-tema .tm-leible"));
  const btnPlay = document.getElementById("tm-play");
  const estado = document.getElementById("tm-estado");
  const progreso = document.getElementById("tm-progreso");
  const CLAVE_POS = `tema_pos_${asigId}_${clave}`;
  let actual = 0;
  let sonando = false;
  let turno = 0; // invalida los "onend" de lecturas canceladas
  let bloqueoPantalla = null;

  try {
    const guardado = parseInt(localStorage.getItem(CLAVE_POS), 10);
    if (guardado > 0 && guardado < bloques.length) actual = guardado;
  } catch (e) { /* sin almacenamiento: se empieza desde el principio */ }

  function pintarEstado() {
    progreso.style.width = `${bloques.length ? Math.round(((actual + (sonando ? 1 : 0)) / bloques.length) * 100) : 0}%`;
    btnPlay.textContent = sonando ? "⏸ Pausar" : actual > 0 ? "▶ Seguir" : "▶ Escuchar";
    if (!voz) estado.textContent = "Este navegador no puede leer en voz alta. Prueba con Chrome o Safari.";
    else if (sonando) estado.textContent = `Leyendo el párrafo ${actual + 1} de ${bloques.length}. La velocidad se cambia con el botón 🔊 de abajo a la derecha.`;
    else if (actual > 0) estado.textContent = `Lo dejaste en el párrafo ${actual + 1} de ${bloques.length}. Pulsa «Seguir» o toca otro párrafo.`;
    else estado.textContent = `${bloques.length} párrafos. Deja la pantalla encendida mientras escuchas.`;
  }

  function marcar(i, desplazar) {
    bloques.forEach((b) => b.classList.remove("tm-activo"));
    const el = bloques[i];
    if (!el) return;
    el.classList.add("tm-activo");
    if (desplazar) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function pantallaEncendida(si) {
    try {
      if (si && navigator.wakeLock && !bloqueoPantalla) {
        bloqueoPantalla = await navigator.wakeLock.request("screen");
        bloqueoPantalla.addEventListener("release", () => (bloqueoPantalla = null));
      } else if (!si && bloqueoPantalla) {
        await bloqueoPantalla.release();
        bloqueoPantalla = null;
      }
    } catch (e) { /* no pasa nada si el navegador no lo permite */ }
  }

  function parar() {
    turno++;
    sonando = false;
    if (voz) voz.cancel();
    pantallaEncendida(false);
    pintarEstado();
  }

  function leerActual() {
    if (!voz) return;
    if (actual >= bloques.length) {
      actual = 0;
      parar();
      try { localStorage.removeItem(CLAVE_POS); } catch (e) {}
      estado.textContent = "✅ Has terminado el tema. Ahora puedes hacer el test de práctica.";
      return;
    }
    const el = bloques[actual];
    const texto = el.dataset.voz || tmVoz(el.textContent);
    const mio = ++turno;
    sonando = true;
    marcar(actual, true);
    pintarEstado();
    try { localStorage.setItem(CLAVE_POS, String(actual)); } catch (e) {}
    if (!texto) {
      actual++;
      leerActual();
      return;
    }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES";
    u.rate = typeof velocidadLectura === "number" ? velocidadLectura : 1;
    const seguir = () => {
      if (mio !== turno || !sonando) return;
      actual++;
      leerActual();
    };
    u.onend = seguir;
    u.onerror = (ev) => {
      if (ev.error === "canceled" || ev.error === "interrupted" || mio !== turno) return;
      parar();
      estado.textContent = "No se ha podido leer en voz alta en este navegador. Prueba con Chrome o Safari, o revisa el volumen.";
    };
    voz.cancel();
    voz.speak(u);
  }

  function empezarEn(i) {
    if (typeof detenerLectura === "function") detenerLectura();
    actual = Math.max(0, Math.min(i, bloques.length - 1));
    pantallaEncendida(true);
    leerActual();
  }

  btnPlay.addEventListener("click", () => (sonando ? parar() : empezarEn(actual)));
  document.getElementById("tm-atras").addEventListener("click", () => {
    const i = Math.max(0, actual - 1);
    if (sonando) empezarEn(i);
    else { actual = i; marcar(actual, true); pintarEstado(); }
  });
  document.getElementById("tm-adelante").addEventListener("click", () => {
    const i = Math.min(bloques.length - 1, actual + 1);
    if (sonando) empezarEn(i);
    else { actual = i; marcar(actual, true); pintarEstado(); }
  });
  document.getElementById("tm-tema").addEventListener("click", (e) => {
    const el = e.target.closest(".tm-leible");
    if (!el) return;
    empezarEn(bloques.indexOf(el));
  });
  document.getElementById("tm-indice").addEventListener("change", (e) => {
    const destino = document.getElementById(e.target.value);
    e.target.value = "";
    if (!destino) return;
    const i = bloques.indexOf(destino);
    if (i >= 0) {
      if (sonando) { empezarEn(i); return; }
      actual = i;
      marcar(actual, false);
      pintarEstado();
    }
    destino.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  // Al volver a la pestaña con la lectura en marcha, se recupera el bloqueo de pantalla.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && sonando) pantallaEncendida(true);
  });
  window.addEventListener("pagehide", () => { if (voz) voz.cancel(); });

  if (actual > 0) marcar(actual, false);
  pintarEstado();
})();
