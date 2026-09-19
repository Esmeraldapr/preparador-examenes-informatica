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
      if (/^<table[\s>]/i.test(b)) return `<div class="tabla-envoltorio">${b}</div>`;
      if (/^<(svg|figure)[\s>]/i.test(b)) return `<div class="rc-fig">${b}</div>`;
      if (b.startsWith("## ")) return `<h3 class="parrafo-leible rc-h" title="Pulsa para escuchar desde aquí">${b.slice(3)}</h3>`;
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
  const [asig, intro, fs, gs, ts, est] = await Promise.all([
    sb.from("asignaturas").select("nombre").eq("id", asigId).maybeSingle(),
    sb.from("repaso_unidad").select("titulo, intro").eq("asignatura_id", asigId).eq("unidad_num", num).maybeSingle(),
    sb.from("formulas").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.from("graficas").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.from("trucos").select("*").eq("asignatura_id", asigId).eq("unidad_num", num).order("id"),
    sb.rpc("racha_estado_hoy_web"),
  ]);

  const estado = est.data && est.data[0];
  const nombreTema = estado && estado.tema_clave === clave ? estado.tema : (intro.data && intro.data.titulo) || clave;
  document.title = `Repaso · ${nombreTema}`;
  document.getElementById("rc-titulo").textContent = `📖 ${nombreTema}`;
  document.getElementById("rc-subtitulo").textContent = `${asig.data ? asig.data.nombre : ""} · Léelo con calma (o escúchalo con el 🔊) y luego empiezan las preguntas.`;

  const formulas = fs.data || [];
  const graficas = gs.data || [];
  const trucos = ts.data || [];
  let html = "";

  const cta = (arriba) => `
    <div class="rc-cta">
      <a class="btn btn-primario" href="${urlPreguntas}">Empezar las preguntas →</a>
      <a class="btn btn-secundario" href="racha.html">← Volver a mi racha</a>
    </div>`;

  html += cta();

  if (intro.data) {
    html += `
      <div class="panel rc-intro" id="rc-intro">
        <div class="panel-cabecera">
          <h2>🌱 Explicación desde cero</h2>
          <button type="button" class="btn btn-secundario" id="rc-leer-todo">🔊 Escuchar todo</button>
        </div>
        ${rpBloques(intro.data.intro)}
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
                .map((r) => `<div class="regla-formula">${r}</div>`).join("");
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

  if (!intro.data && !formulas.length && !graficas.length && !trucos.length) {
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
    const boton = e.target.closest(".tarjeta .btn-altavoz");
    if (!boton) return;
    const tarjeta = boton.closest(".tarjeta");
    const nombre = tarjeta.querySelector("h3").textContent;
    leerTexto(nombre, Array.from(tarjeta.querySelectorAll(".parrafo-leible")), boton);
  });
})();
