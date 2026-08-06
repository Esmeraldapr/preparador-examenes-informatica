// ============================================================
// Lógica de temas.html — repaso por Unidad Didáctica
// ============================================================

const COLORES_CABECERA = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("temas.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const [{ data: preguntas }, { data: intentos }] = await Promise.all([
    sb.from("preguntas").select("id, unidad").eq("asignatura_id", ASIGNATURA_ID),
    sb.from("intentos").select("pregunta_id, acierto, fecha").eq("usuario_id", usuario.id).order("fecha", { ascending: true }),
  ]);

  const ultimoPorPregunta = new Map();
  for (const i of intentos || []) ultimoPorPregunta.set(i.pregunta_id, i.acierto);

  const porUnidad = new Map();
  for (const p of preguntas || []) {
    if (!porUnidad.has(p.unidad)) porUnidad.set(p.unidad, { total: 0, practicadas: 0, aciertos: 0 });
    const o = porUnidad.get(p.unidad);
    o.total++;
    if (ultimoPorPregunta.has(p.id)) {
      o.practicadas++;
      if (ultimoPorPregunta.get(p.id)) o.aciertos++;
    }
  }

  const unidades = [...porUnidad.keys()].sort((a, b) => a.localeCompare(b, "es"));
  const cont = document.getElementById("lista-temas");

  if (!unidades.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">📚</div>Todavía no hay preguntas cargadas para esta asignatura.<br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}">Volver al dashboard</a></div>`;
    return;
  }

  cont.innerHTML = unidades
    .map((u, idx) => {
      const o = porUnidad.get(u);
      const dominio = o.practicadas ? Math.round((o.aciertos / o.practicadas) * 100) : 0;
      const clase = COLORES_CABECERA[idx % COLORES_CABECERA.length];
      return `
      <a class="tarjeta" href="${enlaceAsignatura("quiz.html", ASIGNATURA_ID, "modo=tema&unidad=" + encodeURIComponent(u))}">
        <div class="cabecera ${clase}">
          <span class="icono">📘</span>
          <h3>${u}</h3>
        </div>
        <div class="cuerpo">
          <div class="meta">${o.total} preguntas · ${o.practicadas} ya practicadas</div>
          <div class="barra-progreso"><div style="width:${dominio}%"></div></div>
          <div class="meta">${o.practicadas ? dominio + "% de acierto en este tema" : "Aún sin practicar"}</div>
        </div>
        <div class="pie"><span class="btn btn-primario btn-bloque">Practicar tema</span></div>
      </a>`;
    })
    .join("");
})();
