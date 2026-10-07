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

  const [{ data: preguntas }, { data: intentos }, { data: temasCompletos }, { data: agrupadas }] = await Promise.all([
    sb.from("preguntas").select("id, unidad").eq("asignatura_id", ASIGNATURA_ID),
    sb.from("intentos").select("pregunta_id, acierto, fecha").eq("usuario_id", usuario.id).order("fecha", { ascending: true }),
    sb.from("tema_completo").select("unidad_num, titulo").eq("asignatura_id", ASIGNATURA_ID).order("unidad_num"),
    sb.from("unidades_agrupadas").select("unidad, tema_num, tema_nombre").eq("asignatura_id", ASIGNATURA_ID),
  ]);
  // Unidades que tienen el «Tema completo» (texto + imágenes para leer o escuchar).
  const conTemaCompleto = new Set((temasCompletos || []).map((t) => t.unidad_num));
  const esAgrupada = (agrupadas || []).length > 0;

  // Asignaturas cuyas preguntas no vienen etiquetadas como «UD1, UD2…» sino con
  // nombres de tema sueltos (Interfaces de Usuario). En ese caso se agrupan.
  const grupoDe = new Map();
  for (const g of agrupadas || []) grupoDe.set(g.unidad, g);
  const hayGrupos = grupoDe.size > 0;

  const ultimoPorPregunta = new Map();
  for (const i of intentos || []) ultimoPorPregunta.set(i.pregunta_id, i.acierto);

  const porUnidad = new Map();
  for (const p of preguntas || []) {
    const g = hayGrupos ? grupoDe.get(p.unidad) : null;
    const clave = g ? "UD" + g.tema_num + ". " + g.tema_nombre : p.unidad;
    if (!porUnidad.has(clave)) {
      porUnidad.set(clave, { total: 0, practicadas: 0, aciertos: 0, grupo: g ? g.tema_num : null, unidad: p.unidad });
    }
    const o = porUnidad.get(clave);
    o.total++;
    if (ultimoPorPregunta.has(p.id)) {
      o.practicadas++;
      if (ultimoPorPregunta.get(p.id)) o.aciertos++;
    }
  }

  const unidades = [...porUnidad.keys()].sort((a, b) => {
    const na = porUnidad.get(a).grupo;
    const nb = porUnidad.get(b).grupo;
    if (na !== null && nb !== null) return na - nb;
    return a.localeCompare(b, "es");
  });
  const cont = document.getElementById("lista-temas");

  if (!unidades.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">📚</div>Todavía no hay preguntas cargadas para esta asignatura.<br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}">Volver al dashboard</a></div>`;
    return;
  }

  // Asignaturas con temas agrupados (Interfaces): el tema completo va por unidad del temario.
  const bloqueTemario = esAgrupada && (temasCompletos || []).length
    ? `<div style="grid-column:1/-1"><h3 style="margin:0 0 8px">📖 Temario completo (por unidad del temario)</h3>
        <div style="display:flex;flex-direction:column;gap:8px">${temasCompletos
          .map((t) => `<a class="btn btn-secundario btn-bloque" href="${enlaceAsignatura("tema.html", ASIGNATURA_ID, "tema=UD" + t.unidad_num)}">📖 UD${t.unidad_num}. ${t.titulo.replace(/\s*\(UD\d+ del temario\)/, "")}</a>`)
          .join("")}</div>
        <h3 style="margin:16px 0 0">📝 Practicar por temas</h3></div>`
    : "";

  cont.innerHTML = bloqueTemario + unidades
    .map((u, idx) => {
      const o = porUnidad.get(u);
      const dominio = o.practicadas ? Math.round((o.aciertos / o.practicadas) * 100) : 0;
      const clase = COLORES_CABECERA[idx % COLORES_CABECERA.length];
      const numUnidad = o.grupo !== null ? String(o.grupo) : (String(u).match(/^UD\s*(\d+)/) || [])[1];
      const urlTest = enlaceAsignatura(
        "quiz.html",
        ASIGNATURA_ID,
        o.grupo !== null ? "modo=tema&grupo=" + o.grupo : "modo=tema&unidad=" + encodeURIComponent(u)
      );
      if (!esAgrupada && numUnidad && conTemaCompleto.has(parseInt(numUnidad, 10))) {
        // Con tema completo: dos botones (leer/escuchar el tema y practicar).
        return `
      <div class="tarjeta">
        <div class="cabecera ${clase}">
          <span class="icono">📘</span>
          <h3>${u}</h3>
        </div>
        <div class="cuerpo">
          <div class="meta">${o.total} preguntas · ${o.practicadas} ya practicadas</div>
          <div class="barra-progreso"><div style="width:${dominio}%"></div></div>
          <div class="meta">${o.practicadas ? dominio + "% de acierto en este tema" : "Aún sin practicar"}</div>
        </div>
        <div class="pie" style="display:flex; flex-direction:column; gap:8px">
          <a class="btn btn-secundario btn-bloque" href="${enlaceAsignatura("tema.html", ASIGNATURA_ID, "tema=UD" + numUnidad)}">📖 Tema completo (leer o escuchar)</a>
          <a class="btn btn-primario btn-bloque" href="${urlTest}">Practicar tema</a>
        </div>
      </div>`;
      }
      return `
      <a class="tarjeta" href="${urlTest}">
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
