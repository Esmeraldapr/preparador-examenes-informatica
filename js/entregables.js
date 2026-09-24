// ============================================================
// Lógica de entregables.html — explicación de los ejercicios a entregar
// ============================================================

const COLORES_ENTREGABLES = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("entregables.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: entregables } = await sb
    .from("entregables")
    .select("*")
    .eq("asignatura_id", ASIGNATURA_ID)
    .order("unidad_num");

  const cont = document.getElementById("lista-entregables");

  if (!entregables || !entregables.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">📋</div>Aún no hay entregables explicados para esta asignatura.</div>`;
    return;
  }

  const ids = entregables.map((e) => e.id);
  const { data: ejercicios } = await sb
    .from("entregable_ejercicios")
    .select("*")
    .in("entregable_id", ids)
    .order("orden");

  function fecha(f) {
    if (!f) return "";
    const [a, m, d] = f.split("-");
    return `${d}/${m}/${a}`;
  }

  function parrafosLeibles(texto) {
    if (!texto) return "";
    return String(texto)
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${p}</p>`)
      .join("");
  }

  const bloques = entregables
    .map((ent) => {
      const propios = (ejercicios || []).filter((e) => e.entregable_id === ent.id);

      const cabeceraFechas =
        ent.fecha_apertura || ent.fecha_cierre
          ? `<p class="subtitulo" style="margin:4px 0 0">🗓️ ${ent.fecha_apertura ? "Abre: " + fecha(ent.fecha_apertura) : ""}${
              ent.fecha_apertura && ent.fecha_cierre ? " · " : ""
            }${ent.fecha_cierre ? "Cierra: " + fecha(ent.fecha_cierre) : ""}</p>`
          : "";

      const criterioHtml = ent.criterio_correccion
        ? `<div class="panel" style="margin-top:18px">
             <div class="panel-cabecera"><h2>📐 Criterio de corrección</h2></div>
             <div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${parrafosLeibles(
               ent.criterio_correccion
             )}</div>
           </div>`
        : "";

      const tarjetas = propios
        .map((ej, idx) => {
          const secciones = [
            ej.que_usa ? `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí"><strong>Qué usa:</strong> ${ej.que_usa}</p>` : "",
            ej.por_que_importa
              ? `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí"><strong>Por qué es importante:</strong> ${ej.por_que_importa}</p>`
              : "",
            ej.procedimiento ? parrafosLeibles(ej.procedimiento) : "",
          ].join("");

          return `
        <div class="tarjeta">
          <div class="cabecera ${COLORES_ENTREGABLES[idx % COLORES_ENTREGABLES.length]}">
            <span class="icono">✏️</span>
            <h3>Ejercicio ${ej.orden}: ${ej.titulo}</h3>
            <button type="button" class="btn-altavoz" data-id="${ej.id}" title="Escuchar todo desde el principio" aria-label="Escuchar todo desde el principio">🔊</button>
          </div>
          <div class="cuerpo">
            ${ej.imagen_url ? `<img class="imagen-truco ampliable" src="${ej.imagen_url}" alt="Ejercicio ${ej.orden}" title="Pulsa para ver en grande" />` : ""}
            <div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${secciones}</div>
          </div>
        </div>`;
        })
        .join("");

      return `
        <div class="panel" style="margin-bottom:22px">
          <div class="panel-cabecera"><h2>📋 ${ent.nombre}</h2></div>
          ${cabeceraFechas}
        </div>
        ${criterioHtml}
        <div class="grid-tarjetas" style="margin-top:18px">${tarjetas}</div>
      `;
    })
    .join("");

  cont.outerHTML = `<div id="lista-entregables">${bloques}</div>`;

  document.getElementById("lista-entregables").addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-altavoz");
    if (!boton) return;
    const ej = (ejercicios || []).find((x) => String(x.id) === boton.dataset.id);
    const parrafosCarta = Array.from(boton.closest(".tarjeta").querySelectorAll(".parrafo-leible"));
    leerTexto(`Ejercicio ${ej.orden}: ${ej.titulo}`, parrafosCarta, boton);
  });
})();
