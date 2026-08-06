// ============================================================
// Lógica del Dashboard de una asignatura (asignatura.html)
// ============================================================

let ASIGNATURA_ID = null;

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre, curso").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) {
    document.querySelector(".contenedor").innerHTML = `<div class="vacio"><div class="icono">⚠️</div>Esta asignatura no existe.<br/><br/><a class="btn btn-primario" href="index.html">Volver a asignaturas</a></div>`;
    return;
  }

  pintarNavbar("asignatura.html", usuario, asignatura);
  document.getElementById("titulo-asignatura").textContent = asignatura.nombre;
  document.getElementById("subtitulo-asignatura").textContent = `${asignatura.curso} · Ingeniería Informática`;
  document.title = `${asignatura.nombre} · Preparador`;

  const [{ data: intentos }, { data: favoritos }, { count: totalPreguntas }, { count: totalExamenes }, { count: totalTrucos }] =
    await Promise.all([
      sb.from("intentos").select("id, pregunta_id, acierto, fecha").eq("usuario_id", usuario.id).order("fecha", { ascending: true }),
      sb.from("favoritos").select("id").eq("usuario_id", usuario.id),
      sb.from("preguntas").select("id", { count: "exact", head: true }).eq("asignatura_id", ASIGNATURA_ID),
      sb.from("examenes").select("id", { count: "exact", head: true }).eq("asignatura_id", ASIGNATURA_ID),
      sb.from("trucos").select("id", { count: "exact", head: true }).eq("asignatura_id", ASIGNATURA_ID),
    ]);

  const { data: preguntasAsignatura } = await sb.from("preguntas").select("id").eq("asignatura_id", ASIGNATURA_ID);
  const idsPreguntas = new Set((preguntasAsignatura || []).map((p) => p.id));
  const intentosAsignatura = (intentos || []).filter((i) => idsPreguntas.has(i.pregunta_id));

  if (!totalPreguntas) {
    document.getElementById("zona-vacia").style.display = "block";
  }

  pintarStats(intentosAsignatura, favoritos || [], totalPreguntas || 0);
  pintarCalendario(intentosAsignatura);
  pintarEvolucion(intentosAsignatura);
  pintarAccesos(totalExamenes || 0, totalTrucos || 0);

  document.getElementById("btn-reiniciar").addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres borrar TODO tu seguimiento de esta asignatura (aciertos, fallos y estadísticas)? Esto no se puede deshacer. Tus favoritos no se tocan.")) return;
    const idsArr = [...idsPreguntas];
    const { error } = await sb.from("intentos").delete().eq("usuario_id", usuario.id).in("pregunta_id", idsArr);
    if (error) {
      alert("No se pudo reiniciar: " + error.message);
      return;
    }
    location.reload();
  });
})();

function pintarStats(intentos, favoritos, totalPreguntas) {
  const total = intentos.length;
  const aciertos = intentos.filter((i) => i.acierto).length;
  const pctGlobal = total ? Math.round((aciertos / total) * 100) : 0;

  const ultimoPorPregunta = new Map();
  for (const i of intentos) ultimoPorPregunta.set(i.pregunta_id, i.acierto);
  const fallosVigentes = [...ultimoPorPregunta.values()].filter((v) => v === false).length;

  const dias = new Set(intentos.map((i) => claveDia(i.fecha)));
  let racha = 0;
  let cursor = new Date();
  if (!dias.has(claveDia(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (dias.has(claveDia(cursor.toISOString()))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const ahora = Date.now();
  const DIA = 86400000;
  const ult7 = intentos.filter((i) => ahora - new Date(i.fecha).getTime() <= 7 * DIA);
  const prev7 = intentos.filter((i) => {
    const t = ahora - new Date(i.fecha).getTime();
    return t > 7 * DIA && t <= 14 * DIA;
  });
  const pct = (arr) => (arr.length ? (arr.filter((i) => i.acierto).length / arr.length) * 100 : null);
  const pctUlt = pct(ult7);
  const pctPrev = pct(prev7);
  let tendenciaHtml = `<span class="tendencia neutra">Sin datos suficientes aún</span>`;
  if (pctUlt !== null && pctPrev !== null) {
    const diff = Math.round(pctUlt - pctPrev);
    if (diff > 0) tendenciaHtml = `<span class="tendencia subida">▲ +${diff}% vs semana anterior</span>`;
    else if (diff < 0) tendenciaHtml = `<span class="tendencia bajada">▼ ${diff}% vs semana anterior</span>`;
    else tendenciaHtml = `<span class="tendencia neutra">= igual que la semana anterior</span>`;
  } else if (pctUlt !== null) {
    tendenciaHtml = `<span class="tendencia neutra">Primera semana de datos</span>`;
  }

  document.getElementById("stats").innerHTML = `
    <div class="stat" style="--barra:var(--grad-1)">
      <div class="valor">${total}</div>
      <div class="etiqueta">Preguntas respondidas</div>
    </div>
    <div class="stat" style="--barra:var(--grad-3)">
      <div class="valor">${pctGlobal}%</div>
      <div class="etiqueta">Acierto global</div>
      ${tendenciaHtml}
    </div>
    <div class="stat" style="--barra:var(--grad-2)">
      <div class="valor">${fallosVigentes}</div>
      <div class="etiqueta">Preguntas falladas por repasar</div>
    </div>
    <div class="stat" style="--barra:var(--grad-4)">
      <div class="valor">${racha}🔥</div>
      <div class="etiqueta">Días seguidos estudiando</div>
    </div>
    <div class="stat" style="--barra:var(--grad-1)">
      <div class="valor">${favoritos.length}⭐</div>
      <div class="etiqueta">Preguntas favoritas</div>
    </div>
    <div class="stat" style="--barra:var(--grad-3)">
      <div class="valor">${totalPreguntas}</div>
      <div class="etiqueta">Preguntas en el banco</div>
    </div>
  `;
}

function pintarCalendario(intentos) {
  const conteo = new Map();
  for (const i of intentos) {
    const k = claveDia(i.fecha);
    conteo.set(k, (conteo.get(k) || 0) + 1);
  }
  const dias = [];
  const hoy = new Date();
  for (let n = 111; n >= 0; n--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - n);
    const k = claveDia(d.toISOString());
    const c = conteo.get(k) || 0;
    let nivel = 0;
    if (c >= 1 && c < 5) nivel = 1;
    else if (c >= 5 && c < 10) nivel = 2;
    else if (c >= 10 && c < 20) nivel = 3;
    else if (c >= 20) nivel = 4;
    dias.push(`<div class="dia" data-nivel="${nivel}" title="${k}: ${c} preguntas"></div>`);
  }
  document.getElementById("calendario").innerHTML = dias.join("");
}

function pintarEvolucion(intentos) {
  const canvas = document.getElementById("grafico-evolucion");
  if (!intentos.length) {
    canvas.parentElement.innerHTML = `<div class="vacio"><div class="icono">📈</div>Aún no hay intentos registrados en esta asignatura.<br/>Haz tu primer test para empezar a ver tu evolución.</div>`;
    return;
  }
  const porDia = new Map();
  for (const i of intentos) {
    const k = claveDia(i.fecha);
    if (!porDia.has(k)) porDia.set(k, { total: 0, aciertos: 0 });
    const o = porDia.get(k);
    o.total++;
    if (i.acierto) o.aciertos++;
  }
  const claves = [...porDia.keys()].sort();
  const etiquetas = claves.map((k) => k.slice(5).split("-").reverse().join("/"));
  const datos = claves.map((k) => Math.round((porDia.get(k).aciertos / porDia.get(k).total) * 100));

  new Chart(canvas, {
    type: "line",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "% de acierto por día",
          data: datos,
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124,58,237,.15)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#06b6d4",
          pointRadius: 4,
        },
      ],
    },
    options: {
      scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } } },
      plugins: { legend: { display: false } },
    },
  });
}

function pintarAccesos(totalExamenes, totalTrucos) {
  document.getElementById("accesos").innerHTML = `
    <a class="tarjeta" href="${enlaceAsignatura("temas.html", ASIGNATURA_ID)}">
      <div class="cabecera"><span class="icono">📚</span><h3>Repasar Tema</h3></div>
      <div class="cuerpo"><div class="meta">Practica por unidad/tema</div></div>
    </a>
    <a class="tarjeta" href="${enlaceAsignatura("practica.html", ASIGNATURA_ID)}">
      <div class="cabecera g2"><span class="icono">⚡</span><h3>Práctica rápida</h3></div>
      <div class="cuerpo"><div class="meta">Aleatorio, solo fallos o solo favoritos</div></div>
    </a>
    <a class="tarjeta" href="${enlaceAsignatura("examenes.html", ASIGNATURA_ID)}">
      <div class="cabecera g3"><span class="icono">📝</span><h3>Cuestionarios</h3></div>
      <div class="cuerpo"><div class="meta">${totalExamenes} exámenes oficiales y no oficiales</div></div>
    </a>
    <a class="tarjeta" href="${enlaceAsignatura("trucos.html", ASIGNATURA_ID)}">
      <div class="cabecera g4"><span class="icono">💡</span><h3>Trucos y chuletario</h3></div>
      <div class="cuerpo"><div class="meta">${totalTrucos} trucos rápidos para el examen</div></div>
    </a>
  `;
}
