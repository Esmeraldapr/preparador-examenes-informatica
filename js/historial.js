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
  ["examen", "📝", "preguntas de examen"],
  ["calc", "🧮", "calculadora"],
  ["mano", "✏️", "ejercicio a mano"],
  ["simulacro", "🏁", "simulacro"],
  ["trabajo", "💼", "trabajo"],
];
const hiGrupo = (sub) => PLAN_GRUPOS_HI.find((g) => g[0] === sub) || ["otros", "📌", "tarea"];
// Tiempo que toca cada día (igual que planMetaMin de plan.js): fin de semana 5 h,
// teletrabajo (lunes, jueves y viernes) 4 h, resto 3 h. En minutos.
const HI_TELETRABAJO = [1, 4, 5];
const HI_FESTIVOS = ["2026-11-09", "2026-12-08", "2026-12-25", "2027-01-01", "2027-01-06"];
function hiMetaMin(f) {
  const d = new Date(f + "T12:00:00Z").getUTCDay();
  return [0, 6].includes(d) || HI_FESTIVOS.includes(f) ? 300 : HI_TELETRABAJO.includes(d) ? 240 : 180;
}
// Color de cada día según el tiempo:
// 🔴 rojo: no se hizo nada · 🟠 naranja: no llegó al tiempo que tocaba
// 🟢 verde: llegó · 🔵 azul: pasó de 6 horas.
const HI_AZUL_SEG = 6 * 3600;
function hiSumarDias(f, n) {
  const d = new Date(f + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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
  // ⏸ Días en pausa (trabajos): solo cuenta lo que se hizo; lo demás pasó al siguiente día sin pausa.
  const { data: pausas } = await sb.from("plan_pausa").select("desde, hasta");
  const enPausa = (f) => (pausas || []).some((p) => f >= p.desde && f <= p.hasta);
  const tiempoDe = new Map((tiempos || []).map((x) => [x.fecha, x.segundos]));
  // Primer día con plan: desde ahí, un día sin nada sale en rojo.
  const inicioPlan = (dias || []).length ? dias[0].fecha : null;
  // El cronómetro empezó más tarde que el plan: antes de su primer día, el color sale de las tareas hechas.
  const inicioCrono = (tiempos || []).map((x) => x.fecha).sort()[0] || null;
  const colorDe = (f) => {
    if (!inicioCrono || f < inicioCrono) {
      const ts = (dias || []).find((d) => d.fecha === f)?.tareas || [];
      if (!ts.length) return "";
      const n = ts.filter((t) => hechos.has(t.clave)).length;
      return n === ts.length ? "hi-verde" : n ? "hi-naranja" : "hi-rojo";
    }
    const s = tiempoDe.get(f) || 0;
    if (s > HI_AZUL_SEG) return "hi-azul";
    if (s >= hiMetaMin(f) * 60) return "hi-verde";
    if (s >= 60) return "hi-naranja";
    if (inicioPlan && f >= inicioPlan && f < hoy) return "hi-rojo";
    return "";
  };
  /** 4500 s -> «1 h 15 min»; corto: «1h15». */
  const hiTiempo = (seg, corto) => {
    const m = Math.floor((seg || 0) / 60), h = Math.floor(m / 60);
    if (corto) return h ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m}'`;
    return h ? `${h} h ${m % 60} min` : `${m} min`;
  };
  const hechos = new Map((hh || []).map((x) => [x.clave, x.hecho_en]));
  const porFecha = new Map((dias || []).map((d) => [d.fecha, enPausa(d.fecha) ? d.tareas.filter((t) => t.sub === "trabajo" || hechos.has(t.clave)) : d.tareas]));

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
    // Σ de la semana (lunes a domingo, aunque la semana empiece o acabe en otro mes).
    const sumaSemana = (lunes) => {
      let s = 0, meta = 0;
      for (let i = 0; i < 7; i++) {
        const f = hiSumarDias(lunes, i);
        s += tiempoDe.get(f) || 0;
        meta += hiMetaMin(f) * 60;
      }
      return `<div class="hi-celda hi-suma" title="Total de la semana (toca ${hiTiempo(meta)})"><span class="hi-num">Σ</span><span class="hi-suma-t">${s >= 60 ? hiTiempo(s, true) : "—"}</span></div>`;
    };
    const fechaDe = (d) => `${visto.anio}-${String(visto.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    for (let i = 0; i < offset; i++) celdas.push(`<div class="hi-celda hi-vacia"></div>`);
    for (let d = 1; d <= totalDias; d++) {
      const fecha = `${visto.anio}-${String(visto.mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tareas = porFecha.get(fecha);
      const esHoy = fecha === hoy;
      const esSel = fecha === seleccionada;
      let punto = "";
      const color = colorDe(fecha);
      if (enPausa(fecha) && (tareas || tiempoDe.get(fecha))) {
        punto = `<span style="display:block;font-size:.75rem">⏸</span>`;
      } else if (color) {
        punto = `<span class="hi-punto ${color}"></span>`;
      }
      celdas.push(
        `<div class="hi-celda ${tareas ? "hi-con-plan" : ""} ${esHoy ? "hi-hoy" : ""} ${esSel ? "hi-seleccionada" : ""}" ${tareas ? `data-fecha="${fecha}"` : ""}>
          <span class="hi-num">${d}</span>${punto}${tiempoDe.get(fecha) >= 60 ? `<span style="display:block;font-size:.7rem;color:#16a34a;font-weight:700">⏱${hiTiempo(tiempoDe.get(fecha), true)}</span>` : ""}
        </div>`
      );
      // Al llegar al domingo (o al último día del mes), la casilla con el total de la semana.
      if ((offset + d) % 7 === 0) celdas.push(sumaSemana(hiSumarDias(fecha, -6)));
      else if (d === totalDias) {
        for (let i = (offset + d) % 7; i < 7; i++) celdas.push(`<div class="hi-celda hi-vacia"></div>`);
        celdas.push(sumaSemana(hiSumarDias(fecha, -(((offset + d) % 7) - 1))));
      }
    }

    const puedeAvanzar = !(visto.anio === hoyPartes[0] && visto.mes === hoyPartes[1] - 1);

    cont.innerHTML = `
      <div class="hi-cabecera">
        <button type="button" id="hi-ant" aria-label="Mes anterior">←</button>
        <h2>${HI_MESES[visto.mes]} de ${visto.anio}</h2>
        <button type="button" id="hi-sig" aria-label="Mes siguiente" ${puedeAvanzar ? "" : "disabled style=\"opacity:.3;cursor:default\""}>→</button>
      </div>
      <div class="hi-grid">
        ${HI_DIAS_SEMANA.map((d) => `<div class="hi-dia-semana">${d}</div>`).join("")}<div class="hi-dia-semana">Σ</div>
        ${celdas.join("")}
      </div>
      <div class="hi-leyenda">
        <span><span class="hi-punto hi-rojo"></span> no hiciste nada</span>
        <span><span class="hi-punto hi-naranja"></span> no llegaste al tiempo</span>
        <span><span class="hi-punto hi-verde"></span> llegaste</span>
        <span><span class="hi-punto hi-azul"></span> más de 6 h</span>
        <span>⏸ pausa por trabajos</span>
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
      ${enPausa(seleccionada) ? `<p class="pl-mini">⏸ Plan en pausa por trabajos. Lo que tocaba este día pasó al siguiente día sin pausa.</p>` : `<p class="pl-mini">${hechas.length} de ${tareas.length} tareas hechas · ${minHechos} min previstos</p>`}
      <p style="font-size:1.05rem;margin:4px 0 10px">⏱ Tiempo de estudio: <b>${tiempoDe.get(seleccionada) ? hiTiempo(tiempoDe.get(seleccionada)) : "sin registrar"}</b>${enPausa(seleccionada) ? "" : (() => { const s = tiempoDe.get(seleccionada) || 0; const meta = hiMetaMin(seleccionada) * 60; return s > meta + 59 ? ` · te pasaste ${hiTiempo(s - meta)} 💪` : s ? ` · faltó ${hiTiempo(meta - s)}` : ""; })()}</p>
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
