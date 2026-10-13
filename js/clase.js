// ============================================================
// Una clase del profesor — clase.html?asignatura=ID&clase=1
// Las clases en directo (sesiones síncronas) van en su propia
// pestaña, no dentro de las unidades: clase 1, clase 2…
// El texto está en la tabla `clases` y se escribe en bloques,
// igual que el tema completo:
//   ## Título            → apartado (sale en el índice)
//   ### Subtítulo        → subapartado
//   ![pie](img/x.png)    → figura con su pie
//   $ fórmula :: cómo se lee
//   > 🎯 Etiqueta: texto → cuadro (En el examen, Ojo, Clase…)
//   - elemento           → lista (una línea por elemento)
//   cualquier otra cosa  → párrafo
// Además, en `clase_fichas` están las fichas ORIGINALES del
// profesor (sus diapositivas y sus hojas de ejercicios), que se
// ven en una galería al final y se pueden ampliar.
// Se puede leer o escuchar seguida, como el tema.
// ============================================================

function clEsc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Quita emojis y símbolos que el lector de voz pronunciaría raro. */
function clVoz(t) {
  return String(t || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fórmula escrita en texto → HTML con subíndices y exponentes. */
function clFormula(t) {
  return clEsc(t)
    .replace(/\^\(([^)]*)\)/g, "<sup>$1</sup>")
    .replace(/_([A-Za-z0-9]+)/g, "<sub>$1</sub>");
}

const CL_TIPOS_NOTA = [
  [/^en el examen/i, "tm-examen"],
  [/^ojo/i, "tm-ojo"],
  [/^v[ií]deo|^viaja/i, "tm-video"],
];

/** Convierte el texto del tema en HTML. Devuelve { html, indice }. */
function clPintar(texto) {
  const indice = [];
  let n = 0;
  const leible = (extra) => `class="tm-leible${extra ? " " + extra : ""}" title="Pulsa para escuchar desde aquí"`;
  const html = String(texto || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      let m;
      if (b.startsWith("### ")) return `<h3 ${leible()}>${clEsc(b.slice(4))}</h3>`;
      if (b.startsWith("## ")) {
        const id = "tm-ap-" + ++n;
        indice.push({ id, titulo: b.slice(3) });
        return `<h2 id="${id}" ${leible()}>${clEsc(b.slice(3))}</h2>`;
      }
      if ((m = b.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) {
        // Las fichas del profesor (diapositivas apaisadas) se ven más grandes.
        const ancha = /mapa|\/clases\//.test(m[2]) ? " tm-ancha" : "";
        return `<figure class="tm-fig${ancha}"><img class="ampliable" loading="lazy" src="${clEsc(m[2])}" alt="${clEsc(m[1])}" title="Pulsa para ver en grande" /><figcaption ${leible()} data-voz="${clEsc("Imagen. " + clVoz(m[1]))}">${clEsc(m[1])}</figcaption></figure>`;
      }
      if (b.startsWith("$ ")) {
        const [exp, lee] = b.slice(2).split("::").map((x) => x.trim());
        return `<div class="tm-formula"><div class="tm-exp">${clFormula(exp)}</div>${lee ? `<p ${leible("tm-lee")} data-voz="${clEsc(clVoz(lee))}">🔊 ${clEsc(lee)}</p>` : ""}</div>`;
      }
      if (b.startsWith("> ")) {
        const cuerpo = b.slice(2);
        const corte = cuerpo.indexOf(":");
        const etiqueta = corte > 0 && corte < 30 ? cuerpo.slice(0, corte) : "";
        const resto = etiqueta ? cuerpo.slice(corte + 1).trim() : cuerpo;
        const limpia = clVoz(etiqueta);
        const tipo = (CL_TIPOS_NOTA.find(([re]) => re.test(limpia)) || [null, ""])[1];
        return `<div ${leible("tm-nota " + tipo)} data-voz="${clEsc(clVoz(cuerpo))}">${etiqueta ? `<b>${clEsc(etiqueta)}:</b> ` : ""}${clEsc(resto)}</div>`;
      }
      if (b.startsWith("- ")) {
        return `<ul>${b.split("\n").map((l) => `<li ${leible()}>${clEsc(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
      }
      return `<p ${leible()}>${clEsc(b)}</p>`;
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
  const numero = parseInt(params.get("clase"), 10);
  const clave = "clase" + numero;
  if (!asigId || !numero) {
    window.location.href = "index.html";
    return;
  }

  const [asig, clase] = await Promise.all([
    sb.from("asignaturas").select("id, nombre").eq("id", asigId).maybeSingle(),
    sb.from("clases").select("*").eq("asignatura_id", asigId).eq("numero", numero).maybeSingle(),
  ]);
  pintarNavbar("clases.html", usuario, asig.data || null);

  const cont = document.getElementById("cl-cuerpo");
  if (!clase.data) {
    document.getElementById("cl-titulo").textContent = "🎓 Clase";
    cont.innerHTML = `<div class="vacio"><div class="icono">📭</div>Todavía no está cargada esta clase.<br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("clases.html", asigId)}">Volver a las clases</a></div>`;
    return;
  }
  const c = clase.data;
  document.title = `Clase ${c.numero} · ${c.titulo}`;
  document.getElementById("cl-titulo").textContent = `🎓 Clase ${c.numero}. ${c.titulo}`;
  document.getElementById("cl-subtitulo").textContent = `${asig.data ? asig.data.nombre : ""} · Lo que explicó el profesor, con sus fichas. Pulsa ▶ para escucharla seguida, o toca cualquier párrafo para empezar desde ahí.`;

  const { data: fichas } = await sb
    .from("clase_fichas")
    .select("orden, grupo, titulo, imagen_url, nota")
    .eq("clase_id", c.id)
    .order("orden");

  const { html, indice } = clPintar(c.contenido);

  // ---- Datos de cabecera (unidad, día, profesor) ----
  const fecha = c.fecha
    ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const datos = [
    c.unidad_num ? `📘 Es la UD${c.unidad_num}` : null,
    fecha ? `🗓️ ${fecha}` : null,
    c.profesor ? `👤 ${c.profesor}` : null,
  ].filter(Boolean);
  const htmlDatos = datos.length ? `<div class="cl-datos">${datos.map((d) => `<span class="cl-dato">${clEsc(d)}</span>`).join("")}</div>` : "";

  // ---- Galería con las fichas originales del profesor ----
  const NOMBRES_GRUPO = {
    presentacion: "📊 Las diapositivas de su presentación",
    ejercicios: "✍️ Sus hojas de ejercicios resueltos",
    pizarra: "🖍️ Lo que escribió en clase",
    otros: "📎 Otros materiales",
  };
  const porGrupo = [];
  for (const f of fichas || []) {
    let g = porGrupo.find((x) => x.nombre === f.grupo);
    if (!g) porGrupo.push((g = { nombre: f.grupo, lista: [] }));
    g.lista.push(f);
  }
  const htmlFichas = (fichas || []).length
    ? `<details class="panel rc-desplegable cl-fichas" id="cl-fichas" open>
        <summary>🗂️ Las fichas del profesor (${fichas.length})</summary>
        <p class="cl-aviso">Son sus diapositivas y sus hojas tal cual, sin retocar. Pulsa en cualquiera para verla en grande.</p>
        ${porGrupo
          .map(
            (g) => `<div class="cl-grupo">${clEsc(NOMBRES_GRUPO[g.nombre] || g.nombre)}</div>
            <div class="cl-rejilla">
              ${g.lista
                .map(
                  (f) => `<figure class="cl-ficha">
                    <img class="ampliable" loading="lazy" src="${clEsc(f.imagen_url)}" alt="${clEsc(f.titulo || "Ficha del profesor")}" title="Pulsa para ver en grande" />
                    <figcaption class="cl-pie"><span class="cl-num">${f.orden}</span>${clEsc(f.titulo || "")}${f.nota ? `<br/>${clEsc(f.nota)}` : ""}</figcaption>
                  </figure>`
                )
                .join("")}
            </div>`
          )
          .join("")}
      </details>`
    : "";

  // ---- Enlaces (vídeo de la grabación, aula virtual, etc.) ----
  const enlaces = Array.isArray(c.enlaces) ? c.enlaces : [];
  const htmlEnlaces = enlaces.length
    ? `<details class="panel rc-desplegable" id="cl-enlaces" open>
        <summary>🔗 Enlaces de la clase (${enlaces.length})</summary>
        ${enlaces
          .map(
            (e) => `<div class="tm-enlace">
              <div><b>${clEsc(e.titulo)}</b></div>
              ${e.para_que ? `<div class="subtitulo">${clEsc(e.para_que)}</div>` : ""}
              <a class="btn btn-secundario" href="${clEsc(e.url)}" target="_blank" rel="noopener">${e.tipo === "video" ? "▶ Ver la grabación" : "Abrir enlace ↗"}</a>
            </div>`
          )
          .join("")}
      </details>`
    : "";

  const botones = `
    <div class="rc-cta">
      ${c.examen_practica_id ? `<a class="btn btn-primario" href="${enlaceAsignatura("quiz.html", asigId, "modo=examen&examen_id=" + c.examen_practica_id)}">📝 Practicar lo de esta clase</a>` : ""}
      ${c.unidad_num ? `<a class="btn btn-secundario" href="${enlaceAsignatura("tema.html", asigId, "tema=UD" + c.unidad_num)}">📖 El tema completo de la UD${c.unidad_num}</a>` : ""}
      <a class="btn btn-secundario" href="${enlaceAsignatura("clases.html", asigId)}">← Volver a las clases</a>
    </div>`;

  cont.innerHTML = `
    ${htmlDatos}
    <div class="tm-reproductor" id="tm-reproductor">
      <button type="button" id="tm-atras" title="Párrafo anterior" aria-label="Párrafo anterior">⏮</button>
      <button type="button" id="tm-play">▶ Escuchar</button>
      <button type="button" id="tm-adelante" title="Párrafo siguiente" aria-label="Párrafo siguiente">⏭</button>
      <select id="tm-indice" aria-label="Ir a un apartado">
        <option value="">📑 Ir a un apartado…</option>
        ${indice.map((a) => `<option value="${a.id}">${clEsc(a.titulo)}</option>`).join("")}
        ${(fichas || []).length ? `<option value="cl-fichas">🗂️ Las fichas del profesor</option>` : ""}
      </select>
      <div class="tm-barra"><div id="tm-progreso"></div></div>
      <div class="tm-estado" id="tm-estado"></div>
    </div>
    ${botones}
    <div class="panel tm-tema" id="tm-tema">${html}</div>
    ${htmlFichas}
    ${htmlEnlaces}
    ${botones}`;

  // ---------------- Reproductor ----------------
  const voz = window.speechSynthesis || null;
  const bloques = Array.from(document.querySelectorAll("#tm-tema .tm-leible"));
  const btnPlay = document.getElementById("tm-play");
  const estado = document.getElementById("tm-estado");
  const progreso = document.getElementById("tm-progreso");
  const CLAVE_POS = `clase_pos_${asigId}_${clave}`;
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
    const texto = el.dataset.voz || clVoz(el.textContent);
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
