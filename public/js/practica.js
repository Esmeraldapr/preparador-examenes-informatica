// ============================================================
// Lógica de practica.html — selector de modo de práctica rápida
// ============================================================

let tipoSeleccionado = "todas";
let ASIGNATURA_ID = null;

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("practica.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  document.getElementById("enlace-fallos").href = enlaceAsignatura("quiz.html", ASIGNATURA_ID, "modo=fallos");
  document.getElementById("enlace-favoritos").href = enlaceAsignatura("quiz.html", ASIGNATURA_ID, "modo=favoritos");

  const [totalFallos, { count: totalFavoritos }] = await Promise.all([
    contarFallos(usuario.id, ASIGNATURA_ID),
    sb.from("favoritos").select("id", { count: "exact", head: true }).eq("usuario_id", usuario.id),
  ]);

  document.getElementById("contador-fallos").textContent = totalFallos;
  document.getElementById("contador-favoritos").textContent = totalFavoritos || 0;

  document.querySelectorAll(".filtro-btn[data-tipo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filtro-btn[data-tipo]").forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      tipoSeleccionado = btn.dataset.tipo;
    });
  });

  document.getElementById("btn-aleatorio").addEventListener("click", () => {
    const n = document.getElementById("num-preguntas").value;
    window.location.href = enlaceAsignatura("quiz.html", ASIGNATURA_ID, `modo=aleatorio&n=${n}&tipo=${tipoSeleccionado}`);
  });
})();

async function contarFallos(usuarioId, asignaturaId) {
  const { data: preguntasAsignatura } = await sb.from("preguntas").select("id").eq("asignatura_id", asignaturaId);
  const idsAsignatura = new Set((preguntasAsignatura || []).map((p) => p.id));
  const { data: intentos } = await sb.from("intentos").select("pregunta_id, acierto, fecha").eq("usuario_id", usuarioId).order("fecha", { ascending: true });
  const ultimo = new Map();
  for (const i of intentos || []) {
    if (idsAsignatura.has(i.pregunta_id)) ultimo.set(i.pregunta_id, i.acierto);
  }
  return [...ultimo.values()].filter((v) => !v).length;
}
