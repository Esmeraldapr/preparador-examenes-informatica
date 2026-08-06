// ============================================================
// Lógica de graficas.html — zona visual de gráficas de referencia
// ============================================================

const COLORES = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("graficas.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: graficas } = await sb.from("graficas").select("*").eq("asignatura_id", ASIGNATURA_ID).order("id");

  const cont = document.getElementById("lista-graficas");
  if (!graficas || !graficas.length) {
    cont.innerHTML = `
      <div class="vacio">
        <div class="icono">📈</div>
        Aún no hay gráficas guardadas.<br/>
        En cuanto me pases las capturas de Desmos (o las imágenes de los exámenes), aparecerán aquí con su explicación: qué representan, dominio, recorrido, asíntotas y puntos notables.
      </div>`;
    return;
  }

  cont.innerHTML = graficas
    .map((g, idx) => {
      const parrafos = String(g.explicacion)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const parrafosHtml = parrafos
        .map((p) => `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${p}</p>`)
        .join("");
      return `
    <div class="tarjeta">
      <div class="cabecera ${COLORES[idx % COLORES.length]}">
        <span class="icono">📈</span>
        <h3>${g.nombre}</h3>
        <button type="button" class="btn-altavoz" data-idx="${idx}" title="Escuchar todo desde el principio" aria-label="Escuchar todo desde el principio">🔊</button>
      </div>
      ${g.imagen_url ? `<img class="ampliable" src="${g.imagen_url}" alt="${g.nombre}" title="Pulsa para ver en grande" style="width:100%" />` : ""}
      <div class="cuerpo">
        <div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${parrafosHtml}</div>
      </div>
    </div>`;
    })
    .join("");

  cont.addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-altavoz");
    if (!boton) return;
    const g = graficas[Number(boton.dataset.idx)];
    leerTexto(`${g.nombre}. ${g.explicacion}`, boton);
  });
})();
