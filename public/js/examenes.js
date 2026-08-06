// ============================================================
// Lógica de examenes.html — Cuestionarios oficiales y no oficiales
// ============================================================

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("examenes.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const [{ data: examenes }, { data: preguntas }, { data: intentos }] = await Promise.all([
    sb.from("examenes").select("id, nombre, tipo, anio, convocatoria").eq("asignatura_id", ASIGNATURA_ID).order("id"),
    sb.from("preguntas").select("id, examen_id").eq("asignatura_id", ASIGNATURA_ID),
    sb.from("intentos").select("pregunta_id, acierto").eq("usuario_id", usuario.id),
  ]);

  const ultimoPorPregunta = new Map();
  for (const i of intentos || []) ultimoPorPregunta.set(i.pregunta_id, i.acierto);

  const preguntasPorExamen = new Map();
  for (const p of preguntas || []) {
    if (!preguntasPorExamen.has(p.examen_id)) preguntasPorExamen.set(p.examen_id, []);
    preguntasPorExamen.get(p.examen_id).push(p.id);
  }

  const oficiales = (examenes || []).filter((e) => e.tipo === "oficial");
  const noOficiales = (examenes || []).filter((e) => e.tipo !== "oficial");

  function tarjetaExamen(e) {
    const ids = preguntasPorExamen.get(e.id) || [];
    const practicadas = ids.filter((id) => ultimoPorPregunta.has(id));
    const aciertos = practicadas.filter((id) => ultimoPorPregunta.get(id));
    const dominio = practicadas.length ? Math.round((aciertos.length / practicadas.length) * 100) : 0;
    const chip = e.tipo === "oficial" ? `<span class="chip oficial">Oficial</span>` : `<span class="chip no-oficial">No oficial</span>`;
    return `
      <a class="tarjeta" href="${enlaceAsignatura("quiz.html", ASIGNATURA_ID, "modo=examen&examen_id=" + e.id)}">
        <div class="cabecera ${e.tipo === "oficial" ? "" : "g4"}">
          <span class="icono">📝</span>
          <h3>${e.nombre}</h3>
        </div>
        <div class="cuerpo">
          <div>${chip}</div>
          <div class="meta">${ids.length} preguntas${e.anio ? " · " + e.anio : ""}${e.convocatoria ? " " + e.convocatoria : ""}</div>
          <div class="barra-progreso"><div style="width:${dominio}%"></div></div>
          <div class="meta">${practicadas.length ? dominio + "% de acierto" : "Aún sin hacer"}</div>
        </div>
        <div class="pie"><span class="btn btn-primario btn-bloque">Empezar cuestionario</span></div>
      </a>`;
  }

  document.getElementById("lista-oficiales").innerHTML =
    oficiales.map(tarjetaExamen).join("") ||
    `<div class="vacio"><div class="icono">📥</div>Aún no hay exámenes oficiales cargados.</div>`;

  document.getElementById("lista-no-oficiales").innerHTML =
    noOficiales.map(tarjetaExamen).join("") ||
    `<div class="vacio"><div class="icono">📥</div>Aún no hay tests no oficiales cargados.</div>`;
})();
