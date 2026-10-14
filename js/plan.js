// ============================================================
// Mi plan — plan diario automático (plan.html)
// Tareas: 🟣 contenido nuevo · 🟠 repaso (días 1, 3, 7 y 30) · 🟢 test
// ============================================================
const PLAN_EMAIL = "esmeraldaparaiso7@gmail.com";
const PLAN_ASIGNATURAS = [1, 6, 24]; // Cálculo, FFE, Interfaces (Interfaces: 1 de cada 3 días)
const PLAN_INTERFACES = 24;
const PLAN_REPASOS = [1, 3, 7, 30];
const PLAN_MIN = { clase: 40, video: 20, tema: 45, test: 15, repaso: 10 };

function planFechaMadrid(d) {
  return (d || new Date()).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}
function planSumarDias(f, n) {
  const d = new Date(f + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function planDiaSemana(f) { return new Date(f + "T12:00:00Z").getUTCDay(); } // 0 = domingo
function planDiaDelAnio(f) {
  const d = new Date(f + "T12:00:00Z");
  return Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 0))) / 86400000);
}
const planEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Lista ordenada de cosas nuevas de una asignatura (en el orden del curso).
async function planCatalogo(asigId) {
  const [cl, vi, te, as] = await Promise.all([
    sb.from("clases").select("numero, titulo, unidad_num").eq("asignatura_id", asigId),
    sb.from("recursos").select("id, titulo, url, unidad, minuto_inicio, orden").eq("asignatura_id", asigId).eq("origen", "profe").eq("verificado", true),
    sb.from("tema_completo").select("unidad_num, titulo").eq("asignatura_id", asigId),
    sb.from("asignaturas").select("nombre").eq("id", asigId).single(),
  ]);
  const nombre = (as.data?.nombre || "").split(" ")[0];
  const unidades = new Set();
  (cl.data || []).forEach((c) => c.unidad_num && unidades.add(c.unidad_num));
  (te.data || []).forEach((t) => unidades.add(t.unidad_num));
  (vi.data || []).forEach((v) => /^UD\d+$/.test(v.unidad || "") && unidades.add(parseInt(v.unidad.slice(2), 10)));
  const items = [];
  [...unidades].sort((a, b) => a - b).forEach((u) => {
    (cl.data || []).filter((c) => c.unidad_num === u).forEach((c) =>
      items.push({ clave: `clase:${asigId}:${c.numero}`, tipo: "nuevo", sub: "clase", asig: nombre, asigId, titulo: `Clase ${c.numero} del profe: ${c.titulo}`, min: PLAN_MIN.clase, url: `clase.html?asignatura=${asigId}&clase=${c.numero}`, repasable: true }));
    (vi.data || []).filter((v) => v.unidad === "UD" + u).sort((a, b) => a.orden - b.orden).forEach((v) =>
      items.push({ clave: `video:${v.id}`, tipo: "nuevo", sub: "video", asig: nombre, asigId, titulo: "🎬 " + v.titulo.replace(/^Del profe:\s*/, "Del profe: "), min: PLAN_MIN.video, url: v.url + (v.minuto_inicio && /youtu/.test(v.url) ? (v.url.includes("?") ? "&" : "?") + "t=" + v.minuto_inicio : ""), externo: true }));
    const t = (te.data || []).find((x) => x.unidad_num === u);
    if (t) {
      items.push({ clave: `tema:${asigId}:UD${u}`, tipo: "nuevo", sub: "tema", asig: nombre, asigId, titulo: `Tema completo UD${u}: ${t.titulo}`, min: PLAN_MIN.tema, url: `tema.html?asignatura=${asigId}&tema=UD${u}`, repasable: true, repasoUrl: `repaso.html?asignatura=${asigId}&tema=UD${u}` });
      items.push({ clave: `test:${asigId}:UD${u}`, tipo: "test", sub: "test", asig: nombre, asigId, titulo: `Test de la UD${u}`, min: PLAN_MIN.test, url: `repaso.html?asignatura=${asigId}&tema=UD${u}` });
    }
  });
  return items;
}

function planGenerar(hoy, catalogos, hechos) {
  const finde = [0, 6].includes(planDiaSemana(hoy));
  const presupuesto = finde ? 300 : 180;
  const tareas = [];
  let usado = 0;

  // 🟠 Repasos que tocan (el primero sin hacer de cada cosa), como mucho el 40 % del tiempo.
  const repasos = [];
  Object.values(catalogos).flat().filter((i) => i.repasable).forEach((i) => {
    const h = hechos.get(i.clave);
    if (!h) return;
    const dia = planFechaMadrid(new Date(h));
    const k = PLAN_REPASOS.find((n) => !hechos.has(`rep:${i.clave}:${n}`));
    if (k === undefined) return;
    const vence = planSumarDias(dia, k);
    if (vence <= hoy) repasos.push({ vence, k, i });
  });
  repasos.sort((a, b) => a.vence.localeCompare(b.vence));
  for (const r of repasos) {
    if (usado + PLAN_MIN.repaso > presupuesto * 0.4) break;
    tareas.push({ clave: `rep:${r.i.clave}:${r.k}`, tipo: "repaso", asig: r.i.asig, asigId: r.i.asigId, titulo: `Repaso (día ${r.k}): ${r.i.titulo.replace(/^Clase \d+ del profe: /, "")}`, min: PLAN_MIN.repaso, url: r.i.repasoUrl || r.i.url });
    usado += PLAN_MIN.repaso;
  }

  // 🟣🟢 Lo nuevo, mezclando asignaturas (Interfaces solo 1 de cada 3 días).
  const hayInterfaces = planDiaDelAnio(hoy) % 3 === 0;
  const colas = PLAN_ASIGNATURAS.filter((a) => a !== PLAN_INTERFACES || hayInterfaces).map((a) => ({
    id: a,
    pend: (catalogos[a] || []).filter((i) => !hechos.has(i.clave)),
    tope: a === PLAN_INTERFACES ? 60 : Infinity,
    gastado: 0,
  }));
  let avanzo = true;
  while (usado < presupuesto && avanzo) {
    avanzo = false;
    for (const c of colas) {
      if (usado >= presupuesto) break;
      const sig = c.pend[0];
      if (!sig || c.gastado + sig.min > c.tope) continue;
      c.pend.shift();
      tareas.push({ clave: sig.clave, tipo: sig.tipo, asig: sig.asig, asigId: sig.asigId, titulo: sig.titulo, min: sig.min, url: sig.url, externo: !!sig.externo });
      usado += sig.min; c.gastado += sig.min; avanzo = true;
    }
  }
  return tareas;
}


// ------------------------------------------------------------
// «Pregúntame»: contesta con lo que hay en la web, sin salir de la página.
// Entiende preguntas escritas y tiene botones con las más normales.
// ------------------------------------------------------------
function planResponder(texto, ctx) {
  const q = (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const { tareas, hechos, fechas } = ctx;
  const pend = tareas.filter((t) => !hechos.has(t.clave));
  const hechas = tareas.filter((t) => hechos.has(t.clave));
  const min = (l) => l.reduce((s, t) => s + t.min, 0);
  const lista = (l) => l.map((t) => "- " + t.titulo + " (" + t.min + " min)").join("\n");
  const tiene = (...p) => p.some((x) => q.includes(x));

  // Por asignatura
  const asigs = [
    ["calculo", "Cálculo"],
    ["fundamentos", "Fundamentos"],
    ["fisica", "Fundamentos"],
    ["ffe", "Fundamentos"],
    ["interfaces", "Interfaces"],
  ];
  const pedida = asigs.find(([k]) => q.includes(k));
  if (pedida) {
    const n = pedida[1];
    const suyas = tareas.filter((t) => t.asig === n);
    if (!suyas.length) return "Hoy no toca " + n + ". Lo verás otro día.";
    const sp = suyas.filter((t) => !hechos.has(t.clave));
    if (!sp.length) return "De " + n + " ya lo tienes todo hecho hoy. Bien.";
    return "De " + n + " te queda esto hoy:\n" + lista(sp);
  }

  if (tiene("entrega", "entregable", "plazo", "fecha limite", "examen")) {
    if (!fechas.length) return "No tienes ninguna entrega apuntada ahora mismo.";
    return (
      "Lo que tienes por entregar:\n" +
      fechas
        .map((f) => {
          const d = Math.ceil((new Date(f.fecha) - new Date()) / 86400000);
          return "- " + f.titulo + " — " + (d <= 0 ? "¡es hoy!" : "quedan " + d + " día" + (d === 1 ? "" : "s"));
        })
        .join("\n")
    );
  }
  if (tiene("repaso", "repasar")) {
    const r = pend.filter((t) => t.tipo === "repaso");
    if (!r.length) return "Hoy no te toca ningún repaso. Los repasos salen a los 1, 3, 7 y 30 días de acabar algo.";
    return "Hoy te toca repasar esto:\n" + lista(r);
  }
  if (tiene("test", "pregunta")) {
    const r = pend.filter((t) => t.tipo === "test");
    if (!r.length) return "Hoy no te queda ningún test.";
    return "Test que te quedan hoy:\n" + lista(r);
  }
  if (tiene("video", "profe", "clase")) {
    const r = pend.filter((t) => /^(🎬|Clase)/.test(t.titulo));
    if (!r.length) return "Hoy no te queda ningún vídeo ni clase del profe.";
    return "Vídeos y clases del profe que te quedan hoy:\n" + lista(r);
  }
  if (tiene("cuanto", "cuantas", "minuto", "hora", "tiempo", "falta")) {
    if (!pend.length) return "Nada. Hoy ya está hecho.";
    return (
      "Te quedan " + pend.length + " tarea" + (pend.length === 1 ? "" : "s") +
      ", unos " + min(pend) + " minutos. Ya llevas hechos " + min(hechas) + " minutos."
    );
  }
  if (tiene("hecho", "llevo", "he hecho", "completad")) {
    if (!hechas.length) return "Hoy todavía no has marcado nada como hecho.";
    return "Hoy llevas hechas " + hechas.length + " de " + tareas.length + " tareas:\n" + lista(hechas);
  }
  if (tiene("primero", "empiezo", "empezar", "ahora")) {
    if (!pend.length) return "Nada. Hoy ya está hecho. Si quieres seguir, pulsa «Rehacer lo que falta de hoy».";
    return "Empieza por esto:\n- " + pend[0].titulo + " (" + pend[0].min + " min)";
  }

  // Por defecto: qué toca hoy
  if (!tareas.length) return "Hoy no hay tareas preparadas. Pulsa «Rehacer lo que falta de hoy».";
  if (!pend.length) return "Hoy ya está todo hecho. Has hecho " + tareas.length + " tareas y " + min(tareas) + " minutos.";
  return (
    "Hoy toca esto, unos " + min(pend) + " minutos:\n" + lista(pend) +
    "\n\nEmpieza por la primera: " + pend[0].titulo + "."
  );
}

const PLAN_CHIPS = [
  ["¿Qué toca hoy?", "que toca hoy"],
  ["¿Cuánto me queda?", "cuanto me queda"],
  ["¿Qué repaso hoy?", "repaso"],
  ["¿Qué entrego pronto?", "entrega"],
  ["¿Por dónde empiezo?", "primero"],
];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;
  pintarNavbar("plan.html", usuario, null);
  const cont = document.getElementById("plan-cont");
  if ((usuario.email || sesion.user?.email) !== PLAN_EMAIL) {
    cont.innerHTML = `<div class="vacio"><div class="icono">🔒</div>Esta página es personal.</div>`;
    return;
  }
  const hoy = planFechaMadrid();

  async function cargar(regenerar) {
    const [{ data: hh }, { data: dia }] = await Promise.all([
      sb.from("plan_hecho").select("clave, hecho_en"),
      sb.from("plan_dia").select("fecha, tareas").order("fecha", { ascending: false }).limit(8),
    ]);
    const hechos = new Map((hh || []).map((x) => [x.clave, x.hecho_en]));
    let delHoy = (dia || []).find((d) => d.fecha === hoy);
    if (!delHoy || regenerar) {
      const catalogos = {};
      await Promise.all(PLAN_ASIGNATURAS.map(async (a) => (catalogos[a] = await planCatalogo(a))));
      // Lo de hoy que ya está hecho se conserva; se vuelve a generar solo lo pendiente.
      const previas = regenerar && delHoy ? delHoy.tareas.filter((t) => hechos.has(t.clave)) : [];
      const hechosSinHoy = new Map([...hechos].filter(([k]) => !previas.some((p) => p.clave === k)));
      const nuevas = planGenerar(hoy, catalogos, hechosSinHoy).filter((t) => !previas.some((p) => p.clave === t.clave));
      const tareas = [...previas, ...nuevas];
      await sb.from("plan_dia").upsert({ fecha: hoy, tareas }, { onConflict: "auth_user_id,fecha" });
      delHoy = { fecha: hoy, tareas };
      (dia || []).splice(0, 0);
    }
    pintar(delHoy.tareas, hechos, dia || []);
  }

  async function marcar(clave, hecha) {
    if (hecha) await sb.from("plan_hecho").upsert({ clave }, { onConflict: "auth_user_id,clave" });
    else await sb.from("plan_hecho").delete().eq("clave", clave);
    cargar(false);
  }

  async function pintar(tareas, hechos, dias) {
    const hechas = tareas.filter((t) => hechos.has(t.clave));
    const minTot = tareas.reduce((s, t) => s + t.min, 0);
    const minHechos = hechas.reduce((s, t) => s + t.min, 0);
    const pct = tareas.length ? Math.round((hechas.length / tareas.length) * 100) : 0;
    const quedan = tareas.length - hechas.length;
    const { data: fechas } = await sb.from("plan_fechas").select("titulo, fecha, asignatura_id").gte("fecha", new Date().toISOString()).order("fecha").limit(6);
    const cuenta = (tipo) => tareas.filter((t) => t.tipo === tipo).length;
    const histo = dias.filter((d) => d.fecha < hoy).slice(0, 6).map((d) => {
      const h = d.tareas.filter((t) => hechos.has(t.clave)).length;
      return `<div class="pl-fecha">${planEsc(d.fecha)} · ${h} de ${d.tareas.length} hechas</div>`;
    }).join("");
    const pendientes = tareas.filter((t) => !hechos.has(t.clave));
    const ctx = { tareas, hechos, fechas: fechas || [] };
    cont.innerHTML = `
      <div class="pl-pregunta">
        <b>🗣️ Pregúntame</b>
        <div class="pl-chips">${PLAN_CHIPS.map((c, i) => `<button class="filtro-btn" data-chip="${i}">${planEsc(c[0])}</button>`).join("")}</div>
        <div class="pl-escribe">
          <input id="pl-q" type="text" placeholder="O escríbelo: ¿qué toca hoy de cálculo?" />
          <button class="btn btn-primario" id="pl-enviar">Preguntar</button>
        </div>
        <div class="pl-respuesta" id="pl-resp" hidden></div>
      </div>
      ${pendientes.length ? `<p><a class="btn btn-primario btn-bloque" href="${planEsc(pendientes[0].url)}" ${pendientes[0].externo ? 'target="_blank" rel="noopener"' : ""}>▶ Empezar ahora: ${planEsc(pendientes[0].titulo)}</a></p>` : ""}
      <div class="pl-resumen">
        <h2>${quedan === 0 && tareas.length ? "🎉 ¡Hoy está hecho!" : `Hoy te quedan ${quedan} tarea${quedan === 1 ? "" : "s"}`}</h2>
        <div>${minHechos} de ${minTot} minutos hechos</div>
        <div class="pl-barra"><span style="width:${pct}%"></span></div>
        <div class="pl-leyenda"><span>🟣 Nuevo: ${cuenta("nuevo")}</span><span>🟠 Repaso: ${cuenta("repaso")}</span><span>🟢 Test: ${cuenta("test")}</span></div>
      </div>
      ${(fechas || []).length ? `<div class="pl-aviso"><b>⏰ Próximas fechas</b>${fechas.map((f) => `<div>${planEsc(f.titulo)} — <b>${new Date(f.fecha).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</b></div>`).join("")}</div>` : ""}
      ${tareas.map((t, i) => {
        const h = hechos.has(t.clave);
        const ico = t.tipo === "repaso" ? "🟠" : t.tipo === "test" ? "🟢" : "🟣";
        const etq = t.tipo === "repaso" ? "Repaso" : t.tipo === "test" ? "Test" : "Nuevo";
        return `<div class="pl-tarea ${t.tipo} ${h ? "hecha" : ""}">
          <button class="pl-chk" data-i="${i}" title="Marcar como hecha">${h ? "✓" : ""}</button>
          <div class="pl-cuerpo">
            <div class="pl-etq">${ico} ${etq} · ${planEsc(t.asig)} · ${t.min} min</div>
            <div class="pl-tit">${planEsc(t.titulo)}</div>
            <a class="btn btn-secundario" href="${planEsc(t.url)}" ${t.externo ? 'target="_blank" rel="noopener"' : ""}>Abrir</a>
          </div></div>`;
      }).join("") || '<div class="vacio">Hoy no hay tareas.</div>'}
      <p class="pl-mini">Lo que no termines pasa solo a mañana. Los repasos salen a los 1, 3, 7 y 30 días de acabar algo.</p>
      <h3 class="pl-h3">🗓️ Días anteriores</h3>${histo || '<p class="pl-mini">Aún no hay días anteriores.</p>'}
      <p><button class="btn btn-secundario" id="pl-rehacer">🔄 Rehacer lo que falta de hoy</button></p>`;
    cont.querySelectorAll(".pl-chk").forEach((b) => b.addEventListener("click", () => {
      const t = tareas[+b.dataset.i];
      marcar(t.clave, !hechos.has(t.clave));
    }));
    document.getElementById("pl-rehacer").addEventListener("click", () => cargar(true));

    const resp = document.getElementById("pl-resp");
    const entrada = document.getElementById("pl-q");
    function contestar(texto) {
      const r = planResponder(texto, ctx);
      resp.hidden = false;
      resp.innerHTML =
        `<div class="pl-parrafos parrafo-leible">${r.split("\n").map((l) => `<div>${planEsc(l)}</div>`).join("")}</div>` +
        `<button class="btn btn-secundario" id="pl-oir">🔊 Escuchar la respuesta</button>`;
      document.getElementById("pl-oir").addEventListener("click", (ev) => {
        leerTexto("", [resp.querySelector(".pl-parrafos")], ev.currentTarget);
      });
      resp.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    cont.querySelectorAll("[data-chip]").forEach((b) =>
      b.addEventListener("click", () => {
        entrada.value = PLAN_CHIPS[+b.dataset.chip][0];
        contestar(PLAN_CHIPS[+b.dataset.chip][1]);
      })
    );
    document.getElementById("pl-enviar").addEventListener("click", () => contestar(entrada.value));
    entrada.addEventListener("keydown", (e) => {
      if (e.key === "Enter") contestar(entrada.value);
    });
  }

  cargar(false);
})();
