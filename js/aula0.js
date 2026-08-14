// ============================================================
// Lógica de aula0.html — listado de unidades de Aula 0
// ============================================================

const COLORES_AULA0 = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("aula0.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;
  document.title = `Aula 0 · ${asignatura.nombre}`;

  const { data: unidades } = await sb
    .from("aula0_unidades")
    .select("id, orden, nombre, icono")
    .eq("asignatura_id", ASIGNATURA_ID)
    .order("orden");

  const cont = document.getElementById("lista-aula0");

  if (!unidades || !unidades.length) {
    cont.innerHTML = `
      <div class="vacio">
        <div class="icono">🌱</div>
        Aún no hay contenido de Aula 0 para esta asignatura.<br/>
        En cuanto se añadan las unidades de repaso, aparecerán aquí.
      </div>`;
    return;
  }

  cont.innerHTML = unidades
    .map(
      (u, idx) => `
    <a class="tarjeta" href="${enlaceAsignatura("aula0-unidad.html", ASIGNATURA_ID, "unidad=" + u.id)}">
      <div class="cabecera ${COLORES_AULA0[idx % COLORES_AULA0.length]}">
        <span class="icono">${u.icono || "📘"}</span>
        <h3>${u.orden}. ${u.nombre}</h3>
      </div>
      <div class="cuerpo">
        <div class="meta">Explicación de repaso + test de 5 preguntas fáciles</div>
      </div>
      <div class="pie"><span class="btn btn-primario btn-bloque">Empezar →</span></div>
    </a>`
    )
    .join("");
})();
