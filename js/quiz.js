// ============================================================
// Motor de test — quiz.html
// Requiere ?asignatura=ID en la URL, además de:
//   &modo=tema&unidad=UD1%20-%20Funciones
//   &modo=examen&examen_id=3
//   &modo=fallos
//   &modo=favoritos
//   &modo=aleatorio&n=20&tipo=todas|oficial|no_oficial
//   &modo=racha&barra=1|2|3   (tareas diarias de "Mi racha")
// ============================================================

let usuarioActual = null;
let ASIGNATURA_ID = null;
let MODO = "aleatorio";
let BARRA_RACHA = null;

/** Adónde vuelve el botón de salir: a Mi racha si vienes de ahí, si no al dashboard. */
function urlVolver() {
  return MODO === "racha" ? "racha.html" : enlaceAsignatura("asignatura.html", ASIGNATURA_ID);
}
let preguntasSet = [];
let favoritosSet = new Set();
let indice = 0; // primera pregunta aún sin responder (= nº de preguntas ya hechas)
let vista = 0; // pregunta que se está mostrando ahora (puede ser < indice si se pulsa "Anterior")
let respuestas = []; // por índice: { opcionIdx, correcta } o null si se dejó en blanco
let aciertos = 0;
let errores = 0;
let blancos = 0;
let respondida = false;
let examenOficialActual = false;
let tituloModoActual = "";

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Clave única de localStorage para guardar el progreso de este test en curso. */
function claveProgreso() {
  const params = new URLSearchParams(window.location.search);
  let extra = MODO;
  if (MODO === "racha") {
    // Un día distinto (hora local del móvil, aproximada) es una tarea distinta.
    extra = `racha_b${params.get("barra") || ""}_${new Date().toISOString().slice(0, 10)}`;
  } else if (MODO === "examen") {
    extra = `examen_${params.get("examen_id") || ""}`;
  } else if (MODO === "tema") {
    extra = `tema_${params.get("unidad") || ""}`;
  }
  return `quizprogreso_${usuarioActual.id}_${ASIGNATURA_ID}_${extra}`;
}

/** Guarda el estado actual (preguntas, índice, aciertos...) para poder continuar si se pierde la conexión. */
function guardarProgreso() {
  try {
    const estado = {
      ids: preguntasSet.map((p) => p.id),
      indice,
      aciertos,
      errores,
      blancos,
      respuestas,
      tituloModo: tituloModoActual,
      examenOficialActual,
    };
    localStorage.setItem(claveProgreso(), JSON.stringify(estado));
  } catch (e) {
    // localStorage puede fallar (privado, lleno...); no es crítico, seguimos sin guardar.
  }
}

function borrarProgreso() {
  try {
    localStorage.removeItem(claveProgreso());
  } catch (e) {}
}

function leerProgresoGuardado() {
  try {
    const bruto = localStorage.getItem(claveProgreso());
    if (!bruto) return null;
    const estado = JSON.parse(bruto);
    if (!estado || !Array.isArray(estado.ids) || !estado.ids.length) return null;
    return estado;
  } catch (e) {
    return null;
  }
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  usuarioActual = await obtenerOCrearUsuario(sesion);
  if (!usuarioActual) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  pintarNavbar("", usuarioActual, asignatura || null);

  const params = new URLSearchParams(window.location.search);
  const modo = params.get("modo") || "aleatorio";
  MODO = modo;
  if (modo === "racha") BARRA_RACHA = parseInt(params.get("barra") || "0", 10);

  const { data: favs } = await sb.from("favoritos").select("pregunta_id").eq("usuario_id", usuarioActual.id);
  favoritosSet = new Set((favs || []).map((f) => f.pregunta_id));

  // Si había un test de este mismo tipo a medias (por ejemplo, se cortó la conexión),
  // seguimos exactamente por donde se dejó, con las mismas preguntas y en el mismo orden.
  const progresoGuardado = leerProgresoGuardado();
  if (progresoGuardado) {
    const { data } = await sb.from("preguntas").select("*").in("id", progresoGuardado.ids);
    const porId = new Map((data || []).map((p) => [p.id, p]));
    const recuperadas = progresoGuardado.ids.map((id) => porId.get(id)).filter(Boolean);
    if (recuperadas.length === progresoGuardado.ids.length) {
      preguntasSet = recuperadas;
      indice = progresoGuardado.indice;
      aciertos = progresoGuardado.aciertos;
      errores = progresoGuardado.errores;
      blancos = progresoGuardado.blancos;
      respuestas = progresoGuardado.respuestas || [];
      tituloModoActual = progresoGuardado.tituloModo || "";
      examenOficialActual = !!progresoGuardado.examenOficialActual;
      vista = indice;
      document.getElementById("titulo-modo").textContent = tituloModoActual;
      if (indice >= preguntasSet.length) {
        pintarResultado();
      } else {
        pintarPregunta();
      }
      return;
    }
    // Si alguna pregunta ya no existe, descartamos el progreso guardado y empezamos de cero.
    borrarProgreso();
  }

  let preguntas = [];
  let tituloModo = "";

  if (modo === "tema") {
    const unidad = params.get("unidad") || "";
    tituloModo = `📘 Tema: ${unidad}`;
    const { data } = await sb.from("preguntas").select("*").eq("asignatura_id", ASIGNATURA_ID).eq("unidad", unidad);
    preguntas = mezclar(data || []);
  } else if (modo === "examen") {
    const examenId = params.get("examen_id");
    const { data: examen } = await sb.from("examenes").select("nombre, tipo").eq("id", examenId).single();
    tituloModo = `📝 ${examen ? examen.nombre : "Cuestionario"}`;
    examenOficialActual = !!examen && examen.tipo === "oficial";
    const { data } = await sb.from("preguntas").select("*").eq("examen_id", examenId).order("orden", { ascending: true });
    preguntas = data || [];
  } else if (modo === "fallos") {
    tituloModo = "🔁 Repaso de fallos";
    const { data: preguntasAsignatura } = await sb.from("preguntas").select("id").eq("asignatura_id", ASIGNATURA_ID);
    const idsAsignatura = new Set((preguntasAsignatura || []).map((p) => p.id));
    const { data: intentos } = await sb.from("intentos").select("pregunta_id, acierto, fecha").eq("usuario_id", usuarioActual.id).order("fecha", { ascending: true });
    const ultimoPorPregunta = new Map();
    for (const i of intentos || []) {
      if (idsAsignatura.has(i.pregunta_id)) ultimoPorPregunta.set(i.pregunta_id, i.acierto);
    }
    const idsFallo = [...ultimoPorPregunta.entries()].filter(([, ok]) => !ok).map(([id]) => id);
    if (idsFallo.length) {
      const { data } = await sb.from("preguntas").select("*").in("id", idsFallo);
      preguntas = mezclar(data || []);
    }
  } else if (modo === "favoritos") {
    tituloModo = "⭐ Mis favoritas";
    const { data: preguntasAsignatura } = await sb.from("preguntas").select("id").eq("asignatura_id", ASIGNATURA_ID);
    const idsAsignatura = new Set((preguntasAsignatura || []).map((p) => p.id));
    const ids = [...favoritosSet].filter((id) => idsAsignatura.has(id));
    if (ids.length) {
      const { data } = await sb.from("preguntas").select("*").in("id", ids);
      preguntas = mezclar(data || []);
    }
  } else if (modo === "racha") {
    // Las preguntas las elige la base de datos (solo exámenes oficiales:
    // primero las falladas y las que hace más tiempo que no ves).
    tituloModo = ["🔥 Racha", "🔥 Racha · Repaso rápido", "🔥 Racha · Test de la asignatura", "🔥 Racha · Tema del día"][BARRA_RACHA] || "🔥 Racha";
    const { data } = await sb.rpc("racha_preguntas_web", { p_barra: BARRA_RACHA });
    preguntas = mezclar(data || []);
  } else {
    // aleatorio
    const n = parseInt(params.get("n") || "20", 10);
    const tipo = params.get("tipo") || "todas";
    tituloModo = "⚡ Práctica rápida";
    let idsExamenes = null;
    if (tipo !== "todas") {
      const { data: exs } = await sb.from("examenes").select("id").eq("asignatura_id", ASIGNATURA_ID).eq("tipo", tipo);
      idsExamenes = (exs || []).map((e) => e.id);
    }
    let consulta = sb.from("preguntas").select("*").eq("asignatura_id", ASIGNATURA_ID);
    if (idsExamenes) consulta = consulta.in("examen_id", idsExamenes);
    const { data } = await consulta;
    preguntas = mezclar(data || []).slice(0, n);
  }

  document.getElementById("titulo-modo").textContent = tituloModo;
  tituloModoActual = tituloModo;
  preguntasSet = preguntas;

  if (!preguntasSet.length) {
    document.getElementById("zona-quiz").innerHTML = `
      <div class="vacio">
        <div class="icono">🎉</div>
        ${modo === "fallos" ? "No tienes ninguna pregunta fallada ahora mismo. ¡Vas genial!" : ""}
        ${modo === "favoritos" ? "Aún no has marcado ninguna pregunta como favorita. Pulsa la ⭐ durante un test para guardarla aquí." : ""}
        ${modo !== "fallos" && modo !== "favoritos" ? "No hay preguntas disponibles para esta selección." : ""}
        <br/><br/><a class="btn btn-primario" href="${urlVolver()}">${MODO === "racha" ? "Volver a mi racha" : "Volver al dashboard"}</a>
      </div>`;
    return;
  }

  guardarProgreso();
  pintarPregunta();
})();

function pintarPregunta() {
  detenerLectura();
  const p = preguntasSet[vista];
  const pct = Math.round((vista / preguntasSet.length) * 100);
  const esFav = favoritosSet.has(p.id);
  const letras = ["A", "B", "C", "D", "E", "F"];
  const esUltima = vista + 1 >= preguntasSet.length;
  const yaRespondida = respuestas[vista] !== undefined && respuestas[vista] !== null;
  const enBlancoGuardado = respuestas[vista] === null;
  // Ya contestada (o dejada en blanco) = no se puede volver a puntuar, aunque se llegue
  // a ella otra vez con "Anterior" → "Siguiente".
  respondida = yaRespondida || enBlancoGuardado;

  document.getElementById("zona-quiz").innerHTML = `
    <div class="quiz-barra"><div style="width:${pct}%"></div></div>
    <div class="pregunta-caja">
      <div class="info-superior">
        <span class="chip oficial">${vista + 1} / ${preguntasSet.length}</span>
        ${p.unidad ? `<span class="chip no-oficial">${p.unidad}</span>` : ""}
        <button class="estrella ${esFav ? "activa" : ""}" id="btn-favorito" title="Marcar como favorita">⭐</button>
        <button type="button" class="btn-altavoz" id="btn-altavoz-pregunta" style="position:static; margin-left:auto" title="Escuchar la pregunta y las opciones" aria-label="Escuchar la pregunta y las opciones">🔊</button>
      </div>
      ${p.imagen_url ? `<img class="ampliable" src="${p.imagen_url}" alt="Imagen de la pregunta" title="Pulsa para ver en grande" style="border-radius:12px;margin-bottom:16px;border:1px solid var(--borde)" />` : ""}
      <div class="enunciado parrafo-leible" title="Pulsa para escuchar desde aquí">${p.enunciado}</div>
      <div class="opciones" id="opciones">
        ${p.opciones
          .map(
            (op, i) => `
          <div class="opcion" data-opcion="${i}">
            <span class="letra">${letras[i]}</span>
            <span>${op}</span>
          </div>`
          )
          .join("")}
      </div>
      <div id="zona-explicacion"></div>
      <details class="qz-comentario" id="qz-comentario">
        <summary>💬 ¿Ves algún error o quieres comentar algo de esta pregunta?</summary>
        <label for="qz-com-texto" class="qz-com-ayuda">Cuéntalo con tus palabras: se guarda junto a esta pregunta para revisarla.</label>
        <textarea id="qz-com-texto" rows="3" maxlength="2000" placeholder="Por ejemplo: creo que la respuesta correcta es otra, la imagen no se ve, no entiendo la explicación..."></textarea>
        <div class="qz-com-fila">
          <button type="button" id="qz-com-enviar" class="btn btn-secundario">Enviar comentario</button>
          <span id="qz-com-estado" class="qz-com-estado" role="status" aria-live="polite"></span>
        </div>
      </details>
    </div>
    <div class="acciones-quiz qz-nav">
      ${vista > 0 ? `<button id="btn-anterior" class="btn btn-secundario">← Anterior</button>` : `<span></span>`}
      <button id="btn-siguiente" class="btn btn-primario">${vista >= indice && esUltima ? "Ver resultado →" : "Siguiente →"}</button>
    </div>
    <div class="qz-salir">
      <a href="${urlVolver()}" class="btn btn-secundario">← Salir</a>
    </div>
  `;
  document.getElementById("qz-com-enviar").addEventListener("click", () => enviarComentario(p.id));

  document.getElementById("btn-favorito").addEventListener("click", () => alternarFavorito(p.id));
  const btnAnterior = document.getElementById("btn-anterior");
  if (btnAnterior) btnAnterior.addEventListener("click", irAnterior);
  document.getElementById("btn-siguiente").addEventListener("click", vista < indice ? avanzarVista : siguientePregunta);

  document.getElementById("btn-altavoz-pregunta").addEventListener("click", (e) => {
    const enunciadoEl = document.querySelector("#zona-quiz .enunciado");
    const opcionesEls = Array.from(document.querySelectorAll("#opciones .opcion"));
    leerTexto("", [enunciadoEl, ...opcionesEls], e.currentTarget);
  });

  // Si esta pregunta ya se respondió antes (venimos de "Anterior", o se recuperó
  // un test a medias), la mostramos ya resuelta: solo para consultarla, sin poder cambiar la respuesta.
  if (vista < indice || yaRespondida || enBlancoGuardado) {
    pintarComoRespondida(p, respuestas[vista]);
  } else {
    document.querySelectorAll(".opcion").forEach((el) => el.addEventListener("click", () => elegirOpcion(el, p)));
  }
}

/** Pinta las opciones ya marcadas (correcta/incorrecta) y la explicación, sin permitir tocar nada. */
function pintarComoRespondida(pregunta, respuesta) {
  document.querySelectorAll(".opcion").forEach((o) => {
    o.classList.add("deshabilitada");
    const idx = parseInt(o.dataset.opcion, 10);
    const texto = pregunta.opciones[idx];
    if (texto === pregunta.opcion_correcta) o.classList.add("correcta");
    else if (respuesta && idx === respuesta.opcionIdx) o.classList.add("incorrecta");
  });

  if (respuesta) {
    document.getElementById("zona-explicacion").innerHTML = `
      <div class="explicacion-caja ${respuesta.correcta ? "bien" : "mal"}" style="position:relative">
        <button type="button" class="btn-altavoz" id="btn-altavoz-explicacion" style="position:absolute; top:10px; right:10px; width:30px; height:30px; font-size:.9rem" title="Escuchar la explicación" aria-label="Escuchar la explicación">🔊</button>
        <strong>${respuesta.correcta ? "✅ ¡Correcto!" : "❌ Incorrecto"}</strong><br/>
        <span class="parrafo-leible" title="Pulsa para escuchar desde aquí">${pregunta.explicacion}</span>
      </div>`;
    document.getElementById("btn-altavoz-explicacion").addEventListener("click", (e) => {
      const explicacionEl = document.querySelector("#zona-explicacion .parrafo-leible");
      leerTexto(respuesta.correcta ? "Correcto." : "Incorrecto.", explicacionEl, e.currentTarget);
    });
  } else {
    document.getElementById("zona-explicacion").innerHTML = `<p class="subtitulo" style="margin-top:10px">Se dejó en blanco.</p>`;
  }
}

function irAnterior() {
  if (vista > 0) {
    vista--;
    pintarPregunta();
  }
}

/** Avanza la vista (sin re-puntuar) cuando se está repasando una pregunta ya respondida. */
function avanzarVista() {
  if (vista < indice) {
    vista++;
    pintarPregunta();
  }
}

async function elegirOpcion(el, pregunta) {
  if (respondida) return;
  respondida = true;

  const opcionIdx = parseInt(el.dataset.opcion, 10);
  const opcionElegida = pregunta.opciones[opcionIdx];
  const esCorrecta = opcionElegida === pregunta.opcion_correcta;
  if (esCorrecta) aciertos++;
  else errores++;
  respuestas[vista] = { opcionIdx, correcta: esCorrecta };
  guardarProgreso();

  document.querySelectorAll(".opcion").forEach((o) => {
    o.classList.add("deshabilitada");
    const texto = pregunta.opciones[parseInt(o.dataset.opcion, 10)];
    if (texto === pregunta.opcion_correcta) o.classList.add("correcta");
    else if (o === el) o.classList.add("incorrecta");
  });

  document.getElementById("zona-explicacion").innerHTML = `
    <div class="explicacion-caja ${esCorrecta ? "bien" : "mal"}" style="position:relative">
      <button type="button" class="btn-altavoz" id="btn-altavoz-explicacion" style="position:absolute; top:10px; right:10px; width:30px; height:30px; font-size:.9rem" title="Escuchar la explicación" aria-label="Escuchar la explicación">🔊</button>
      <strong>${esCorrecta ? "✅ ¡Correcto!" : "❌ Incorrecto"}</strong><br/>
      <span class="parrafo-leible" title="Pulsa para escuchar desde aquí">${pregunta.explicacion}</span>
    </div>`;

  document.getElementById("btn-altavoz-explicacion").addEventListener("click", (e) => {
    const explicacionEl = document.querySelector("#zona-explicacion .parrafo-leible");
    leerTexto(esCorrecta ? "Correcto." : "Incorrecto.", explicacionEl, e.currentTarget);
  });

  await sb.from("intentos").insert({
    usuario_id: usuarioActual.id,
    pregunta_id: pregunta.id,
    acierto: esCorrecta,
  });
}

/** Guarda en Supabase un comentario sobre la pregunta (error, duda...). */
async function enviarComentario(preguntaId) {
  const caja = document.getElementById("qz-com-texto");
  const estado = document.getElementById("qz-com-estado");
  const boton = document.getElementById("qz-com-enviar");
  const texto = (caja.value || "").trim();
  if (!texto) {
    estado.textContent = "Escribe algo antes de enviarlo.";
    caja.focus();
    return;
  }
  boton.disabled = true;
  estado.textContent = "Enviando…";
  const { error } = await sb.from("comentarios_pregunta").insert({ pregunta_id: preguntaId, texto });
  boton.disabled = false;
  if (error) {
    estado.textContent = "⚠️ No se pudo enviar. Inténtalo otra vez.";
    return;
  }
  caja.value = "";
  estado.textContent = "✅ ¡Gracias! Comentario guardado.";
}

async function alternarFavorito(preguntaId) {
  const btn = document.getElementById("btn-favorito");
  if (favoritosSet.has(preguntaId)) {
    await sb.from("favoritos").delete().eq("usuario_id", usuarioActual.id).eq("pregunta_id", preguntaId);
    favoritosSet.delete(preguntaId);
    btn.classList.remove("activa");
  } else {
    await sb.from("favoritos").insert({ usuario_id: usuarioActual.id, pregunta_id: preguntaId });
    favoritosSet.add(preguntaId);
    btn.classList.add("activa");
  }
}

function siguientePregunta() {
  // Si se pulsa "Siguiente" sin haber elegido ninguna opción, la pregunta
  // queda en blanco: no cuenta como acierto ni como error, y no se guarda intento.
  if (respuestas[indice] === undefined) {
    blancos++;
    respuestas[indice] = null;
  }

  indice++;
  vista = indice;
  guardarProgreso();
  if (indice >= preguntasSet.length) {
    pintarResultado();
  } else {
    pintarPregunta();
  }
}

async function pintarResultado() {
  borrarProgreso();
  const total = preguntasSet.length;
  const pct = Math.round((aciertos / total) * 100);

  // Modo racha: la tarea solo se da por hecha si has contestado todas (sin dejar en blanco).
  let bloqueRacha = "";
  let botonesFinales = `
        <a href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}" class="btn btn-secundario">Volver al dashboard</a>
        <a href="${enlaceAsignatura("practica.html", ASIGNATURA_ID)}" class="btn btn-primario">Otra práctica</a>`;
  if (MODO === "racha") {
    let celebrar = false;
    if (blancos === 0) {
      const { data, error } = await sb.rpc("racha_completar_barra_web", { p_barra: BARRA_RACHA });
      const fila = data && data[0];
      if (error || !fila) {
        bloqueRacha = `<p class="subtitulo" style="color:var(--rojo)">⚠️ No se pudo guardar la tarea. Vuelve a Mi racha e inténtalo otra vez.</p>`;
      } else {
        celebrar = !!fila.completado_hoy;
        bloqueRacha = `<p style="font-size:1.1rem;font-weight:800;color:var(--verde);margin:6px 0">✅ ¡Tarea de la racha completada!</p>`;
      }
    } else {
      bloqueRacha = `<p class="subtitulo" style="color:var(--naranja)">Dejaste ${blancos} en blanco, así que esta tarea aún no cuenta. Vuelve a Mi racha y repítela.</p>`;
    }
    botonesFinales = `<a href="racha.html${celebrar ? "?celebrar=1" : ""}" class="btn btn-primario">🔥 Volver a mi racha</a>`;
  }

  let bloqueNota = "";
  if (examenOficialActual) {
    const notaBruta = aciertos - errores * 0.33;
    const notaSobre10 = Math.max(0, (notaBruta / total) * 10);
    bloqueNota = `
      <div class="resumen-nota">
        <div class="stat-mini aciertos"><span class="num">${aciertos}</span>Aciertos</div>
        <div class="stat-mini blancos"><span class="num">${blancos}</span>En blanco</div>
        <div class="stat-mini errores"><span class="num">${errores}</span>Errores</div>
      </div>
      <p class="subtitulo" style="margin-bottom:6px">Cada error resta 0.33 puntos · los blancos no puntúan ni penalizan.</p>
      <div class="nota-final">
        Nota: ${notaBruta.toFixed(2)} / ${total}
        <span class="sobre-diez">(${notaSobre10.toFixed(2)} / 10)</span>
      </div>
    `;
  }

  document.getElementById("zona-quiz").innerHTML = `
    <div class="quiz-barra"><div style="width:100%"></div></div>
    <div class="pregunta-caja resultado-final">
      <div class="porcentaje">${pct}%</div>
      <p style="font-size:1.1rem;font-weight:700;margin:8px 0 4px">${aciertos} de ${total} correctas</p>
      ${bloqueNota}
      ${bloqueRacha}
      <p class="subtitulo">${
        pct >= 80 ? "¡Excelente trabajo! 🎉" : pct >= 50 ? "Vas por buen camino, sigue practicando 💪" : "Repasa este tema con calma, tú puedes 🙂"
      }</p>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:20px; flex-wrap:wrap">
        ${botonesFinales}
      </div>
    </div>
  `;
}
