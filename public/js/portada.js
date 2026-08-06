// ============================================================
// Lógica de la portada (index.html) — Ingeniería Informática
// 4 pestañas de curso, cada una con sus asignaturas.
// ============================================================

const COLORES_TARJETA = ["", "g2", "g3", "g4"];
const ORDEN_CURSOS = ["1º CURSO", "2º CURSO", "3º CURSO", "4º CURSO"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("index.html", usuario, null);

  const [{ data: asignaturas }, { data: preguntas }] = await Promise.all([
    sb.from("asignaturas").select("id, curso, nombre").order("id"),
    sb.from("preguntas").select("id, asignatura_id"),
  ]);

  const conteoPreguntas = new Map();
  for (const p of preguntas || []) {
    conteoPreguntas.set(p.asignatura_id, (conteoPreguntas.get(p.asignatura_id) || 0) + 1);
  }

  const porCurso = new Map();
  for (const a of asignaturas || []) {
    if (!porCurso.has(a.curso)) porCurso.set(a.curso, []);
    porCurso.get(a.curso).push(a);
  }

  const cursosDisponibles = ORDEN_CURSOS.filter((c) => porCurso.has(c));
  // Por si aparece algún curso con un nombre distinto al esperado, lo añadimos igualmente al final
  for (const c of porCurso.keys()) {
    if (!cursosDisponibles.includes(c)) cursosDisponibles.push(c);
  }

  const tabsEl = document.getElementById("tabs-curso");
  const contenidoEl = document.getElementById("contenido-curso");

  tabsEl.innerHTML = cursosDisponibles
    .map((c, i) => `<button class="filtro-btn ${i === 0 ? "activo" : ""}" data-curso="${c}">${c}</button>`)
    .join("");

  function pintarCurso(curso) {
    const lista = porCurso.get(curso) || [];
    if (!lista.length) {
      contenidoEl.innerHTML = `<div class="vacio"><div class="icono">📭</div>No hay asignaturas cargadas en este curso todavía.</div>`;
      return;
    }
    contenidoEl.innerHTML = `<div class="grid-tarjetas">${lista
      .map((a, idx) => {
        const n = conteoPreguntas.get(a.id) || 0;
        const clase = COLORES_TARJETA[idx % COLORES_TARJETA.length];
        return `
        <a class="tarjeta" href="asignatura.html?asignatura=${a.id}">
          <div class="cabecera ${clase}">
            <span class="icono">📘</span>
            <h3>${a.nombre}</h3>
          </div>
          <div class="cuerpo">
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
