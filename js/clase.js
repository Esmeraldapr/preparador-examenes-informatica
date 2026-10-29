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

/** Id de YouTube de una URL (o null si no es de YouTube). */
function clYoutubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Segundo en el que empieza el vídeo si la URL lleva t=… (p. ej. t=85s o t=1m25s). 0 si no. */
function clYoutubeDesde(url) {
  const m = String(url || "").match(/[?&#](?:t|start)=(?:(\d+)m)?(\d+)s?/);
  return m ? (parseInt(m[1] || "0", 10) * 60 + parseInt(m[2], 10)) : 0;
}

/**
 * Vídeos o enlaces que el profe puso EN una diapositiva. Van en `clases.enlaces`
 * con el campo `imagen` = la misma ruta de la diapositiva (p. ej. "img/ffe-clase3-diapo-05-biot-savart.jpg").
 * Salen justo debajo de esa diapositiva, con botón para verlo ahí mismo.
 */
function clEnlacesBajo(lista) {
  if (!lista || !lista.length) return "";
  return lista
    .map((e) => {
      const yt = clYoutubeId(e.url);
      const icono = e.tipo === "video" || yt ? "🎬 Vídeo de esta diapositiva" : "🔗 Enlace de esta diapositiva";
      return `<div class="cl-vd">
        <div class="cl-vd-tit">${icono}: <b>${clEsc(e.titulo || "")}</b></div>
        ${e.para_que ? `<div class="cl-vd-para">${clEsc(e.para_que)}</div>` : ""}
        <div class="cl-vd-botones">
          ${yt ? `<button type="button" class="btn btn-primario cl-vd-ver" data-yt="${clEsc(yt)}" data-desde="${clYoutubeDesde(e.url)}">▶ Verlo aquí${clYoutubeDesde(e.url) ? ` (desde el ${Math.floor(clYoutubeDesde(e.url) / 60)}:${String(clYoutubeDesde(e.url) % 60).padStart(2, "0")})` : ""}</button>` : ""}
          ${yt && CL_VOZ.has(yt) ? `<button type="button" class="btn btn-primario cl-vd-voz" data-yt="${clEsc(yt)}" data-desde="${clYoutubeDesde(e.url)}">🔊 Verlo con voz en español</button>` : ""}
          <a class="btn btn-secundario" href="${clEsc(e.url)}" target="_blank" rel="noopener">${yt ? "Abrir en YouTube ↗" : "Abrir enlace ↗"}</a>
        </div>
        <div class="cl-vd-player"></div>
      </div>`;
    })
    .join("");
}

// ---- Vídeos con voz en español ----
// Para los vídeos que están en la tabla `video_voz`, el vídeo se ve sin sonido y la voz de la web
// lee cada frase en español en su segundo. Si la frase es larga para el hueco que tiene, la voz va más rápida.
let CL_VOZ = new Set();
const clFrasesVoz = {};
let clVozActiva = null; // { player, frases, ultima, timer, caja, boton }

function clCargarApiYoutube() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((ok) => {
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (previo) previo(); ok(); };
    if (!document.getElementById("yt-api")) {
      const sc = document.createElement("script");
      sc.id = "yt-api";
      sc.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(sc);
    }
  });
}

function clPararVoz() {
  if (!clVozActiva) return;
  clearInterval(clVozActiva.timer);
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
  try { clVozActiva.player.destroy(); } catch (e) {}
  clVozActiva.caja.innerHTML = "";
  clVozActiva.caja.classList.remove("cl-vd-con-voz");
  clVozActiva.boton.textContent = clVozActiva.boton.dataset.texto || "🔊 Verlo con voz en español";
  clVozActiva = null;
}

function clDecir(frase, siguienteT) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(frase.s);
  u.lang = "es-ES";
  const hueco = Math.max(1, (siguienteT || frase.t + 6) - frase.t);
  const necesaria = frase.s.length / (15 * hueco); // ~15 letras por segundo a velocidad 1
  const base = Math.max(1.2, typeof velocidadLectura === "number" ? velocidadLectura : 1.2);
  u.rate = Math.min(2, Math.max(base, necesaria));
  speechSynthesis.speak(u);
}

document.addEventListener("click", async (ev) => {
  const b = ev.target.closest(".cl-vd-voz");
  if (!b) return;
  if (clVozActiva && clVozActiva.boton === b) { clPararVoz(); return; }
  clPararVoz();
  const cajaVd = b.closest(".cl-vd");
  const caja = cajaVd.querySelector(".cl-vd-player");
  const verNormal = cajaVd.querySelector(".cl-vd-ver");
  if (verNormal && caja.innerHTML) { caja.innerHTML = ""; verNormal.textContent = verNormal.dataset.texto || "▶ Verlo aquí"; }
  b.dataset.texto = b.dataset.texto || b.textContent;
  b.textContent = "⏳ Preparando…";
  const yt = b.dataset.yt;
  if (!clFrasesVoz[yt]) {
    const { data } = await sb.from("video_voz").select("frases").eq("youtube_id", yt).maybeSingle();
    clFrasesVoz[yt] = (data && data.frases) || [];
  }
  await clCargarApiYoutube();
  caja.classList.add("cl-vd-con-voz");
  caja.innerHTML = `<div class="cl-vd-aviso">🔇 El vídeo va sin sonido: lo que dice lo lee la voz de la web en español. Si pausas el vídeo, la voz también para.</div><div id="cl-voz-player"></div><div class="cl-vd-sub" aria-live="polite"></div>`;
  const frases = clFrasesVoz[yt];
  const estado = { frases, ultima: -1, caja, boton: b, timer: null, player: null };
  clVozActiva = estado;
  estado.player = new YT.Player("cl-voz-player", {
    host: "https://www.youtube-nocookie.com",
    videoId: yt,
    playerVars: { autoplay: 1, mute: 1, rel: 0, start: Number(b.dataset.desde) || 0, hl: "es", cc_load_policy: 0, iv_load_policy: 3, playsinline: 1 },
    events: {
      onReady: (e) => { e.target.mute(); e.target.playVideo(); },
      onStateChange: (e) => {
        if (e.data !== YT.PlayerState.PLAYING) { try { speechSynthesis.cancel(); } catch (x) {} estado.ultima = -2; }
      },
    },
  });
  b.textContent = "✖ Cerrar el vídeo en español";
  estado.timer = setInterval(() => {
    const p = estado.player;
    if (!p || !p.getCurrentTime || !p.getPlayerState || p.getPlayerState() !== YT.PlayerState.PLAYING) return;
    if (!p.isMuted()) p.mute();
    const t = p.getCurrentTime();
    let i = -1;
    for (let k = 0; k < frases.length; k++) { if (frases[k].t <= t + 0.15) i = k; else break; }
    if (i < 0 || i === estado.ultima) return;
    // Al volver de una pausa o de un salto, solo se lee si estamos al principio de la frase.
    const reciente = t - frases[i].t < 1.5 || estado.ultima === i - 1;
    estado.ultima = i;
    const sub = caja.querySelector(".cl-vd-sub");
    if (sub) sub.textContent = frases[i].s;
    if (reciente) clDecir(frases[i], frases[i + 1] && frases[i + 1].t);
  }, 200);
});

// Pulsar «▶ Verlo aquí» mete el vídeo debajo de la diapositiva (y lo quita si se vuelve a pulsar).
document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".cl-vd-ver");
  if (!b) return;
  clPararVoz();
  const caja = b.closest(".cl-vd").querySelector(".cl-vd-player");
  if (caja.innerHTML) {
    caja.innerHTML = "";
    b.textContent = b.dataset.texto || "▶ Verlo aquí";
    return;
  }
  b.dataset.texto = b.textContent;
  caja.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.yt)}?autoplay=1&rel=0${Number(b.dataset.desde) ? `&start=${Number(b.dataset.desde)}` : ""}" title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  b.textContent = "✖ Cerrar el vídeo";
});

/** Convierte el texto del tema en HTML. Devuelve { html, indice }. */
function clPintar(texto, porImagen = {}) {
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
        const ancha = /mapa|\/clases\/|-diapo-/.test(m[2]) ? " tm-ancha" : "";
        return `<figure class="tm-fig${ancha}"><img class="ampliable" loading="lazy" src="${clEsc(m[2])}" alt="${clEsc(m[1])}" title="Pulsa para ver en grande" /><figcaption ${leible()} data-voz="${clEsc("Imagen. " + clVoz(m[1]))}">${clEsc(m[1])}</figcaption></figure>${clEnlacesBajo(porImagen[m[2]])}`;
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


/** Repaso (Mi plan): la unidad en corto, con sus fórmulas y cuentas.
 *  Se queda con los títulos, el primer párrafo de cada apartado, los cuadros
 *  (En el examen, Ojo, Recuerda, Lo que pone la diapositiva…), las fórmulas y cuentas,
 *  las listas, los dibujos y la chuleta entera. Solo se quitan los párrafos largos de explicación. */
function resumenRepaso(texto) {
  const bl = String(texto || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  let enChuleta = false, primerP = false;
  for (const b of bl) {
    if (b.startsWith("## ")) { enChuleta = /chuleta|resumen|qu[eé] cae/i.test(b); primerP = true; out.push(b); continue; }
    if (enChuleta) { out.push(b); continue; }
    if (b.startsWith("> ")) { out.push(b); continue; }
    // Las cuentas, fórmulas, listas, dibujos y subtítulos del tema se quedan: son la unidad.
    if (/^(###|!\[|\$ |- )/.test(b)) { out.push(b); continue; }
    if (primerP) { out.push(b); primerP = false; }
  }
  return out.filter((b, i) => !(b.startsWith("## ") && (i === out.length - 1 || out[i + 1].startsWith("## ")))).join("\n\n");
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
  const clavePlan = params.get("claveplan") || "";
  const modoRepaso = params.get("modo") === "repaso";
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
  document.getElementById("cl-titulo").textContent = `${modoRepaso ? "🔁 Repaso · " : "🎓 "}Clase ${c.numero}. ${c.titulo}`;
  document.getElementById("cl-subtitulo").textContent = `${asig.data ? asig.data.nombre : ""} · Lo que explicó el profesor, con sus fichas. Pulsa ▶ para escucharla seguida, o toca cualquier párrafo para empezar desde ahí.`;
  if (modoRepaso) document.getElementById("cl-subtitulo").textContent = "La clase más corta para repasar: apartados, fórmulas y cuentas, y lo que pone en las diapositivas y la pizarra. Pulsa ▶ o léelo.";

  const { data: fichas } = await sb
    .from("clase_fichas")
    .select("orden, grupo, titulo, imagen_url, nota")
    .eq("clase_id", c.id)
    .order("orden");

  // Vídeos que tienen voz en español (tabla video_voz).
  try {
    const { data: voces } = await sb.from("video_voz").select("youtube_id");
    CL_VOZ = new Set((voces || []).map((v) => v.youtube_id));
  } catch (e) {}

  // Enlaces que van con una diapositiva concreta (campo `imagen`).
  const porImagen = {};
  for (const e of Array.isArray(c.enlaces) ? c.enlaces : []) {
    if (e && e.imagen) (porImagen[e.imagen] = porImagen[e.imagen] || []).push(e);
  }
  const { html, indice } = clPintar(modoRepaso ? resumenRepaso(c.contenido) : c.contenido, porImagen);

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
                    ${clEnlacesBajo(porImagen[f.imagen_url])}
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
              <div><b>${clEsc(e.titulo)}</b>${e.imagen ? ` <span class="subtitulo">· sale debajo de su diapositiva</span>` : ""}</div>
              ${e.para_que ? `<div class="subtitulo">${clEsc(e.para_que)}</div>` : ""}
              <a class="btn btn-secundario" href="${clEsc(e.url)}" target="_blank" rel="noopener">${e.tipo === "video" ? (e.imagen ? "▶ Ver el vídeo" : "▶ Ver la grabación") : "Abrir enlace ↗"}</a>
            </div>`
          )
          .join("")}
      </details>`
    : "";

  const botones = `
    <div class="rc-cta">
      ${clavePlan ? `<button type="button" class="btn btn-primario cl-plan-btn">${modoRepaso ? "✅ Ya la repasé" : "✅ Ya la vi"} · Volver a Mi plan</button>` : ""}
      ${c.examen_practica_id ? `<a class="btn btn-secundario" href="${enlaceAsignatura("quiz.html", asigId, "modo=examen&examen_id=" + c.examen_practica_id)}">📝 Practicar lo de esta clase</a>` : ""}
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
    ${modoRepaso ? "" : htmlFichas}
    ${modoRepaso ? "" : htmlEnlaces}
    ${botones}`;

  // ---------------- Botón "Volver a Mi plan" (solo si viene de Mi plan) ----------------
  if (clavePlan) {
    let yaMarcado = false;
    document.querySelectorAll(".cl-plan-btn").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!yaMarcado) {
          yaMarcado = true;
          await sb.from("plan_hecho").upsert({ clave: clavePlan }, { onConflict: "auth_user_id,clave" });
        }
        window.location.href = "plan.html";
      })
    );
  }

  // ---------------- Reproductor ----------------
  const voz = window.speechSynthesis || null;
  const bloques = Array.from(document.querySelectorAll("#tm-tema .tm-leible"));
  const btnPlay = document.getElementById("tm-play");
  const estado = document.getElementById("tm-estado");
  const progreso = document.getElementById("tm-progreso");
  const CLAVE_POS = `clase_pos_${asigId}_${clave}${modoRepaso ? "_rep" : ""}`;
  let actual = 0;
  let sonando = false;
  let turno = 0; // invalida los "onend" de lecturas canceladas
  let bloqueoPantalla = null;

  try {
    const guardado = parseInt(localStorage.getItem(CLAVE_POS), 10);
    if (guardado > 0 && guardado < bloques.length) actual = guardado;
  } catch (e) { /* sin almacenamiento: se empieza desde el principio */ }

  // La posición se guarda también en Supabase: así sigue donde lo dejó
  // aunque lo abra en otro ordenador o en el móvil.
  let posTimer = null;
  function guardarPos() {
    try { localStorage.setItem(CLAVE_POS, String(actual)); localStorage.setItem(CLAVE_POS + "_t", String(Date.now())); } catch (e) {}
    clearTimeout(posTimer);
    posTimer = setTimeout(() => {
      try { sb.rpc("lectura_guardar", { p_pagina: CLAVE_POS, p_pos: actual, p_total: bloques.length }).then(() => {}, () => {}); } catch (e) {}
    }, 1500);
  }

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
      guardarPos();
      estado.textContent = "✅ Has terminado el tema. Ahora puedes hacer el test de práctica.";
      return;
    }
    const el = bloques[actual];
    const texto = el.dataset.voz || clVoz(el.textContent);
    const mio = ++turno;
    sonando = true;
    marcar(actual, true);
    pintarEstado();
    guardarPos();
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
    else { actual = i; marcar(actual, true); pintarEstado(); guardarPos(); }
  });
  document.getElementById("tm-adelante").addEventListener("click", () => {
    const i = Math.min(bloques.length - 1, actual + 1);
    if (sonando) empezarEn(i);
    else { actual = i; marcar(actual, true); pintarEstado(); guardarPos(); }
  });
  document.getElementById("tm-tema").addEventListener("click", (e) => {
    const el = e.target.closest(".tm-leible");
    if (!el) return;
    // Si vuelve a pulsar el bloque que se está leyendo, se para.
    if (sonando && bloques.indexOf(el) === actual) { parar(); return; }
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

  // Lo guardado en Supabase gana si es más reciente que lo de este navegador.
  try {
    const { data: rem } = await sb.from("lectura_pos").select("pos, actualizado_en").eq("pagina", CLAVE_POS).maybeSingle();
    let tLocal = 0;
    try { tLocal = parseInt(localStorage.getItem(CLAVE_POS + "_t"), 10) || 0; } catch (e) {}
    if (rem && rem.pos >= 0 && rem.pos < bloques.length && new Date(rem.actualizado_en).getTime() > tLocal) actual = rem.pos;
  } catch (e) { /* sin conexión: vale lo de este navegador */ }
  if (actual > 0) {
    marcar(actual, false);
    setTimeout(() => bloques[actual] && bloques[actual].scrollIntoView({ block: "center" }), 400);
  }
  pintarEstado();
  // Si lee sin el audio, también se guarda por dónde va (el primer párrafo que se ve arriba).
  let scrollT = null;
  window.addEventListener("scroll", () => {
    if (sonando) return;
    clearTimeout(scrollT);
    scrollT = setTimeout(() => {
      const i = bloques.findIndex((b) => b.getBoundingClientRect().bottom > 140);
      if (i > actual) { actual = i; pintarEstado(); guardarPos(); }
    }, 1000);
  }, { passive: true });
  // Al cerrar o cambiar de pestaña, se guarda al momento.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearTimeout(posTimer);
      try { sb.rpc("lectura_guardar", { p_pagina: CLAVE_POS, p_pos: actual, p_total: bloques.length }).then(() => {}, () => {}); } catch (e) {}
    }
  });
})();
