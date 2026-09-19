// ============================================================
// Mi racha — racha.html
// 3 tareas diarias con preguntas de exámenes oficiales, rotando entre
// las asignaturas que la usuaria elige cada trimestre.
// Toda la lógica está en Supabase (funciones racha_*_web).
// ============================================================

const RC_DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];
const RC_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

let rcEstado = null;
let rcMesAnio = new Date().getFullYear();
let rcMesNum = new Date().getMonth() + 1;
const rcMesActualAnio = rcMesAnio;
const rcMesActualNum = rcMesNum;

function rcEsc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/** 'YYYY-MM-DD' -> Date local (sin desfases de zona horaria). */
function rcFecha(s) {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("racha.html", usuario, null);

  await rcCargarTodo();

  document.getElementById("rc-mes-ant").addEventListener("click", () => rcCambiarMes(-1));
  document.getElementById("rc-mes-sig").addEventListener("click", () => rcCambiarMes(1));
  document.getElementById("rc-guardar").addEventListener("click", rcGuardarAsignaturas);

  // Si el navegador restaura la página desde su caché (botón "atrás" en el móvil),
  // hay que recargar los datos o parecería que se ha borrado lo ya hecho.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) rcCargarTodo();
  });

  // Celebración al volver de completar la tercera tarea
  const params = new URLSearchParams(window.location.search);
  if (params.get("celebrar") === "1") {
    history.replaceState(null, "", "racha.html");
    if (rcEstado && rcEstado.b1 && rcEstado.b2 && rcEstado.b3) rcCelebrar(rcEstado.racha_actual);
  }
})();

async function rcCargarTodo() {
  const [est, sem, asig] = await Promise.all([
    sb.rpc("racha_estado_hoy_web"),
    sb.rpc("racha_semana_web"),
    sb.rpc("racha_asignaturas_web"),
  ]);
  if (est.error || !est.data || !est.data[0]) {
    document.getElementById("rc-hero").innerHTML = `<div class="vacio"><div class="icono">😕</div>No se pudo cargar tu racha. Recarga la página en unos segundos.</div>`;
    document.getElementById("rc-hoy").innerHTML = "";
    return;
  }
  rcEstado = est.data[0];
  rcPintarHero();
  rcPintarSemana(sem.data || []);
  rcPintarTareas();
  rcPintarAsignaturas(asig.data || []);
  await rcPintarMes();
}

// ---------- Cabecera con el mensaje que anima ----------
function rcPintarHero() {
  const e = rcEstado;
  const hechas = [e.b1, e.b2, e.b3].filter(Boolean).length;
  const faltan = 3 - hechas;
  const r = e.racha_actual;
  let clase = "";
  let msg = "";
  if (faltan === 0) {
    clase = "rc-hecha";
    msg = `¡Racha de hoy completada! 🎉<small>Vuelve mañana para mantenerla${r >= 2 ? ` y llegar a ${r + 1} días` : ""}.</small>`;
  } else if (r > 0) {
    msg = `Te ${faltan === 1 ? "falta 1 tarea" : `faltan ${faltan} tareas`} para no perder tus ${r} día${r === 1 ? "" : "s"} de racha 🔥<small>Son solo unas pocas preguntas de exámenes reales.</small>`;
  } else if (hechas > 0) {
    msg = `¡Buen comienzo! Te ${faltan === 1 ? "falta 1 tarea" : `faltan ${faltan} tareas`} para empezar tu racha.<small>Termina las 3 hoy y ya llevarás 1 día.</small>`;
  } else {
    clase = "rc-apagada";
    msg = `Tu racha está apagada 😴<small>Completa las 3 tareas de hoy para encenderla.</small>`;
  }
  document.getElementById("rc-hero").innerHTML = `
    <div class="rc-hero ${clase}">
      <div class="rc-llama">${faltan === 0 || r > 0 ? "🔥" : "💤"}</div>
      <div><div class="rc-num">${r}</div><div class="rc-dias">día${r === 1 ? "" : "s"} seguido${r === 1 ? "" : "s"}</div></div>
      <div class="rc-msg">${msg}</div>
    </div>`;
}

// ---------- Tira de 7 días ----------
function rcPintarSemana(dias) {
  document.getElementById("rc-semana").innerHTML = dias
    .map((d) => {
      const f = rcFecha(d.dia);
      const letra = RC_DIAS_CORTOS[(f.getDay() + 6) % 7];
      return `<div class="rc-sem-dia ${d.completo ? "rc-ok" : ""} ${d.es_hoy ? "rc-hoy" : ""}">
        ${letra}<div class="rc-bolita">${d.completo ? "🔥" : d.es_hoy ? "·" : ""}</div>
      </div>`;
    })
    .join("");
}

// ---------- Las 3 tareas de hoy ----------
function rcPintarTareas() {
  const e = rcEstado;
  const base = `quiz.html?asignatura=${e.asig_id}&modo=racha&barra=`;
  const urlRepaso = `repaso.html?asignatura=${e.asig_id}&tema=${encodeURIComponent(e.tema_clave || "")}`;
  const tareas = [
    { n: 1, hecha: e.b1, icono: "🔁", titulo: "Repaso rápido", desc: "5 preguntas: primero las que fallaste, luego las que hace más que no ves." },
    { n: 2, hecha: e.b2, icono: "📝", titulo: "Test de la asignatura", desc: "10 preguntas de exámenes oficiales de hoy." },
    {
      n: 3, hecha: e.b3, icono: "🎯", titulo: "Tema del día",
      desc: e.tiene_repaso
        ? `Primero un repaso de ${rcEsc(e.tema || "el tema")} (con explicación y 🔊) y luego 5 preguntas.`
        : `5 preguntas de ${rcEsc(e.tema || "un tema")}.`,
    },
  ];
  const acciones = (t) => {
    if (t.n === 3 && e.tiene_repaso) {
      return `<div class="rc-acciones">
          <a class="btn ${t.hecha ? "btn-secundario" : "btn-primario"}" href="${urlRepaso}">📖 ${t.hecha ? "Repasar otra vez" : "Repasar y empezar"}</a>
          <a class="rc-saltar" href="${base}3">${t.hecha ? "Solo preguntas" : "Saltar al test"}</a>
        </div>`;
    }
    return `<a class="btn ${t.hecha ? "btn-secundario" : "btn-primario"}" href="${base}${t.n}">${t.hecha ? "Repetir" : "Empezar"}</a>`;
  };
  document.getElementById("rc-hoy").innerHTML = `
    <div class="rc-hoy-toca">
      <span class="rc-etq">Hoy toca:</span>
      <span class="rc-pildora rc-asig">📘 ${rcEsc(e.asig_nombre)}</span>
      ${e.tema ? `<span class="rc-pildora rc-tema">${rcEsc(e.tema)}</span>` : ""}
    </div>
    <div class="rc-tareas">
      ${tareas
        .map(
          (t) => `
        <div class="rc-tarea ${t.hecha ? "rc-hecha" : ""}">
          <div class="rc-check">${t.hecha ? "✓" : t.n}</div>
          <div class="rc-info">
            <div class="rc-titulo">${t.icono} ${t.titulo}</div>
            <div class="rc-desc">${t.desc}</div>
          </div>
          ${acciones(t)}
        </div>`
        )
        .join("")}
    </div>`;
}

// ---------- Histórico mensual ----------
async function rcPintarMes() {
  const { data } = await sb.rpc("racha_mes_web", { p_anio: rcMesAnio, p_mes: rcMesNum });
  const dias = data || [];
  document.getElementById("rc-mes-nombre").textContent = `${RC_MESES[rcMesNum - 1]} ${rcMesAnio}`;
  document.getElementById("rc-mes-sig").disabled = rcMesAnio === rcMesActualAnio && rcMesNum === rcMesActualNum;

  const hoyClave = claveDia(new Date().toISOString());
  const primero = dias.length ? rcFecha(dias[0].dia) : new Date(rcMesAnio, rcMesNum - 1, 1);
  const huecos = (primero.getDay() + 6) % 7;
  let html = RC_DIAS_CORTOS.map((l) => `<div class="rc-cab">${l}</div>`).join("");
  html += Array.from({ length: huecos }, () => `<div class="rc-celda rc-vacia"></div>`).join("");
  html += dias
    .map((d) => `<div class="rc-celda ${d.completo ? "rc-ok" : ""} ${d.dia === hoyClave ? "rc-hoy" : ""}">${rcFecha(d.dia).getDate()}</div>`)
    .join("");
  document.getElementById("rc-mes-grid").innerHTML = html;
}

async function rcCambiarMes(delta) {
  rcMesNum += delta;
  if (rcMesNum < 1) { rcMesNum = 12; rcMesAnio--; }
  if (rcMesNum > 12) { rcMesNum = 1; rcMesAnio++; }
  await rcPintarMes();
}

// ---------- Elegir asignaturas ----------
function rcPintarAsignaturas(lista) {
  const cont = document.getElementById("rc-lista-asig");
  if (!lista.length) {
    cont.innerHTML = `<div class="vacio">Todavía no hay asignaturas con preguntas de exámenes oficiales.</div>`;
    return;
  }
  const porCurso = new Map();
  for (const a of lista) {
    if (!porCurso.has(a.asig_curso)) porCurso.set(a.asig_curso, []);
    porCurso.get(a.asig_curso).push(a);
  }
  cont.innerHTML = [...porCurso.entries()]
    .map(
      ([curso, items]) => `
      <div class="rc-curso">${rcEsc(curso)}</div>
      ${items
        .map(
          (a) => `
        <label class="rc-check-asig ${a.elegida ? "rc-marcada" : ""}">
          <input type="checkbox" value="${a.asig_id}" ${a.elegida ? "checked" : ""} />
          <span>${rcEsc(a.asig_nombre)}</span>
          <span class="rc-n">${a.n_preguntas} preguntas</span>
        </label>`
        )
        .join("")}`
    )
    .join("");
  cont.querySelectorAll("input[type=checkbox]").forEach((cb) =>
    cb.addEventListener("change", () => cb.closest(".rc-check-asig").classList.toggle("rc-marcada", cb.checked))
  );
}

async function rcGuardarAsignaturas() {
  const aviso = document.getElementById("rc-aviso-guardar");
  const ids = [...document.querySelectorAll("#rc-lista-asig input:checked")].map((c) => parseInt(c.value, 10));
  const yaEmpezada = rcEstado && (rcEstado.b1 || rcEstado.b2 || rcEstado.b3);
  const btn = document.getElementById("rc-guardar");
  btn.disabled = true;
  const { error } = await sb.rpc("racha_guardar_asignaturas_web", { p_ids: ids });
  btn.disabled = false;
  if (error) {
    aviso.className = "rc-aviso rc-err";
    aviso.textContent = "No se pudo guardar. Inténtalo de nuevo.";
    return;
  }
  aviso.className = "rc-aviso rc-ok";
  aviso.textContent = ids.length
    ? yaEmpezada
      ? "Guardado ✓ Ya empezaste las tareas de hoy, así que el cambio se nota desde mañana."
      : "Guardado ✓ Ya he cambiado lo que toca hoy."
    : "Guardado ✓ Sin ninguna marcada, la racha rota entre todas las asignaturas.";
  await rcCargarTodo();
}

// ---------- Celebración con confeti ----------
function rcCelebrar(racha) {
  const fondo = document.createElement("div");
  fondo.className = "rc-modal-fondo";
  fondo.innerHTML = `
    <div class="rc-modal" role="dialog" aria-modal="true">
      <div class="rc-gran">🔥</div>
      <h2>¡Racha de hoy completada!</h2>
      <p>${racha} día${racha === 1 ? "" : "s"} seguido${racha === 1 ? "" : "s"}. Mañana, más.</p>
      <button class="btn btn-primario" id="rc-cerrar-modal">¡Genial!</button>
    </div>`;
  document.body.appendChild(fondo);
  const colores = ["#7c6ff0", "#4fa3e3", "#f28ba0", "#f3d675", "#7ed6a7", "#f5a97a"];
  const confeti = [];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("div");
    c.className = "rc-confeti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colores[i % colores.length];
    c.style.animationDuration = 2.2 + Math.random() * 2.2 + "s";
    c.style.animationDelay = Math.random() * 0.8 + "s";
    document.body.appendChild(c);
    confeti.push(c);
  }
  const cerrar = () => {
    fondo.remove();
    confeti.forEach((c) => c.remove());
  };
  fondo.querySelector("#rc-cerrar-modal").addEventListener("click", cerrar);
  fondo.addEventListener("click", (ev) => { if (ev.target === fondo) cerrar(); });
  setTimeout(() => confeti.forEach((c) => c.remove()), 6000);
}
