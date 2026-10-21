// ============================================================
// Historial de Mi plan — historial.html
// Calendario para ver, de cualquier día pasado, lo que se hizo.
// ============================================================
const HI_EMAIL = "esmeraldaparaiso7@gmail.com";
const HI_MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const HI_DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function hiEsc(t) {
  return String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function hiFechaHoy() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}
const PLAN_GRUPOS_HI = [
  ["video", "🎬", "vídeo"],
  ["clase", "🎓", "clase"],
  ["tema", "📖", "tema"],
  ["test", "✍️", "test"],
  ["repaso", "🔁", "repaso"],
  ["cae", "🎯", "lo que más cae"],
];
const hiGrupo = (sub) => PLAN_GRUPOS_HI.find((g) => g[0] === sub) || ["otros", "📌", "tarea"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("", usuario, null);

  const cont = document.getElementById("historial-cont");
  if ((usuario.email || sesion.user?.email) !== HI_EMAIL) {
    cont.innerHTML = `<div class="vacio"><div class="icono">🔒</div>Esta página es personal.</div>`;
    return;
  }

  const hoy = hiFechaHoy();
  const [{ data: dias }, { data: hh }, { data: tiempos }] = await Promise.all([
    sb.from("plan_dia").select("fecha, tareas").order("fecha", { ascending: true }),
    sb.from("plan_hecho").select("clave, hecho_en"),
    sb.from("plan_tiempo").select("fecha, segundos"),
  ]);
  const tiempoDe = new Map((tiempos || []).map((x) => [x.fecha, x.segundos]));
  /** 4500 s -> «1 h 15 min»; corto: «1h15». */
  const hiTiempo = (seg, corto) => {
    const m = Math.floor((seg || 0) / 60), h = Math.floor(m / 60);
    if (corto) return h ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m}'`;
    return h ? `${h} h ${m % 60} min` : `${m} min`;
  };
  const hechos = new Map((hh || []).map((x) => [x.clave, x.hecho_en]));
  const porFecha = new Map((dias || []).map((d) => [d.fecha, d.tareas]));

  const hoyPartes = hoy.split("-").map(Number);
  let visto = { anio: hoyPartes[0], mes: hoyPartes[1] - 1 }; // mes 0-indexado
  let seleccionada = hoy;

  function render() {
    const primerDia = new Date(Date.UTC(visto.anio, visto.mes, 1));
    const ultimoDia = new Date(Date.UTC(visto.anio, visto.mes + 1, 0));
    // Lunes = 0 ... domingo = 6
    const offset = (primerDia.getUTCDay() + 6) % 7;
    const totalDias = ultimoDia.getUTCDate();

    const celdas = [];
    for (let i = 0; i < offset; i++) celdas.push(`<div class="hi-celda hi-vacia"></div>`);
    for (let d = 1; d <= totalDias; d++) {
      const fecha = `${visto.anio}-${String(visto.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tareas = porFecha.get(fecha);
      const esHoy = fecha === hoy;
      const esSel = fecha === seleccionada;
      let punto = "";
      if (tareas && tareas.length) {
        const n = tareas.filter((t) => hechos.has(t.clave)).length;
        const cls = n === tareas.length ? "hi-todo" : n === 0 ? "hi-nada" : "hi-parcial";
        punto = `<span class="hi-punto ${cls}"></span>`;
      }
      celdas.push(
        `<div class="hi-celda ${tareas ? "hi-con-plan" : ""} ${esHoy ? "hi-hoy" : ""} ${esSel ? "hi-seleccionada" : ""}" ${tareas ? `data-fecha="${fecha}"` : ""}>
          <span class="hi-num">${d}</span>${punto}${tiempoDe.get(fecha) >= 60 ? `<span style="display:block;font-size:.7rem;color:#16a34a;font-weight:700">⏱${hiTiempo(tiempoDe.get(fecha), true)}</span>` : ""}
        </div>`
      );
    }

    const puedeAvanzar = !(visto.anio === hoyPartes[0] && visto.mes === hoyPartes[1] - 1);

    cont.innerHTML = `
      <div class="hi-cabecera">
        <button type="button" id="hi-ant" aria-label="Mes anterior">←</button>
        <h2>${HI_MESES[visto.mes]} de ${visto.anio}</h2>
        <button type="button" id="hi-sig" aria-label="Mes siguiente" ${puedeAvanzar ? "" : "disabled style=\"opacity:.3;cursor:default\""}>→</button>
      </div>
      <div class="hi-grid">
        ${HI_DIAS_SEMANA.map((d) => `<div class="hi-dia-semana">${d}</div>`).join("")}
        ${celdas.join("")}
      </div>
      <div id="hi-detalle" class="hi-dia-detalle"></div>
    `;

    cont.querySelectorAll(".hi-celda[data-fecha]").forEach((el) =>
      el.addEventListener("click", () => {
        seleccionada = el.dataset.fecha;
        render();
        document.getElementById("hi-detalle")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
    document.getElementById("hi-ant").addEventListener("click", () => {
      visto.mes--;
      if (visto.mes < 0) { visto.mes = 11; visto.anio--; }
      render();
    });
    document.getElementById("hi-sig")?.addEventListener("click", () => {
      visto.mes++;
      if (visto.mes > 11) { visto.mes = 0; visto.anio++; }
      render();
    });

    pintarDetalle();
  }

  function pintarDetalle() {
    const det = document.getElementById("hi-detalle");
    if (!det) return;
    const tareas = porFecha.get(seleccionada);
    const fechaTxt = new Date(seleccionada + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    if (!tareas) {
      const s0 = tiempoDe.get(seleccionada);
      det.innerHTML = `<h3>${hiEsc(fechaTxt)}</h3><p class="pl-mini">Ese día no había plan generado.${s0 ? ` Tiempo de estudio: ${hiTiempo(s0)}.` : ""}</p>`;
      return;
    }
    const hechas = tareas.filter((t) => hechos.has(t.clave));
    const minHechos = hechas.reduce((s, t) => s + (t.min || 0), 0);
    det.innerHTML = `
      <h3>${hiEsc(fechaTxt)}</h3>
      <p class="pl-mini">${hechas.length} de ${tareas.length} tareas hechas · ${minHechos} min previstos</p>
      <p style="font-size:1.05rem;margin:4px 0 10px">⏱ Tiempo de estudio: <b>${tiempoDe.get(seleccionada) ? hiTiempo(tiempoDe.get(seleccionada)) : "sin registrar"}</b></p>
      ${
        hechas.length
          ? hechas.map((t) => {
              const g = hiGrupo(t.sub);
              return `<div class="pl-tarea hecha">
                <span class="pl-chk">✓</span>
                <div class="pl-cuerpo">
                  <div class="pl-etq">${g[1]} ${g[2]} · ${hiEsc(t.asig)} · ${t.min} min</div>
                  <div class="pl-tit">${hiEsc(t.titulo)}</div>
                </div>
              </div>`;
            }).join("")
          : `<p class="pl-mini">Ese día no se hizo ninguna tarea.</p>`
      }
    `;
  }

  render();
})();
