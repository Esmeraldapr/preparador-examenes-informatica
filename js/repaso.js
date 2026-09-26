// ============================================================
// Repaso del tema — repaso.html?asignatura=ID&tema=UD2
// Se muestra ANTES de las preguntas de la tarea 3 de la racha:
// explicación desde cero (con dibujos y lectura en voz alta) y, debajo,
// las fórmulas, gráficas y trucos de esa unidad.
// ============================================================

const RP_COLORES = ["", "g2", "g3", "g4"];

function rpEsc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Convierte un texto con párrafos separados por línea en blanco en bloques HTML leíbles en voz alta. */
function rpBloques(texto) {
  return String(texto || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      if (/^<table[\s>]/i.test(b)) {
        // Cada fila de la tabla se puede escuchar (y entra en "Escuchar todo").
        const tpl = document.createElement("template");
        tpl.innerHTML = b;
        tpl.content.querySelectorAll("tr").forEach((tr) => {
          tr.classList.add("parrafo-leible");
          tr.title = "Pulsa para escuchar desde aquí";
        });
        const div = document.createElement("div");
        div.appendChild(tpl.content);
        return `<div class="tabla-envoltorio">${div.innerHTML}</div>`;
      }
      if (/^<(svg|figure)[\s>]/i.test(b)) return `<div class="rc-fig">${b}</div>`;
      if (b.startsWith("## ")) {
        // "## Título" + texto en las líneas siguientes: el título va aparte y el resto es un párrafo normal.
        const [primera, ...resto] = b.slice(3).split("\n");
        const titulo = `<h3 class="parrafo-leible rc-h" title="Pulsa para escuchar desde aquí">${primera.trim()}</h3>`;
        const cuerpo = resto.join(" ").trim();
        return cuerpo ? titulo + `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${cuerpo}</p>` : titulo;
      }
      return `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${b}</p>`;
    })
    .join("");
}

function rpTarjeta(icono, nombre, idx, cuerpo, imagen) {
  return `
    <div class="tarjeta">
      <div class="cabecera ${RP_COLORES[idx % RP_COLORES.length]}">
        <span class="icono">${icono}</span>
        <h3>${nombre}</h3>
        <button type="button" class="btn-altavoz" title="Escuchar todo desde el principio" aria-label="Escuchar todo desde el principio">🔊</button>
      </div>
      ${imagen ? `<img class="ampliable" src="${imagen}" alt="${rpEsc(nombre)}" title="Pulsa para ver en grande" style="width:100%" />` : ""}
      <div class="cuerpo"><div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${cuerpo}</div></div>
    </div>`;
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("", usuario, null);

  const params = new URLSearchParams(window.location.search);
  const asigId = parseInt(params.get("asignatura"), 10);
  const clave = params.get("tema") || "";
  const num = /^UD\d+$/.test(clave) ? parseInt(clave.slice(2), 10) : null;
  if (!asigId || num === null) {
    window.location.href = "racha.html";
    return;
  }

  const urlPreguntas = `quiz.html?asignatura=${asigId}&modo=racha&barra=3`;
  const [asig, intro, fs, gs, ts, est, ej, rc] = await Promise.all([
    sb.from("asignaturas").select("nombre").eq("id", asigId).maybeSingle(),
    sb.from("repaso_unidad").select("titulo, intro").eq("asignatura_id", asigId).eq("unidad_num", num).maybeSingle(),
    sb.from("formulas").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.from("graficas").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.from("trucos").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.rpc("racha_estado_hoy_web"),
    sb.rpc("racha_ejemplos_web", { p_asig: asigId, p_clave: clave }),
    sb.from("recursos").select("*").eq("asignatura_id", asigId).eq("unidad", clave).eq("verificado", true).order("orden"),
  ]);

  const estado = est.data && est.data[0];
  const nombreTema = estado && estado.tema_clave === clave ? estado.tema : (intro.data && intro.data.titulo) || clave;
  document.title = `Repaso · ${nombreTema}`;
  document.getElementById("rc-titulo").textContent = `📖 ${nombreTema}`;
  document.getElementById("rc-subtitulo").textContent = `${asig.data ? asig.data.nombre : ""} · Léelo con calma (o escúchalo con el 🔊) y luego empiezan las preguntas.`;

  const formulas = fs.data || [];
  const graficas = gs.data || [];
  const trucos = ts.data || [];
  const ejemplos = ej.data || [];
  const videos = rc.data || [];
  let html = "";

  const cta = (arriba) => `
    <div class="rc-cta">
      <a class="btn btn-primario" href="${urlPreguntas}">Empezar las preguntas →</a>
      <a class="btn btn-secundario" href="racha.html">← Volver a mi racha</a>
    </div>`;

  html += cta();

  if (intro.data) {
    html += `
      <div class="panel rc-intro" id="rc-intro" data-lectura>
        <div class="panel-cabecera">
          <h2>🌱 Explicación desde cero</h2>
          <button type="button" class="btn btn-secundario" id="rc-leer-todo">🔊 Escuchar todo</button>
        </div>
        ${rpBloques(intro.data.intro)}
      </div>`;
  }

  if (ejemplos.length) {
    const letras = ["A", "B", "C", "D", "E", "F"];
    html += `
      <div class="panel">
        <div class="panel-cabecera"><h2>📝 Así te lo preguntan en el examen</h2></div>
        <p class="subtitulo" style="margin-bottom:14px">Tres preguntas reales de exámenes oficiales de este tema, para que veas el estilo (las respuestas las verás en el test).</p>
        ${ejemplos
          .map(
            (q) => `
          <div class="rc-ejemplo" data-lectura>
            ${q.imagen_url ? `<img class="ampliable" src="${q.imagen_url}" alt="Imagen de la pregunta" title="Pulsa para ver en grande" />` : ""}
            <div class="rc-ej-cab">
              <div class="rc-ej-enun parrafo-leible" title="Pulsa para escuchar desde aquí">${q.enunciado}</div>
              <button type="button" class="btn-altavoz rc-ej-voz" title="Escuchar la pregunta y las opciones" aria-label="Escuchar la pregunta y las opciones">🔊</button>
            </div>
            <ol class="rc-ej-ops">${(q.opciones || []).map((o, i) => `<li class="parrafo-leible" title="Pulsa para escuchar desde aquí"><b>${letras[i]}.</b> ${o}</li>`).join("")}</ol>
          </div>`
          )
          .join("")}
      </div>`;
  }

  if (formulas.length) {
    html += `
      <details class="panel rc-desplegable" ${intro.data ? "" : "open"}>
        <summary>🧮 Fórmulas de esta unidad (${formulas.length})</summary>
        <div class="grid-tarjetas" id="rc-lista-formulas">
          ${formulas
            .map((f, i) => {
              const reglas = String(f.expresion).split("|").map((r) => r.trim()).filter(Boolean)
                .map((r) => `<div class="regla-formula parrafo-leible" title="Pulsa para escuchar desde aquí">${r}</div>`).join("");
              return rpTarjeta("🧮", f.nombre, i, `<div class="caja-formula" style="margin-bottom:10px">${reglas}</div>${rpBloques(f.explicacion)}`);
            })
            .join("")}
        </div>
      </details>`;
  }

  if (graficas.length) {
    html += `
      <details class="panel rc-desplegable" ${intro.data ? "" : "open"}>
        <summary>📈 Gráficas y esquemas (${graficas.length})</summary>
        <div class="grid-tarjetas">
          ${graficas.map((g, i) => rpTarjeta("📈", g.nombre, i, rpBloques(g.explicacion), g.imagen_url)).join("")}
        </div>
      </details>`;
  }

  if (trucos.length) {
    html += `
      <details class="panel rc-desplegable" ${intro.data ? "" : "open"}>
        <summary>💡 Trucos para el examen (${trucos.length})</summary>
        <div class="grid-tarjetas">
          ${trucos.map((t, i) => rpTarjeta("💡", t.nombre, i, rpBloques(t.explicacion), t.imagen_url)).join("")}
        </div>
      </details>`;
  }

  if (videos.length) {
    html += `
      <details class="panel rc-desplegable">
        <summary>🎬 Vídeos de apoyo (${videos.length})</summary>
        ${videos
          .map((v) => {
            const enlace = v.minuto_inicio && /youtu/.test(v.url) ? v.url + (v.url.includes("?") ? "&" : "?") + "t=" + v.minuto_inicio : v.url;
            return `<div class="rc-video">
              <div><b>${rpEsc(v.titulo)}</b>${v.canal ? ` <span class="subtitulo" style="margin:0">· ${rpEsc(v.canal)}</span>` : ""}</div>
              ${v.para_que_sirve ? `<div class="subtitulo" style="margin:4px 0 8px">${rpEsc(v.para_que_sirve)}</div>` : ""}
              <a class="btn btn-secundario" href="${rpEsc(enlace)}" target="_blank" rel="noopener">▶ Ver vídeo</a>
            </div>`;
          })
          .join("")}
      </details>`;
  }

  if (!intro.data && !formulas.length && !graficas.length && !trucos.length && !ejemplos.length && !videos.length) {
    html += `<div class="vacio"><div class="icono">📭</div>Todavía no hay explicación cargada para este tema. Puedes ir directo a las preguntas.</div>`;
  }

  html += cta();
  document.getElementById("rc-repaso").innerHTML = html;

  // 🔊 de la explicación completa
  const botonTodo = document.getElementById("rc-leer-todo");
  if (botonTodo) {
    botonTodo.addEventListener("click", () => {
      const parrafos = Array.from(document.querySelectorAll("#rc-intro .parrafo-leible"));
      leerTexto("", parrafos, botonTodo);
    });
  }

  // 🔊 de cada tarjeta
  document.getElementById("rc-repaso").addEventListener("click", (e) => {
    const botonEj = e.target.closest(".rc-ej-voz");
    if (botonEj) {
      leerTexto("", Array.from(botonEj.closest(".rc-ejemplo").querySelectorAll(".parrafo-leible")), botonEj);
      return;
    }
    const boton = e.target.closest(".tarjeta .btn-altavoz");
    if (!boton) return;
    const tarjeta = boton.closest(".tarjeta");
    const nombre = tarjeta.querySelector("h3").textContent;
    leerTexto(nombre, Array.from(tarjeta.querySelectorAll(".parrafo-leible")), boton);
  });
})();
