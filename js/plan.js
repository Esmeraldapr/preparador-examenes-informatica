// ============================================================
// Mi plan — plan diario automático (plan.html)
// Tareas: 🎓 clase · 🎬 vídeo del profe · 📖 tema · ✍️ test · 🔁 repaso (curva del olvido) · 📝 simulacro
// ============================================================
const PLAN_EMAIL = "esmeraldaparaiso7@gmail.com";
const PLAN_ASIGNATURAS = [1, 6, 24]; // Cálculo, FFE, Interfaces (Interfaces: 1 de cada 3 días)
const PLAN_INTERFACES = 24;
const PLAN_REPASOS = [1, 3, 7, 14, 30]; // curva del olvido; después, cada 21 días hasta el examen
const PLAN_REPASO_LUEGO = 21;
const PLAN_EXAMEN = "2026-12-12"; // examen de las tres asignaturas
// 6 unidades por asignatura; entra una nueva cada dos semanas (la UD3 empezó el 21-oct).
const PLAN_UNIDADES_FECHAS = [[4, "2026-11-04"], [5, "2026-11-18"], [6, "2026-12-02"]];
/** Días en que toca repasar algo terminado el día `dia`: 1, 3, 7, 14, 30 y luego cada 21 hasta el examen. */
function planDiasRepaso(dia) {
  const ks = [...PLAN_REPASOS];
  let k = PLAN_REPASOS[PLAN_REPASOS.length - 1] + PLAN_REPASO_LUEGO;
  while (planSumarDias(dia, k) <= PLAN_EXAMEN) { ks.push(k); k += PLAN_REPASO_LUEGO; }
  return ks;
}
// Minutos de estudio de cada día: fin de semana 5 h; teletrabajo (lunes, jueves y viernes) 4 h; el resto 3 h.
const PLAN_TELETRABAJO = [1, 4, 5];
// Test de práctica «estudio completo de una función» (examen 91): una función por tarjeta.
const PLAN_ESTUDIO_FUNCION = [
  { fx: "f(x) = 2x/(x² − 4)", ids: "2403,2404,2405,2406,2407" },
  { fx: "f(x) = x²/(x − 1)", ids: "2408,2409,2410,2411,2412" },
  { fx: "f(x) = x·e^(−x)", ids: "2413,2414,2415,2416,2417" },
  { fx: "f(x) = ln(x² + 1)", ids: "2418,2419,2420,2421,2422" },
  { fx: "f(x) = x/(x² + 1)", ids: "2423,2424,2425,2426,2427" },
];
function planMetaMin(f) {
  const d = planDiaSemana(f);
  return [0, 6].includes(d) ? 300 : PLAN_TELETRABAJO.includes(d) ? 240 : 180;
}
function planDiasHasta(desde, hasta) {
  return Math.round((new Date(hasta + "T12:00:00Z") - new Date(desde + "T12:00:00Z")) / 86400000);
}
const PLAN_MIN = { clase: 40, video: 20, tema: 45, test: 15, repaso: 10, cae: 15, simulacro: 45 };
const PLAN_VIDEOS_MAX = 10; // vídeos de ejercicios al día, como mucho
const PLAN_VIDEOS_MIN = { semana: 45, finde: 75 }; // minutos de vídeos de ejercicios al día

function planFechaMadrid(d) {
  return (d || new Date()).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}
function planSumarDias(f, n) {
  const d = new Date(f + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// ⏸ Pausas del plan (fines de semana de trabajos, etc.). Se cargan de la tabla plan_pausa.
// Durante una pausa no sale ninguna tarea nueva; lo que tocaba sale el primer día sin pausa,
// y la curva del olvido se congela (los días en pausa no cuentan), así no se pierde ningún repaso.
let PLAN_PAUSAS = [];
function planEnPausa(f) { return PLAN_PAUSAS.find((p) => f >= p.desde && f <= p.hasta) || null; }
/** Suma n días SIN contar los días en pausa. */
function planSumarDiasActivos(f, n) {
  let d = f, k = 0, vueltas = 0;
  while (k < n && vueltas++ < 2000) { d = planSumarDias(d, 1); if (!planEnPausa(d)) k++; }
  return d;
}
/** Primer día sin pausa a partir de f (incluido). */
function planSiguienteActivo(f) { let d = f, v = 0; while (planEnPausa(d) && v++ < 400) d = planSumarDias(d, 1); return d; }
function planDiaSemana(f) { return new Date(f + "T12:00:00Z").getUTCDay(); } // 0 = domingo
function planDiaDelAnio(f) {
  const d = new Date(f + "T12:00:00Z");
  return Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 0))) / 86400000);
}
const planEsc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Lista ordenada de cosas nuevas de una asignatura (en el orden del curso).
async function planCatalogo(asigId) {
  const [cl, vi, te, as] = await Promise.all([
    sb.from("clases").select("numero, titulo, unidad_num, examen_practica_id").eq("asignatura_id", asigId),
    sb.from("recursos").select("id, titulo, url, unidad, minuto_inicio, orden, tipo, duracion_min, apartado").eq("asignatura_id", asigId).in("origen", ["profe", "recomendado"]).eq("verificado", true),
    sb.from("tema_completo").select("unidad_num, unidad, titulo").eq("asignatura_id", asigId),
    sb.from("asignaturas").select("nombre").eq("id", asigId).single(),
  ]);
  // Partes (apartados «## ») de cada tema y cuándo leyó cada una: para repasar por partes.
  const [{ data: aps }, { data: leidos }] = await Promise.all([
    sb.from("tema_apartados").select("unidad_num, idx, titulo, chars").eq("asignatura_id", asigId),
    sb.from("lectura_apartado").select("unidad_num, idx, leido_en").eq("asignatura_id", asigId),
  ]);
  const { data: ofis } = await sb.from("examenes").select("id, nombre").eq("asignatura_id", asigId).eq("tipo", "oficial").order("id");
  // Prácticas hechas con los ejercicios de las actividades/entregables (p. ej. «los 6 ejercicios de la actividad»).
  const { data: acts } = await sb.from("examenes").select("id, nombre").eq("asignatura_id", asigId).eq("tipo", "practica").or("nombre.ilike.%actividad%,nombre.ilike.%copias%").order("id");
  // Tests de la universidad (no evaluables, evaluables y actividades del campus).
  const { data: tuni } = await sb.from("examenes").select("id, nombre").eq("asignatura_id", asigId).eq("tipo", "cuestionario").order("id");
  // Una unidad está «dada» cuando su temario está cargado (tema_completo).
  const temaMax = Math.max(0, ...((te.data || []).map((t) => t.unidad_num || 0)));
  const udDe = (q) => { const m = /^UD(\d+)/.exec(/^UD\d/.test(q.unidad || "") ? q.unidad : q.unidad_original || ""); return m ? parseInt(m[1], 10) : 999; };
  const idsExamenes = [...(acts || []), ...(tuni || [])].map((e) => e.id);
  const { data: pregs } = idsExamenes.length
    ? await sb.from("preguntas").select("id, examen_id, unidad, unidad_original, orden").in("examen_id", idsExamenes).order("orden")
    : { data: [] };
  const preguntasDe = (exId) => (pregs || []).filter((q) => q.examen_id === exId);
  // 🧮 Preguntas para practicar con la calculadora (solo Cálculo): extremos, recorrido, dominio, límites…
  let calcIds = [];
  if (asigId === 1) {
    const { data: cq } = await sb.from("preguntas").select("id, unidad, unidad_original, examenes!inner(tipo)")
      .eq("asignatura_id", 1).in("examenes.tipo", ["oficial", "cuestionario", "practica"])
      .in("tipo_tarea", ["Extremos y monotonía", "Recorrido de una función", "Rango de una función", "Dominio de una función", "Asíntotas", "Cálculo de límites", "Criterio de la segunda derivada", "Continuidad y discontinuidades", "Teorema de Bolzano", "Propiedades de funciones", "Interpretación de la derivada"])
      .order("id");
    calcIds = (cq || []).filter((q) => udDe(q) <= temaMax).map((q) => q.id);
  }
  const nombre = (as.data?.nombre || "").split(" ")[0];
  const unidades = new Set();
  (cl.data || []).forEach((c) => c.unidad_num && unidades.add(c.unidad_num));
  (te.data || []).forEach((t) => unidades.add(t.unidad_num));
  // Solo las unidades ya dadas (con clase o tema completo). Los vídeos de unidades
  // que aún no han llegado (p. ej. UD4 de Cálculo) no entran en el plan.
  const items = [];
  [...unidades].sort((a, b) => a - b).forEach((u) => {
    (cl.data || []).filter((c) => c.unidad_num === u).forEach((c) =>
      items.push({ clave: `clase:${asigId}:${c.numero}`, tipo: "nuevo", sub: "clase", asig: nombre, asigId, unidadNum: u, titulo: `Clase ${c.numero} del profe: ${c.titulo}`, min: PLAN_MIN.clase, url: `clase.html?asignatura=${asigId}&clase=${c.numero}&claveplan=${encodeURIComponent("clase:" + asigId + ":" + c.numero)}`, repasable: true,
        // Repaso de una clase: lo importante de la clase para ESCUCHAR (sin cuentas, vale para el metro).
        repasoUrl: `clase.html?asignatura=${asigId}&clase=${c.numero}&modo=repaso` }));
    // Cada vídeo es una tarea suelta, con sus minutos reales (duracion_min) si los tenemos.
    const videosUD = (vi.data || []).filter((v) => v.unidad === "UD" + u).sort((a, b) => a.orden - b.orden);
    const meteVideo = (v) =>
      items.push({ clave: `video:${v.id}`, tipo: "nuevo", sub: "video", asig: nombre, asigId, unidadNum: u, deTema: v.tipo !== "ejercicios",
        titulo: v.tipo !== "ejercicios" ? `Vídeo del tema UD${u}${v.apartado ? ` (va con el apartado «${v.apartado}»)` : ""}: ${v.titulo}` : v.titulo, min: v.duracion_min || PLAN_MIN.video, sinDuracion: !v.duracion_min, url: v.url + (v.minuto_inicio && /youtu/.test(v.url) ? (v.url.includes("?") ? "&" : "?") + "t=" + v.minuto_inicio : ""), externo: true });
    // Vídeos de explicación: justo después del tema (son los vídeos de ese tema).
    // Vídeos de ejercicios: después del test, en su carril.
    const t = (te.data || []).find((x) => x.unidad_num === u);
    if (t) {
      items.push({ clave: `tema:${asigId}:UD${u}`, tipo: "nuevo", sub: "tema", asig: nombre, asigId, unidadNum: u, unidadTexto: t.unidad, titulo: `Tema completo UD${u}: ${t.titulo}`, temaTitulo: t.titulo,
        apartados: (aps || []).filter((a) => a.unidad_num === u).sort((a, b) => a.idx - b.idx)
          .map((a) => ({ ...a, leido: ((leidos || []).find((l) => l.unidad_num === u && l.idx === a.idx) || {}).leido_en || null })), min: PLAN_MIN.tema, url: `tema.html?asignatura=${asigId}&tema=UD${u}&claveplan=${encodeURIComponent("tema:" + asigId + ":UD" + u)}`, repasable: true, repasoUrl: `tema.html?asignatura=${asigId}&tema=UD${u}&modo=repaso` });
      videosUD.filter((v) => v.tipo !== "ejercicios").forEach(meteVideo);
      items.push({ clave: `test:${asigId}:UD${u}`, tipo: "test", sub: "test", asig: nombre, asigId, unidadNum: u, unidadTexto: t.unidad, titulo: `Test de la UD${u}`, min: PLAN_MIN.test, url: `quiz.html?asignatura=${asigId}&modo=plan&ud=${u}&n=15&desde=plan&claveplan=${encodeURIComponent("test:" + asigId + ":UD" + u)}`, repasable: true, repasoUrl: `quiz.html?asignatura=${asigId}&modo=plan&ud=${u}&n=10&desde=plan` });
    }
    if (!t) videosUD.filter((v) => v.tipo !== "ejercicios").forEach(meteVideo);
    // Vídeos de ejercicios: carril aparte, unos pocos cada día (ver planGenerar).
    videosUD.filter((v) => v.tipo === "ejercicios").forEach((v) => {
      meteVideo(v);
      items[items.length - 1].carril = "video";
    });
  });
  items.oficiales = ofis || [];
  // Actividades y copias: sus preguntas de unidades ya dadas, en orden, para ir sacando 2 al día.
  items.actividades = acts || [];
  items.preguntasActividad = (acts || []).flatMap((e) => preguntasDe(e.id).filter((q) => udDe(q) <= temaMax).map((q) => ({ id: q.id, examen: e.nombre })));
  // Tests de la universidad que solo tienen unidades ya dadas.
  items.testsUni = (tuni || []).filter((e) => { const q = preguntasDe(e.id); return q.length && q.every((x) => udDe(x) <= temaMax); }).map((e) => ({ ...e, n: preguntasDe(e.id).length }));
  items.calcIds = calcIds;
  items.clasesFuncion = asigId === 1 ? (cl.data || []).filter((c) => c.numero >= 2).sort((a, b) => a.numero - b.numero) : [];
  items.unidadActual = Math.max(0, ...[...unidades]);
  return items;
}

// El repaso lleva su propia clave, para que al terminarlo se marque solo como hecho.
function planUrlRepaso(base, clave) {
  const limpia = base.replace(/&claveplan=[^&]*/g, "").replace(/&desde=plan/g, "");
  return `${limpia}&desde=plan&claveplan=${encodeURIComponent(clave)}`;
}

function planGenerar(hoy, catalogos, hechos, arrastre = []) {
  const finde = [0, 6].includes(planDiaSemana(hoy));
  const tele = PLAN_TELETRABAJO.includes(planDiaSemana(hoy));
  const presupuesto = planMetaMin(hoy);
  const tareas = [];
  let usado = 0;
  // ⏪ Lo que quedó sin hacer el último día va primero: se acumula, no se pierde.
  const baseDe = (c) => c.startsWith("rep:apg:") ? "apg:" + c.split(":").slice(2, 4).join(":") : c.replace(/^rep:/, "").replace(/:\d+$/, "");
  const enArrastre = new Set(arrastre.map((t) => t.clave));
  const basesArrastre = new Set(arrastre.map((t) => baseDe(t.clave)));
  arrastre.forEach((t) => { tareas.push(t); usado += t.min || 0; });
  const faltan = planDiasHasta(hoy, PLAN_EXAMEN);
  // Cuanto más cerca del examen, más tiempo para repasar.
  const parteRepaso = faltan <= 21 ? 0.6 : 0.4;

  // 🆕 Lo primero: lo nuevo de la unidad que se acaba de dar (clase, tema y test de la UD
  // más reciente). Una cosa por asignatura cada día va SIEMPRE, antes que repasos y preguntas.
  const hayInterfaces0 = planDiaDelAnio(hoy) % 3 === 0;
  const garantizadas = new Set();
  PLAN_ASIGNATURAS.filter((a) => a !== PLAN_INTERFACES || hayInterfaces0).forEach((a) => {
    const cat = catalogos[a] || [];
    const sig = cat.find((i) => i.unidadNum === cat.unidadActual && i.carril !== "video" && i.sub !== "video" && !hechos.has(i.clave) && !enArrastre.has(i.clave));
    if (!sig) return;
    garantizadas.add(sig.clave);
    tareas.push({ clave: sig.clave, tipo: sig.tipo, sub: sig.sub, asig: sig.asig, asigId: sig.asigId, unidadNum: sig.unidadNum, unidadTexto: sig.unidadTexto, titulo: `🆕 UD${sig.unidadNum} · ${sig.titulo}`, min: sig.min, url: sig.url, externo: !!sig.externo });
    usado += sig.min;
    // Con el tema van sus vídeos, como tareas sueltas justo debajo.
    if (sig.sub === "tema") {
      cat.filter((v) => v.deTema && v.unidadNum === sig.unidadNum && !hechos.has(v.clave) && !enArrastre.has(v.clave)).forEach((v) => {
        garantizadas.add(v.clave);
        tareas.push({ clave: v.clave, tipo: v.tipo, sub: v.sub, asig: v.asig, asigId: v.asigId, unidadNum: v.unidadNum, titulo: `🆕 ${v.titulo}`, min: v.min, sinDuracion: v.sinDuracion, url: v.url, externo: true });
        usado += v.min;
      });
    }
  });

  // 🔁 Repasos que tocan (el primero sin hacer de cada cosa), como mucho el 40 % del tiempo.
  // 🔁 Curva del olvido (1, 3, 7, 14 y 30 días; luego cada 21).
  //  - Temas: se repasan POR PARTES. Cada apartado cuenta desde el día en que se leyó;
  //    hoy sale solo la parte que toca (o la unidad entera si toca entera).
  //  - Clases: el repaso de la clase.
  //  - Tests de la UD: «✍️ Test de la UDn».
  // De cada cosa sale solo el repaso vencido más reciente; los viejos atrasados se saltan.
  const vencidoDe = (dia, hecho) => {
    const ks = planDiasRepaso(dia);
    const ultimo = Math.max(0, ...ks.filter(hecho));
    const venc = ks.filter((n) => n > ultimo && planSumarDiasActivos(dia, n) <= hoy);
    return venc.length ? venc[venc.length - 1] : 0;
  };
  const repasos = [];
  Object.values(catalogos).flat().filter((i) => i.repasable).forEach((i) => {
    const h = hechos.get(i.clave);
    // Si su repaso viene arrastrado de otro día, no se le pone otro encima.
    if (basesArrastre.has(i.sub === "tema" ? `apg:${i.asigId}:UD${i.unidadNum}` : i.clave)) return;
    if (i.sub === "tema" && (i.apartados || []).length) {
      const toca = [];
      i.apartados.forEach((a) => {
        const base = a.leido || h;
        if (!base) return;
        const dia = planFechaMadrid(new Date(base));
        const k = vencidoDe(dia, (n) => hechos.has(`rep:ap:${i.asigId}:UD${i.unidadNum}:${a.idx}:${n}`) || (!a.leido && hechos.has(`rep:${i.clave}:${n}`)));
        if (k) toca.push({ a, k, vence: planSumarDiasActivos(dia, k) });
      });
      if (!toca.length) return;
      // Como mucho unos 25 minutos de lectura al día por unidad; lo demás sigue pendiente para mañana.
      const hoyAps = [];
      let car = 0;
      for (const x of toca) {
        if (hoyAps.length && car + x.a.chars > 25 * 900) break;
        hoyAps.push(x); car += x.a.chars;
      }
      const entera = hoyAps.length === i.apartados.length;
      const nombres = hoyAps.map((x) => `«${x.a.titulo}»`);
      const parte = entera ? " (entera)" : `: ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? ` y ${nombres.length - 3} apartado${nombres.length - 3 > 1 ? "s" : ""} más` : ""}`;
      const clave = `rep:apg:${i.asigId}:UD${i.unidadNum}:${hoy}`;
      repasos.push({
        vence: hoyAps.map((x) => x.vence).sort()[0],
        tarea: { clave, tipo: "repaso", sub: "repaso", asig: i.asig, asigId: i.asigId, unidadNum: i.unidadNum,
          titulo: `Repaso UD${i.unidadNum} ${i.temaTitulo}${parte}`,
          min: Math.max(5, Math.round(car / 900)),
          url: `tema.html?asignatura=${i.asigId}&tema=UD${i.unidadNum}&modo=repaso&aps=${hoyAps.map((x) => x.a.idx + ":" + x.k).join(",")}&desde=plan&claveplan=${encodeURIComponent(clave)}` },
      });
      return;
    }
    if (!h) return;
    const dia = planFechaMadrid(new Date(h));
    const k = vencidoDe(dia, (n) => hechos.has(`rep:${i.clave}:${n}`));
    if (!k) return;
    const esTest = i.sub === "test";
    const clave = `rep:${i.clave}:${k}`;
    repasos.push({
      vence: planSumarDiasActivos(dia, k),
      tarea: { clave, tipo: "repaso", sub: esTest ? "test" : "repaso", asig: i.asig, asigId: i.asigId, unidadNum: i.unidadNum,
        titulo: esTest ? `Test de la UD${i.unidadNum}` : `Repaso UD${i.unidadNum} · ${i.titulo.replace(/^Clase (\d+) del profe: /, "Clase $1: ")}`,
        min: esTest ? 12 : 20, url: planUrlRepaso(i.repasoUrl || i.url, clave) },
    });
  });
  repasos.sort((a, b) => a.vence.localeCompare(b.vence));
  // Si hay repasos atrasados (vencidos hace más de 2 días), se cuela algo más para ponerse al día,
  // sin pasarse: 30 min más un día normal, 60 min en teletrabajo y fin de semana.
  const atrasados = repasos.filter((r) => planDiasHasta(r.vence, hoy) > 2).reduce((m, r) => m + r.tarea.min, 0);
  const extraAtraso = Math.min(atrasados, finde || tele ? 60 : 30);
  for (const r of repasos) {
    // Como mucho su parte del día; pero si lo nuevo ya ocupa mucho, al menos 2 repasos.
    const nRep = tareas.filter((t) => t.tipo === "repaso").length;
    if (usado + r.tarea.min > presupuesto * parteRepaso + (garantizadas.size ? 60 : 0) + extraAtraso && nRep >= 2) break;
    if (nRep >= 2 && usado + r.tarea.min > presupuesto + extraAtraso) break;
    tareas.push(r.tarea);
    usado += r.tarea.min;
  }

  // 📝 Preguntas de examen (oficiales y tests de la universidad): todos los días, de cada asignatura.
  // Repetición espaciada por pregunta: primero las que tocan repasar, luego las nunca vistas.
  const hayInterfaces = planDiaDelAnio(hoy) % 3 === 0;
  const activas = PLAN_ASIGNATURAS.filter((a) => a !== PLAN_INTERFACES || hayInterfaces);
  PLAN_ASIGNATURAS.forEach((a) => {
    const nombreA = (catalogos[a] || [])[0]?.asig || "";
    if (!nombreA) return;
    const n = a === PLAN_INTERFACES ? 12 : 20;
    const clave = `exa:${a}:${hoy}`;
    tareas.push({
      clave, tipo: "test", sub: "examen", asig: nombreA, asigId: a,
      titulo: `${n} preguntas de examen de ${nombreA}: primero las que te tocan repasar, luego las que nunca has visto`,
      min: Math.round(n * 1.2),
      url: `quiz.html?asignatura=${a}&modo=pexamen&n=${n}&desde=plan&claveplan=${encodeURIComponent(clave)}`,
    });
    usado += Math.round(n * 1.2);
    // 🧪 2 cuestiones nuevas de los ejercicios de las actividades y de las copias con otros números.
    // Son preguntas FIJAS: si un día no se hacen, pasan al siguiente tal cual, y además salen 2 nuevas.
    const pa = (catalogos[a] || {}).preguntasActividad || [];
    const yaArrastradas = new Set(arrastre.filter((t) => /^act:/.test(t.clave)).flatMap((t) => t.ids || []));
    const libres = pa.filter((q) => !yaArrastradas.has(q.id));
    if (libres.length) {
      const desde = (planDiaDelAnio(hoy) * 2) % libres.length;
      const dos = [libres[desde], libres[(desde + 1) % libres.length]].filter((q, i, l) => l.findIndex((x) => x.id === q.id) === i);
      const claveA = `act:${a}:${hoy}`;
      const tit = `2 cuestiones de práctica (${dos[0].examen.replace(/^Práctica de (la )?/, "").replace(/ \(preguntas creadas, no oficiales\)/, "")})`;
      tareas.push({
        clave: claveA, tipo: "test", sub: "practica", asig: nombreA, asigId: a, ids: dos.map((q) => q.id),
        titulo: tit, min: 6,
        url: `quiz.html?asignatura=${a}&modo=ids&ids=${dos.map((q) => q.id).join(",")}&titulo=${encodeURIComponent("🧪 " + tit)}&desde=plan&claveplan=${encodeURIComponent(claveA)}`,
      });
      usado += 6;
    }
  });

  // 🎓 Un test de la universidad entero cada día (rotando asignatura y test): son los que mejor
  // enseñan cómo pregunta el examen. Solo de unidades ya dadas.
  {
    const conTests = activas.filter((a) => ((catalogos[a] || {}).testsUni || []).length);
    if (conTests.length && !arrastre.some((t) => /^tuni:/.test(t.clave))) {
      const a = conTests[planDiaDelAnio(hoy) % conTests.length];
      const lista = catalogos[a].testsUni;
      const ex = lista[Math.floor(planDiaDelAnio(hoy) / conTests.length) % lista.length];
      const clave = `tuni:${a}:${ex.id}:${hoy}`;
      tareas.push({ clave, tipo: "test", sub: "test", asig: catalogos[a][0]?.asig || "", asigId: a,
        titulo: `Test de la universidad entero: ${ex.nombre}`, min: Math.max(8, Math.round(ex.n * 1.2)),
        url: `quiz.html?asignatura=${a}&modo=examen&examen_id=${ex.id}&desde=plan&claveplan=${encodeURIComponent(clave)}` });
      usado += Math.max(8, Math.round(ex.n * 1.2));
    }
  }

  // 🧮 Calculadora: 3 preguntas de Cálculo para resolver con la calculadora (con la guía impresa).
  {
    const ids = (catalogos[1] || {}).calcIds || [];
    if (ids.length && !arrastre.some((t) => /^calc:/.test(t.clave))) {
      const desde = (planDiaDelAnio(hoy) * 3) % ids.length;
      const tres = [0, 1, 2].map((k) => ids[(desde + k) % ids.length]).filter((x, i, l) => l.indexOf(x) === i);
      const clave = `calc:${hoy}`;
      const tit = "Con la calculadora: 3 preguntas de Cálculo (usa la guía impresa)";
      tareas.push({ clave, tipo: "test", sub: "calc", asig: catalogos[1][0]?.asig || "Cálculo", asigId: 1, ids: tres, titulo: tit, min: 15,
        url: `quiz.html?asignatura=1&modo=ids&ids=${tres.join(",")}&titulo=${encodeURIComponent("🧮 " + tit)}&desde=plan&claveplan=${encodeURIComponent(clave)}` });
      usado += 15;
    }
  }

  // ✏️ Fines de semana: una función entera como las del profe de Cálculo en clase, con papel y calculadora.
  if (finde && !arrastre.some((t) => /^func:/.test(t.clave))) {
    const cls = (catalogos[1] || {}).clasesFuncion || [];
    if (cls.length) {
      const c = cls[Math.floor(planDiaDelAnio(hoy) / 7) % cls.length];
      const clave = `func:${hoy}`;
      tareas.push({ clave, tipo: "test", sub: "calc", asig: catalogos[1][0]?.asig || "Cálculo", asigId: 1,
        titulo: `Estudio completo como en clase: rehaz tú sola el ejercicio de la Clase ${c.numero} (${c.titulo}) con papel y calculadora, y luego compara`,
        min: 45, url: `clase.html?asignatura=1&clase=${c.numero}&claveplan=${encodeURIComponent(clave)}` });
      usado += 45;
    }
  }
  // 📈 Fines de semana: una función del test «estudio completo de una función» (examen 91), 5 preguntas como en el examen.
  if (finde && !arrastre.some((t) => /^estf:/.test(t.clave))) {
    const f = PLAN_ESTUDIO_FUNCION[planDiaDelAnio(hoy) % PLAN_ESTUDIO_FUNCION.length];
    const clave = `estf:${hoy}`;
    tareas.push({ clave, tipo: "test", sub: "calc", asig: "Cálculo", asigId: 1,
      titulo: `Una función con 5 preguntas, como en el examen: ${f.fx}`,
      min: 20,
      url: `quiz.html?asignatura=1&modo=ids&ids=${f.ids}&titulo=${encodeURIComponent("📈 Estudio de " + f.fx)}&desde=plan&claveplan=${encodeURIComponent(clave)}` });
    usado += 20;
  }
  // 🏁 Simulacro de examen oficial completo: los sábados; en las 3 últimas semanas, todos los días.
  if (faltan >= 0 && (planDiaSemana(hoy) === 6 || faltan <= 21)) {
    const asigSim = activas[(planDiaDelAnio(hoy) + 1) % activas.length];
    const ofis = (catalogos[asigSim] || {}).oficiales || [];
    const nombreSim = (catalogos[asigSim] || [])[0]?.asig || "";
    if (ofis.length && nombreSim) {
      const ex = ofis[Math.floor(planDiaDelAnio(hoy) / 7) % ofis.length];
      const clave = `sim:${asigSim}:${hoy}`;
      tareas.push({
        clave, tipo: "test", sub: "simulacro", asig: nombreSim, asigId: asigSim,
        titulo: `Simulacro: ${ex.nombre}, solo con las unidades ya dadas`, min: PLAN_MIN.simulacro,
        url: `quiz.html?asignatura=${asigSim}&modo=examen&examen_id=${ex.id}&dadas=1&desde=plan&claveplan=${encodeURIComponent(clave)}`,
      });
      usado += PLAN_MIN.simulacro;
    }
  }

  // 🎬 Vídeos de ejercicios: unos pocos cada día (como mucho PLAN_VIDEOS_MAX y
  // PLAN_VIDEOS_MIN minutos), solo de unidades ya empezadas (tema o test hechos),
  // en orden y repartidos entre asignaturas.
  const unidadAbierta = (i) => hechos.has(`tema:${i.asigId}:UD${i.unidadNum}`) || hechos.has(`test:${i.asigId}:UD${i.unidadNum}`);
  const colasVideo = activas.map((a) => (catalogos[a] || []).filter((i) => i.carril === "video" && !hechos.has(i.clave) && unidadAbierta(i)));
  const topeVideo = finde ? PLAN_VIDEOS_MIN.finde : PLAN_VIDEOS_MIN.semana;
  const tareasVideo = []; // se apartan ahora (reservan tiempo) y se ponen al final de la lista
  let minVideo = 0, nVideo = 0, sigueVideo = true;
  while (sigueVideo && nVideo < PLAN_VIDEOS_MAX) {
    sigueVideo = false;
    for (const cola of colasVideo) {
      const v = cola[0];
      if (!v || nVideo >= PLAN_VIDEOS_MAX || minVideo + v.min > topeVideo) continue;
      cola.shift();
      tareasVideo.push({ clave: v.clave, tipo: v.tipo, sub: v.sub, asig: v.asig, asigId: v.asigId, unidadNum: v.unidadNum, titulo: v.titulo, min: v.min, sinDuracion: v.sinDuracion, url: v.url, externo: true });
      minVideo += v.min; nVideo++; usado += v.min; sigueVideo = true;
    }
  }

  // 📖✍️ Lo nuevo, mezclando asignaturas (Interfaces solo 1 de cada 3 días).
  // Lo de la unidad que se está dando ahora en clase va intercalado con lo atrasado,
  // para no quedarse atrás con lo nuevo mientras se recupera lo anterior.
  const intercalar = (lista, actual) => {
    const nuevo = lista.filter((i) => i.unidadNum === actual);
    const atras = lista.filter((i) => i.unidadNum !== actual);
    const res = [];
    while (nuevo.length || atras.length) {
      if (nuevo.length) res.push(nuevo.shift());
      if (atras.length) res.push(atras.shift());
    }
    return res;
  };
  const colas = activas.map((a) => ({
    id: a,
    pend: intercalar((catalogos[a] || []).filter((i) => !hechos.has(i.clave) && !garantizadas.has(i.clave) && !enArrastre.has(i.clave) && i.carril !== "video"), (catalogos[a] || {}).unidadActual),
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
      tareas.push({ clave: sig.clave, tipo: sig.tipo, sub: sig.sub, asig: sig.asig, asigId: sig.asigId, unidadNum: sig.unidadNum, unidadTexto: sig.unidadTexto, titulo: sig.titulo, min: sig.min, sinDuracion: sig.sinDuracion, url: sig.url, externo: !!sig.externo });
      usado += sig.min; c.gastado += sig.min; avanzo = true;
    }
  }
  const vistas = new Set();
  return tareas.concat(tareasVideo).filter((t) => !vistas.has(t.clave) && vistas.add(t.clave));
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
    if (!r.length) return "Hoy no te toca ningún repaso. Los repasos salen a los 1, 3, 7, 14 y 30 días de acabar algo, y luego cada 3 semanas hasta el examen.";
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
  ["examen", "📝", "preguntas de examen", "preguntas de examen"],
  ["practica", "🧪", "práctica", "prácticas"],
  ["calc", "🧮", "calculadora", "calculadora"],
  ["simulacro", "🏁", "simulacro", "simulacros"],
  ["trabajo", "💼", "trabajo", "trabajos"],
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
    <summary><b>🎓 Lo que dijo el profe</b> · ${suyos.length} <button type="button" class="btn btn-secundario pl-profe-oir" style="margin-left:10px;padding:2px 10px;font-size:0.85rem">🔊 Escuchar</button></summary>
    <div class="pl-profe-texto parrafo-leible">
    ${suyos.map((a) => `<div class="pl-av"><span class="pl-av-t pl-av-${a.tipo}">${ico[a.tipo]} ${cab[a.tipo]}</span> ${planEsc(a.texto)}<span class="pl-mini"> · ${planEsc(a.fuente || "")}</span></div>`).join("")}
    </div>
  </details>`;
}

const PLAN_CHIPS = [
  ["¿Qué toca hoy?", "que toca hoy"],
  ["¿Cuánto me queda?", "cuanto me queda"],
  ["¿Qué repaso hoy?", "repaso"],
  ["¿Qué entrego pronto?", "entrega"],
  ["¿Por dónde empiezo?", "primero"],
];

/** 4500 s -> «1 h 15 min». */
function planTiempoTxt(seg) {
  const m = Math.floor((seg || 0) / 60);
  const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
}

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

  // Al volver de una tarea que se abrió fuera (vídeo de YouTube), se suma el tiempo que
  // estuviste fuera, como mucho lo que dura esa tarea.
  async function sumarTiempoExterno() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem("plan_externo") || "null"); localStorage.removeItem("plan_externo"); } catch (e) { o = null; }
    if (!o || !o.desde) return false;
    const seg = Math.min((Date.now() - o.desde) / 1000, o.max || 0);
    if (seg < 30) return false;
    cronoSumar(seg);
    await cronoEnviar();
    return true;
  }
  await sumarTiempoExterno();
  await cronoEnviar();
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && (await sumarTiempoExterno())) cargar(false);
  });

  async function cargar(regenerar) {
    const [{ data: hh }, { data: dia }] = await Promise.all([
      sb.from("plan_hecho").select("clave, hecho_en"),
      sb.from("plan_dia").select("fecha, tareas").order("fecha", { ascending: false }).limit(30),
    ]);
    const { data: pausas } = await sb.from("plan_pausa").select("desde, hasta, motivo");
    PLAN_PAUSAS = pausas || [];
    const hechos = new Map((hh || []).map((x) => [x.clave, x.hecho_en]));
    const [{ data: avisos }, { data: pesos }] = await Promise.all([
      sb.from("avisos_profe").select("asignatura_id, unidad_num, tipo, texto, fuente").in("asignatura_id", PLAN_ASIGNATURAS),
      sb.from("v_peso_unidad").select("asignatura_id, unidad, veces").in("asignatura_id", PLAN_ASIGNATURAS),
    ]);
    const pesoMap = new Map((pesos || []).map((x) => [x.asignatura_id + "|" + x.unidad, x.veces]));
    let delHoy = (dia || []).find((d) => d.fecha === hoy);
    // ⏸ Día en pausa: solo se ven los trabajos apuntados. No se genera nada nuevo; lo que
    // tocaba hoy (si ya estaba generado) se queda guardado y pasa al primer día sin pausa.
    const pausa = planEnPausa(hoy);
    if (pausa) {
      pintar((delHoy?.tareas || []).filter((t) => t.sub === "trabajo"), hechos, dia || [], null, avisos || [], pesoMap, pausa);
      return;
    }
    if (!delHoy || regenerar) {
      const catalogos = {};
      await Promise.all(PLAN_ASIGNATURAS.map(async (a) => (catalogos[a] = await planCatalogo(a))));
      // Lo de hoy que ya está hecho se conserva; se vuelve a generar solo lo pendiente.
      const previas = regenerar && delHoy ? delHoy.tareas.filter((t) => hechos.has(t.clave)) : [];
      const hechosSinHoy = new Map([...hechos].filter(([k]) => !previas.some((p) => p.clave === k)));
      // Lo que quedó sin hacer el último día con plan se suma a hoy (menos las preguntas de examen
      // del día, el simulacro y «lo que más cae», que ya vuelven solas con su propio repaso).
      // (Se salta los días en que solo se apuntaron trabajos durante una pausa.)
      const anterior = (dia || []).find((d) => d.fecha < hoy && d.tareas.some((t) => t.sub !== "trabajo"));
      const arrastre = anterior
        ? anterior.tareas.filter((t) => !hechos.has(t.clave) && !/^(exa|sim|cae|trab):/.test(t.clave)).map((t) => ({ ...t, arrastrada: true }))
        : [];
      const nuevas = planGenerar(hoy, catalogos, hechosSinHoy, arrastre).filter((t) => !previas.some((p) => p.clave === t.clave));
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

  async function pintar(tareas, hechos, dias, filtro, avisos, pesoMap, pausa = null) {
    const hechas = tareas.filter((t) => hechos.has(t.clave));
    const minTot = tareas.reduce((s, t) => s + t.min, 0);
    const minHechos = hechas.reduce((s, t) => s + t.min, 0);
    const pct = tareas.length ? Math.round((hechas.length / tareas.length) * 100) : 0;
    const quedan = tareas.length - hechas.length;
    const { data: tiempos } = await sb.from("plan_tiempo").select("fecha, segundos").order("fecha", { ascending: false }).limit(15);
    const tiempoDe = new Map((tiempos || []).map((x) => [x.fecha, x.segundos]));
    const segHoy = (tiempoDe.get(hoy) || 0) + cronoPendiente();
    const metaMin = planMetaMin(hoy);
    const pctTiempo = Math.min(100, Math.round((segHoy / 60 / metaMin) * 100));
    const faltaSeg = Math.max(0, metaMin * 60 - segHoy);
    const { data: fechas } = await sb.from("plan_fechas").select("titulo, fecha, asignatura_id, nota, listo").eq("hecho", false).gte("fecha", new Date().toISOString()).order("fecha").limit(8);
    const cuenta = (tipo) => tareas.filter((t) => t.tipo === tipo).length;
    const histo = dias.filter((d) => d.fecha < hoy).slice(0, 6).map((d) => {
      const h = d.tareas.filter((t) => hechos.has(t.clave)).length;
      const s = tiempoDe.get(d.fecha);
      const meta = planMetaMin(d.fecha) * 60;
      const extra = s && s > meta + 59 ? ` (+${planTiempoTxt(s - meta)})` : "";
      if (planEnPausa(d.fecha)) {
        const tr = d.tareas.filter((t) => t.sub === "trabajo" || hechos.has(t.clave));
        return `<div class="pl-fecha">${planEsc(d.fecha)} · ⏸ pausa por trabajos${tr.length ? ` · ${tr.length} hecho${tr.length === 1 ? "" : "s"}` : ""}${s ? ` · ⏱ ${planTiempoTxt(s)}` : ""}</div>`;
      }
      return `<div class="pl-fecha">${planEsc(d.fecha)} · ${h} de ${d.tareas.length} hechas${s ? ` · ⏱ ${planTiempoTxt(s)}${extra}` : ""}</div>`;
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

      ${pausa ? (() => {
        const fTxt = (f) => new Date(f + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
        const vuelta = planSiguienteActivo(planSumarDias(pausa.hasta, 1));
        return `<div class="pl-aviso" style="text-align:center;font-size:1.05rem"><b>⏸ Plan en pausa hasta el ${planEsc(fTxt(pausa.hasta))}</b>
          <br>Los trabajos van primero.
          <br>Lo que tocaba estos días sale el <b>${planEsc(fTxt(vuelta))}</b>.
          <br>Los repasos se congelan: no se pierde ninguno.</div>`;
      })() : ""}

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


      <div class="pl-pregunta">
        <b>🗣️ Pregúntame</b>
        <div class="pl-chips">${PLAN_CHIPS.map((c, i) => `<button class="filtro-btn" data-chip="${i}">${planEsc(c[0])}</button>`).join("")}</div>
        <div class="pl-escribe">
          <input id="pl-q" type="text" placeholder="O escríbelo: ¿qué toca hoy de cálculo?" />
          <button class="btn btn-primario" id="pl-enviar">Preguntar</button>
        </div>
        <div class="pl-respuesta" id="pl-resp" hidden></div>
      </div>

      <div class="pl-aviso" style="text-align:center"><b>📅 Faltan ${Math.max(0, planDiasHasta(hoy, PLAN_EXAMEN))} días para el examen</b> (12 de diciembre)
        ${(() => {
          const sig = PLAN_UNIDADES_FECHAS.find(([, f]) => f >= hoy);
          if (!sig) return `<br><span class="pl-mini">Ya están las 6 unidades: ahora toca repasar y hacer simulacros.</span>`;
          const d = planDiasHasta(hoy, sig[1]);
          const fecha = new Date(sig[1] + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long" });
          const atras = tareas.filter((t) => !hechos.has(t.clave) && t.unidadNum && t.unidadNum < sig[0] - 1).length;
          return `<br><span class="pl-mini">Próxima unidad nueva: UD${sig[0]}, hacia el ${fecha} (${d === 0 ? "hoy" : d === 1 ? "mañana" : "en " + d + " días"}). Lo ideal es llegar con todo lo anterior hecho.${atras ? ` Hoy tienes ${atras} tarea${atras === 1 ? "" : "s"} de unidades anteriores.` : ""}</span>`;
        })()}
      </div>

      <div class="pl-resumen">
        <h2>${pausa ? "Hoy solo trabajos 💼" : !pendientes.length && tareas.length ? "Hoy está hecho" : `Hoy te quedan ${pendientes.length} tarea${pendientes.length === 1 ? "" : "s"}`}</h2>
        <p class="pl-mini">${minHechos} de ${minTot} minutos · ${hechas.length} de ${tareas.length} tareas</p>
        <div class="pl-barra"><span style="width:${pct}%"></span></div>
        ${pausa ? `<p style="margin:12px 0 4px;font-size:1.05rem">⏱ Hoy llevas <b>${planTiempoTxt(segHoy)}</b> con los trabajos.</p>` : `<p style="margin:12px 0 4px;font-size:1.05rem">⏱ Hoy llevas <b>${planTiempoTxt(segHoy)}</b> de ${metaMin / 60} h${faltaSeg ? ` · te falta${faltaSeg >= 7200 ? "n" : ""} ${planTiempoTxt(faltaSeg)}` : ` · ✅ ¡cumplido!${segHoy - metaMin * 60 >= 60 ? ` Te has pasado ${planTiempoTxt(segHoy - metaMin * 60)} 💪` : ""}`}</p>
        <div class="pl-barra"><span style="width:${pctTiempo}%;background:#16a34a"></span></div>`}
        <p class="pl-mini">El tiempo cuenta solo cuando abres una tarea desde aquí y estás con ella (si pasas 5 minutos sin tocar nada, se para).</p>
      </div>

      ${pendientes.length ? `<p><a class="btn btn-primario btn-bloque" href="${planEsc(pendientes[0].url)}" data-min="${pendientes[0].sinDuracion ? 120 : pendientes[0].min}" ${pendientes[0].externo ? 'data-ext="1" target="_blank" rel="noopener"' : ""}>▶ Empezar ahora · ${planGrupo(pendientes[0].sub)[1]} ${planEsc(pendientes[0].titulo)}</a></p>` : ""}

      ${filtro ? `<p><button class="btn btn-secundario" id="pl-todas">Ver todas las tareas de hoy</button></p>` : ""}

      <div id="pl-lista">
      ${visibles.map((t) => {
        const h = hechos.has(t.clave);
        const g = planGrupo(t.sub);
        const i = tareas.indexOf(t);
        return `<div class="pl-tarea ${h ? "hecha" : ""}">
          <button class="pl-chk" data-i="${i}" title="Marcar como hecha">${h ? "✓" : ""}</button>
          <div class="pl-cuerpo">
            <div class="pl-etq">${g[1]} ${g[2]} · ${planEsc(t.asig)} · ${t.sinDuracion ? "duración sin medir (cuenta el tiempo real)" : t.min + " min"}${t.arrastrada ? " · ⏪ pendiente de otro día" : ""}</div>
            <div class="pl-tit">${planEsc(t.titulo)}</div>
            ${planEtiquetaExamen(t, pesoMap)}
            <a class="btn btn-secundario" href="${planEsc(t.url)}" data-min="${t.sinDuracion ? 120 : t.min}" ${t.externo ? 'data-ext="1" target="_blank" rel="noopener"' : ""}>Abrir</a>
          </div></div>`;
      }).join("") || (pausa ? '<div class="vacio">Hoy no hay tareas del plan. Lo que hagas de los trabajos, díselo a Claude y lo apunta aquí.</div>' : '<div class="vacio">Hoy no hay tareas.</div>')}
      </div>

      <p class="pl-mini">Lo que no termines pasa solo a mañana. Los repasos siguen la curva del olvido: salen a los 1, 3, 7, 14 y 30 días de acabar algo, y después cada 3 semanas hasta el examen. Los sábados hay simulacro de examen, y en las 3 últimas semanas, todos los días.</p>
      <h3 class="pl-h3">Días anteriores</h3>${histo || '<p class="pl-mini">Aún no hay días anteriores.</p>'}
      <p><a class="btn btn-secundario" href="historial.html">📆 Ver historial completo</a></p>
      ${pausa ? "" : `<p><button class="btn btn-secundario" id="pl-rehacer">Rehacer lo que falta de hoy</button></p>`}`;

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
    document.getElementById("pl-rehacer")?.addEventListener("click", () => cargar(true));

    // Abrir una tarea pone en marcha el cronómetro de hoy.
    cont.querySelectorAll("a[data-min]").forEach((a) =>
      a.addEventListener("click", () => {
        cronoActivar();
        if (a.dataset.ext === "1") {
          try { localStorage.setItem("plan_externo", JSON.stringify({ desde: Date.now(), max: (+a.dataset.min || 20) * 60 })); } catch (e) { /* sin almacenamiento */ }
        }
      })
    );

    const btnProfeOir = document.querySelector(".pl-profe-oir");
    if (btnProfeOir) {
      btnProfeOir.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        leerTexto("Lo que dijo el profe.", [document.querySelector(".pl-profe-texto")], ev.currentTarget);
      });
    }

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
