// ============================================================
// Lógica de clases.html — las clases en directo del profesor
// Cada clase es una sesión síncrona (clase 1, clase 2…), con lo
// que explicó el profesor y sus propias fichas. No se mezclan
// con las unidades: van en su propia pestaña.
// ============================================================

const CL_COLORES = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("clases.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: clases } = await sb
    .from("clases")
    .select("id, numero, titulo, unidad_num, unidad, fecha, profesor, resumen")
    .eq("asignatura_id", ASIGNATURA_ID)
    .order("numero");

  const cont = document.getElementById("lista-clases");

  if (!clases || !clases.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">🎓</div>Todavía no hay ninguna clase cargada en esta asignatura.<br/>Cuando subas el material de una clase en directo, aparecerá aquí.<br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}">Volver al panel</a></div>`;
    return;
  }

  // Cuántas fichas del profesor tiene cada clase (para enseñarlo en la tarjeta).
  const conteo = new Map();
  const { data: todasFichas } = await sb
    .from("clase_fichas")
    .select("clase_id")
    .in("clase_id", clases.map((c) => c.id));
  for (const f of todasFichas || []) conteo.set(f.clase_id, (conteo.get(f.clase_id) || 0) + 1);

  cont.innerHTML = clases
    .map((c, idx) => {
      const clase = CL_COLORES[idx % CL_COLORES.length];
      const nFichas = conteo.get(c.id) || 0;
      const fecha = c.fecha
        ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" })
        : "";
      const meta = [
        c.unidad_num ? `Es la UD${c.unidad_num}` : null,
        fecha ? `Clase del ${fecha}` : null,
        nFichas ? `${nFichas} fichas del profesor` : null,
      ].filter(Boolean);
      return `
      <a class="tarjeta" href="${enlaceAsignatura("clase.html", ASIGNATURA_ID, "clase=" + c.numero)}">
        <div class="cabecera ${clase}">
          <span class="icono">🎓</span>
          <h3>Clase ${c.numero}. ${c.titulo}</h3>
        </div>
        <div class="cuerpo">
          ${c.resumen ? `<div class="meta" style="margin-bottom:8px">${c.resumen}</div>` : ""}
          <div class="meta">${meta.join(" · ")}</div>
        </div>
        <div class="pie"><span class="btn btn-primario btn-bloque">Ver la clase</span></div>
      </a>`;
    })
    .join("");
})();
