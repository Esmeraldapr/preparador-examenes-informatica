// ============================================================
// Lógica de la portada (index.html) — Ingeniería Informática
// 4 pestañas de curso, cada una con sus asignaturas.
// ============================================================

const COLORES_TARJETA = ["", "g2", "g3", "g4"];
// Asignaturas del primer trimestre (salen primero, en este orden).
const PRIMER_TRIMESTRE = ["Cálculo", "Fundamentos Físicos"];
const ORDEN_CURSOS = ["1º CURSO", "2º CURSO", "3º CURSO", "4º CURSO"];
// Dibujo neón de cada asignatura (img/asig-<nombre>.svg), según su id.
const IMAGEN_ASIGNATURA = {
  1: "calculo", 2: "ingles", 3: "eda", 4: "etc1", 5: "etc2", 6: "ffe", 7: "prog", 8: "discreta",
  9: "tcp", 10: "arq", 11: "bd", 12: "ingles", 13: "poo", 14: "empresa", 15: "ia", 16: "estad",
  17: "redes", 18: "so", 19: "web", 20: "proyectos", 21: "so", 22: "seguridad", 23: "ingsoft",
  24: "interfaces", 25: "ia", 26: "concurrente", 27: "redes", 28: "hacking", 29: "biometria",
  30: "comercio", 31: "cripto", 32: "proyectos", 33: "bd", 34: "agil", 35: "web", 36: "servidor",
  37: "libre", 38: "hacking", 39: "forense", 40: "valores",
};
function imagenAsignatura(a) {
  return `img/asig-${IMAGEN_ASIGNATURA[a.id] || "prog"}.svg`;
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("index.html", usuario, null);

  // Caja «Hoy toca» (solo para Esmeralda): lo que queda del plan de hoy.
  if (usuario?.email === "esmeraldaparaiso7@gmail.com") {
    try {
      const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
      const [{ data: dia }, { data: hh }] = await Promise.all([
        sb.from("plan_dia").select("tareas").eq("fecha", hoy).maybeSingle(),
        sb.from("plan_hecho").select("clave"),
      ]);
      const hechas = new Set((hh || []).map((x) => x.clave));
      const tareas = dia?.tareas || [];
      const quedan = tareas.filter((t) => !hechas.has(t.clave));
      const caja = document.createElement("a");
      caja.href = "plan.html";
      caja.className = "panel";
      caja.style.cssText = "display:block;text-decoration:none;color:inherit;margin-bottom:16px;border-left:8px solid #36ECDE";
      caja.innerHTML = !dia
        ? `<b>📅 Hoy toca…</b><br>Pulsa para ver tu plan de hoy.`
        : quedan.length
        ? `<b>📅 Hoy te quedan ${quedan.length} tarea${quedan.length === 1 ? "" : "s"}</b><br>Siguiente: ${quedan[0].titulo.replace(/[<>&]/g, "")}`
        : `<b>🎉 Hoy está hecho</b><br>Buen trabajo.`;
      document.querySelector(".contenedor h1")?.insertAdjacentElement("afterend", caja);
    } catch (e) {}
  }

  const { data: asignaturas } = await sb.from("asignaturas").select("id, curso, nombre").order("id");

  // Cuenta las preguntas de cada asignatura (un conteo por asignatura,
  // así no se corta en las 1000 filas que devuelve Supabase por defecto).
  const conteoPreguntas = new Map();
  await Promise.all(
    (asignaturas || []).map(async (a) => {
      const { count } = await sb
        .from("preguntas")
        .select("id", { count: "exact", head: true })
        .eq("asignatura_id", a.id);
      conteoPreguntas.set(a.id, count || 0);
    })
  );

  const porCurso = new Map();
  for (const a of asignaturas || []) {
    if (!porCurso.has(a.curso)) porCurso.set(a.curso, []);
    porCurso.get(a.curso).push(a);
  }

  const cursosDisponibles = ORDEN_CURSOS.filter((c) => porCurso.has(c));
  for (const c of porCurso.keys()) {
    if (!cursosDisponibles.includes(c)) cursosDisponibles.push(c);
  }

  const tabsEl = document.getElementById("tabs-curso");
  const contenidoEl = document.getElementById("contenido-curso");

  tabsEl.innerHTML = cursosDisponibles
    .map((c, i) => `<button class="filtro-btn ${i === 0 ? "activo" : ""}" data-curso="${c}">${c}</button>`)
    .join("");

  function pintarCurso(curso) {
    // El color de cada tarjeta se queda como estaba (según su orden original).
    // Solo cambia la posición: las asignaturas del primer trimestre van primero.
    const lista = (porCurso.get(curso) || []).map((a, i) => ({ ...a, _color: i }));
    lista.sort((x, y) => {
      const px = PRIMER_TRIMESTRE.findIndex((t) => x.nombre.startsWith(t));
      const py = PRIMER_TRIMESTRE.findIndex((t) => y.nombre.startsWith(t));
      const ox = px === -1 ? 999 : px;
      const oy = py === -1 ? 999 : py;
      return ox - oy || x._color - y._color;
    });
    if (!lista.length) {
      contenidoEl.innerHTML = `<div class="vacio"><div class="icono">📭</div>No hay asignaturas cargadas en este curso todavía.</div>`;
      return;
    }
    contenidoEl.innerHTML = `<div class="grid-tarjetas">${lista
      .map((a) => {
        const n = conteoPreguntas.get(a.id) || 0;
        return `
        <a class="tarjeta tarjeta-asig" href="asignatura.html?asignatura=${a.id}">
          <div class="asig-imagen" style="background-image:url('${imagenAsignatura(a)}')"></div>
          <div class="cuerpo">
            <h3>${a.nombre}</h3>
            ${n > 0 ? `<div class="meta">${n} preguntas cargadas</div>` : `<div class="meta">Próximamente</div>`}
          </div>
          <div class="pie"><span class="btn btn-primario btn-bloque">Entrar</span></div>
        </a>`;
      })
      .join("")}</div>`;
  }

  tabsEl.querySelectorAll(".filtro-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabsEl.querySelectorAll(".filtro-btn").forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      pintarCurso(btn.dataset.curso);
    });
  });

  if (cursosDisponibles.length) pintarCurso(cursosDisponibles[0]);
  else contenidoEl.innerHTML = `<div class="vacio"><div class="icono">📭</div>Aún no hay asignaturas cargadas.</div>`;
})();
