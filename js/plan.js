// ============================================================
// Mi plan — plan diario automático (plan.html)
// Tareas: 🎓 clase · 🎬 vídeo del profe · 📖 tema · ✍️ test · 🔁 repaso (días 1, 3, 7 y 30)
// ============================================================
const PLAN_EMAIL = "esmeraldaparaiso7@gmail.com";
const PLAN_ASIGNATURAS = [1, 6, 24]; // Cálculo, FFE, Interfaces (Interfaces: 1 de cada 3 días)
const PLAN_INTERFACES = 24;
const PLAN_REPASOS = [1, 3, 7, 30];
const PLAN_MIN = { clase: 40, video: 20, tema: 45, test: 15, repaso: 10, cae: 15 };

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
    sb.from("recursos").select("id, titulo, url, unidad, minuto_inicio, orden, tipo, duracion_min").eq("asignatura_id", asigId).eq("origen", "profe").eq("verificado", true),
    sb.from("tema_completo").select("unidad_num, unidad, titulo").eq("asignatura_id", asigId),
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
      items.push({ clave: `clase:${asigId}:${c.numero}`, tipo: "nuevo", sub: "clase", asig: nombre, asigId, unidadNum: u, titulo: `Clase ${c.numero} del profe: ${c.titulo}`, min: PLAN_MIN.clase, url: `clase.html?asignatura=${asigId}&clase=${c.numero}`, repasable: true }));
    // Cada vídeo es una tarea suelta, con sus minutos reales (duracion_min) si los tenemos.
    const videosUD = (vi.data || []).filter((v) => v.unidad === "UD" + u).sort((a, b) => a.orden - b.orden);
    const meteVideo = (v) =>
      items.push({ clave: `video:${v.id}`, tipo: "nuevo", sub: "video", asig: nombre, asigId, unidadNum: u, titulo: v.titulo, min: v.duracion_min || PLAN_MIN.video, url: v.url + (v.minuto_inicio && /youtu/.test(v.url) ? (v.url.includes("?") ? "&" : "?") + "t=" + v.minuto_inicio : ""), externo: true });
    // Vídeos de explicación: antes del tema. Vídeos de ejercicios: después del tema y del test.
    videosUD.filter((v) => v.tipo !== "ejercicios").forEach(meteVideo);
    const t = (te.data || []).find((x) => x.unidad_num === u);
    if (t) {
      items.push({ clave: `tema:${asigId}:UD${u}`, tipo: "nuevo", sub: "tema", asig: nombre, asigId, unidadNum: u, unidadTexto: t.unidad, titulo: `Tema completo UD${u}: ${t.titulo}`, min: PLAN_MIN.tema, url: `tema.html?asignatura=${asigId}&tema=UD${u}`, repasable: true, repasoUrl: `repaso.html?asignatura=${asigId}&tema=UD${u}` });
      items.push({ clave: `test:${asigId}:UD${u}`, tipo: "test", sub: "test", asig: nombre, asigId, unidadNum: u, unidadTexto: t.unidad, titulo: `Test de la UD${u}`, min: PLAN_MIN.test, url: `repaso.html?asignatura=${asigId}&tema=UD${u}&claveplan=${encodeURIComponent("test:" + asigId + ":UD" + u)}` });
    }
    videosUD.filter((v) => v.tipo === "ejercicios").forEach(meteVideo);
  });
  return items;
}

function planGenerar(hoy, catalogos, hechos) {
  const finde = [0, 6].includes(planDiaSemana(hoy));
  const presupuesto = finde ? 300 : 180;
  const tareas = [];
  let usado = 0;

  // 🔁 Repasos que tocan (el primero sin hacer de cada cosa), como mucho el 40 % del tiempo.
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
    tareas.push({ clave: `rep:${r.i.clave}:${r.k}`, tipo: "repaso", sub: "repaso", asig: r.i.asig, asigId: r.i.asigId, titulo: `Repaso (día ${r.k}): ${r.i.titulo.replace(/^Clase \d+ del profe: /, "")}`, min: PLAN_MIN.repaso, url: r.i.repasoUrl || r.i.url });
    usado += PLAN_MIN.repaso;
  }

  // 🎯 Una tanda diaria de lo que más cae en los exámenes, empezando por lo que falla.
  const hayInterfaces = planDiaDelAnio(hoy) % 3 === 0;
  const activas = PLAN_ASIGNATURAS.filter((a) => a !== PLAN_INTERFACES || hayInterfaces);
  const elegida = activas[planDiaDelAnio(hoy) % activas.length];
  const nombreElegida = (catalogos[elegida] || [])[0]?.asig || "";
  if (nombreElegida) {
    tareas.push({
      clave: `cae:${elegida}:${hoy}`, tipo: "test", sub: "cae", asig: nombreElegida, asigId: elegida,
      titulo: `Lo que más cae en los exámenes de ${nombreElegida}`, min: PLAN_MIN.cae,
      url: `quiz.html?asignatura=${elegida}&modo=cae&n=8&desde=plan&claveplan=${encodeURIComponent("cae:" + elegida + ":" + hoy)}`,
    });
    usado += PLAN_MIN.cae;
  }

  // 📖✍️ Lo nuevo, mezclando asignaturas (Interfaces solo 1 de cada 3 días).
  const colas = activas.map((a) => ({
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
      tareas.push({ clave: sig.clave, tipo: sig.tipo, sub: sig.sub, asig: sig.asig, asigId: sig.asigId, unidadNum: sig.unidadNum, unidadTexto: sig.unidadTexto, titulo: sig.titulo, min: sig.min, url: sig.url, externo: !!sig.externo });
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

  if (tiene("no entra", "quita", "sobra") || (tiene("entra") && tiene("no"))) {
    const n = (ctx.avisos || []).filter((a) => a.tipo === "no_entra");
    if (!n.length) return "De momento ningún profe ha dicho en clase que algo no entre. En cuanto lo diga, te lo marco aquí.";
    return "Esto dijeron los profes que NO entra:\n" + n.map((a) => "- " + a.texto).join("\n");
  }
  if (tiene("entra en el examen", "que entra", "mas cae", "cae mas", "importante")) {
    const n = (ctx.avisos || []).filter((a) => a.tipo === "entra");
    if (!n.length) return "Todavía no tengo avisos del profe sobre lo que entra.";
    return "Esto dijeron los profes que SÍ entra:\n" + n.map((a) => "- " + a.texto).join("\n");
  }
  if (tiene("entrega", "entregable", "plazo", "fecha limite")) {
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

// Cada tipo se reconoce por su emoji, no por el color.
const PLAN_GRUPOS = [
  ["video", "🎬", "vídeo", "vídeos"],
  ["clase", "🎓", "clase", "clases"],
  ["tema", "📖", "tema", "temas"],
  ["test", "✍️", "test", "test"],
  ["repaso", "🔁", "repaso", "repasos"],
  ["cae", "🎯", "lo que más cae", "lo que más cae"],
];
const planGrupo = (sub) => PLAN_GRUPOS.find((g) => g[0] === sub) || ["otros", "📌", "tarea", "tareas"];

// Etiqueta: cuántas veces ha caído esa unidad en exámenes oficiales y test.
function planEtiquetaExamen(t, pesoMap) {
  if (!pesoMap || !t.unidadTexto) return "";
  const veces = pesoMap.get(t.asigId + "|" + t.unidadTexto) || 0;
  if (!veces) return `<div class="pl-marca pl-marca-nada">⚪ No ha caído en los exámenes que tienes cargados, pero está en el temario</div>`;
  if (veces >= 15) return `<div class="pl-marca pl-marca-mucho">🎯 Cae mucho · ${veces} preguntas en exámenes</div>`;
  return `<div class="pl-marca">📌 ${veces} pregunta${veces === 1 ? "" : "s"} en exámenes</div>`;
}

// Lo que dijeron los profes en clase sobre lo que entra y lo que no.
function planCajaProfe(tareas, avisos) {
  if (!avisos || !avisos.length) return "";
  const unidadesHoy = new Set(tareas.filter((t) => t.unidadNum).map((t) => t.asigId + "|" + t.unidadNum));
  const suyos = avisos.filter((a) => unidadesHoy.has(a.asignatura_id + "|" + a.unidad_num));
  if (!suyos.length) return "";
  const orden = { no_entra: 0, entra: 1, ojo: 2 };
  suyos.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  const ico = { no_entra: "⛔", entra: "🎯", ojo: "⚠️" };
  const cab = { no_entra: "No entra", entra: "Entra", ojo: "Ojo" };
  return `<details class="pl-profe" open>
    <summary><b>🎓 Lo que dijo el profe</b> · ${suyos.length}</summary>
    ${suyos.map((a) => `<div class="pl-av"><span class="pl-av-t pl-av-${a.tipo}">${ico[a.tipo]} ${cab[a.tipo]}</span> ${planEsc(a.texto)}<span class="pl-mini"> · ${planEsc(a.fuente || "")}</span></div>`).join("")}
  </details>`;
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
    const [{ data: avisos }, { data: pesos }] = await Promise.all([
      sb.from("avisos_profe").select("asignatura_id, unidad_num, tipo, texto, fuente").in("asignatura_id", PLAN_ASIGNATURAS),
      sb.from("v_peso_unidad").select("asignatura_id, unidad, veces").in("asignatura_id", PLAN_ASIGNATURAS),
    ]);
    const pesoMap = new Map((pesos || []).map((x) => [x.asignatura_id + "|" + x.unidad, x.veces]));
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
    pintar(delHoy.tareas, hechos, dia || [], null, avisos || [], pesoMap);
  }

  async function marcar(clave, hecha) {
    if (hecha) await sb.from("plan_hecho").upsert({ clave }, { onConflict: "auth_user_id,clave" });
    else await sb.from("plan_hecho").delete().eq("clave", clave);
    cargar(false);
  }

  async function pintar(tareas, hechos, dias, filtro, avisos, pesoMap) {
    const hechas = tareas.filter((t) => hechos.has(t.clave));
    const minTot = tareas.reduce((s, t) => s + t.min, 0);
    const minHechos = hechas.reduce((s, t) => s + t.min, 0);
    const pct = tareas.length ? Math.round((hechas.length / tareas.length) * 100) : 0;
    const quedan = tareas.length - hechas.length;
    const { data: fechas } = await sb.from("plan_fechas").select("titulo, fecha, asignatura_id, nota, listo").eq("hecho", false).gte("fecha", new Date().toISOString()).order("fecha").limit(8);
    const cuenta = (tipo) => tareas.filter((t) => t.tipo === tipo).length;
    const histo = dias.filter((d) => d.fecha < hoy).slice(0, 6).map((d) => {
      const h = d.tareas.filter((t) => hechos.has(t.clave)).length;
      return `<div class="pl-fecha">${planEsc(d.fecha)} · ${h} de ${d.tareas.length} hechas</div>`;
    }).join("");
    const pendientes = tareas.filter((t) => !hechos.has(t.clave));
    const ctx = { tareas, hechos, fechas: fechas || [], avisos: avisos || [] };
    const visibles = filtro ? tareas.filter((t) => t.sub === filtro) : tareas;

    const contadores = PLAN_GRUPOS.map(([k, ico, uno, varios]) => {
      const todas = tareas.filter((t) => t.sub === k);
      if (!todas.length) return "";
      const quedan = todas.filter((t) => !hechos.has(t.clave)).length;
      return `<button class="pl-cont ${quedan ? "" : "listo"} ${filtro === k ? "activo" : ""}" data-grupo="${k}">
        <span class="pl-ico">${ico}</span>
        <span class="pl-num">${quedan ? quedan : "✓"}</span>
        <span>${quedan === 1 ? uno : varios}</span></button>`;
    }).join("");

    cont.innerHTML = `
      <div class="pl-contadores">${contadores}</div>

      ${(() => {
        // Lo que ya tiene hecho y solo falta enviar no se enseña hasta 2 días antes:
        // lo entrega a propósito justo antes de que cierre.
        const visiblesF = (fechas || []).filter((f) => {
          const d = Math.ceil((new Date(f.fecha) - new Date()) / 86400000);
          return !f.listo || d <= 2;
        });
        if (!visiblesF.length) return "";
        return `<div class="pl-aviso"><b>📌 Próximas entregas</b>${visiblesF.map((f) => {
          const d = Math.ceil((new Date(f.fecha) - new Date()) / 86400000);
          const txt = d <= 0 ? "hoy" : d === 1 ? "mañana" : "en " + d + " días";
          const marca = f.listo ? "📤 Toca enviarlo · " : "";
          return `<div class="pl-f"><span>${marca}${planEsc(f.titulo)}${f.nota ? `<br><span class="pl-mini">${planEsc(f.nota)}</span>` : ""}</span><span class="pl-dias ${d > 7 ? "lejos" : ""}">${txt}</span></div>`;
        }).join("")}</div>`;
      })()}

      ${planCajaProfe(tareas, avisos)}

      <div class="pl-pregunta">
        <b>🗣️ Pregúntame</b>
        <div class="pl-chips">${PLAN_CHIPS.map((c, i) => `<button class="filtro-btn" data-chip="${i}">${planEsc(c[0])}</button>`).join("")}</div>
        <div class="pl-escribe">
          <input id="pl-q" type="text" placeholder="O escríbelo: ¿qué toca hoy de cálculo?" />
          <button class="btn btn-primario" id="pl-enviar">Preguntar</button>
        </div>
        <div class="pl-respuesta" id="pl-resp" hidden></div>
      </div>

      <div class="pl-resumen">
        <h2>${!pendientes.length && tareas.length ? "Hoy está hecho" : `Hoy te quedan ${pendientes.length} tarea${pendientes.length === 1 ? "" : "s"}`}</h2>
        <p class="pl-mini">${minHechos} de ${minTot} minutos · ${hechas.length} de ${tareas.length} tareas</p>
        <div class="pl-barra"><span style="width:${pct}%"></span></div>
      </div>

      ${pendientes.length ? `<p><a class="btn btn-primario btn-bloque" href="${planEsc(pendientes[0].url)}" ${pendientes[0].externo ? 'target="_blank" rel="noopener"' : ""}>▶ Empezar ahora · ${planGrupo(pendientes[0].sub)[1]} ${planEsc(pendientes[0].titulo)}</a></p>` : ""}

      ${filtro ? `<p><button class="btn btn-secundario" id="pl-todas">Ver todas las tareas de hoy</button></p>` : ""}

      <div id="pl-lista">
      ${visibles.map((t) => {
        const h = hechos.has(t.clave);
        const g = planGrupo(t.sub);
        const i = tareas.indexOf(t);
        return `<div class="pl-tarea ${h ? "hecha" : ""}">
          <button class="pl-chk" data-i="${i}" title="Marcar como hecha">${h ? "✓" : ""}</button>
          <div class="pl-cuerpo">
            <div class="pl-etq">${g[1]} ${g[2]} · ${planEsc(t.asig)} · ${t.min} min</div>
            <div class="pl-tit">${planEsc(t.titulo)}</div>
            ${planEtiquetaExamen(t, pesoMap)}
            <a class="btn btn-secundario" href="${planEsc(t.url)}" ${t.externo ? 'target="_blank" rel="noopener"' : ""}>Abrir</a>
          </div></div>`;
      }).join("") || '<div class="vacio">Hoy no hay tareas.</div>'}
      </div>

      <p class="pl-mini">Lo que no termines pasa solo a mañana. Los repasos salen a los 1, 3, 7 y 30 días de acabar algo.</p>
      <h3 class="pl-h3">Días anteriores</h3>${histo || '<p class="pl-mini">Aún no hay días anteriores.</p>'}
      <p><button class="btn btn-secundario" id="pl-rehacer">Rehacer lo que falta de hoy</button></p>`;

    cont.querySelectorAll("[data-grupo]").forEach((b) =>
      b.addEventListener("click", async () => {
        await pintar(tareas, hechos, dias, b.dataset.grupo === filtro ? null : b.dataset.grupo, avisos, pesoMap);
        document.getElementById("pl-lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
      })
    );
    document.getElementById("pl-todas")?.addEventListener("click", () => pintar(tareas, hechos, dias, null, avisos, pesoMap));

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
