// ============================================================
// Motor de test — quiz.html
// Requiere ?asignatura=ID en la URL, además de:
//   &modo=tema&unidad=UD1%20-%20Funciones
//   &modo=examen&examen_id=3
//   &modo=fallos
//   &modo=favoritos
//   &modo=aleatorio&n=20&tipo=todas|oficial|no_oficial
// ============================================================

let usuarioActual = null;
let ASIGNATURA_ID = null;
let preguntasSet = [];
let favoritosSet = new Set();
let indice = 0;
let aciertos = 0;
let respondida = false;

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  const { data: favs } = await sb.from("favoritos").select("pregunta_id").eq("usuario_id", usuarioActual.id);
  favoritosSet = new Set((favs || []).map((f) => f.pregunta_id));

  let preguntas = [];
  let tituloModo = "";

  if (modo === "tema") {
    const unidad = params.get("unidad") || "";
    tituloModo = `📘 Tema: ${unidad}`;
    const { data } = await sb.from("preguntas").select("*").eq("asignatura_id", ASIGNATURA_ID).eq("unidad", unidad);
    preguntas = mezclar(data || []);
  } else if (modo === "examen") {
    const examenId = params.get("examen_id");
    const { data: examen } = await sb.from("examenes").select("nombre").eq("id", examenId).single();
    tituloModo = `📝 ${examen ? examen.nombre : "Cuestionario"}`;
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
  preguntasSet = preguntas;

  if (!preguntasSet.length) {
    document.getElementById("zona-quiz").innerHTML = `
      <div class="vacio">
        <div class="icono">🎉</div>
        ${modo === "fallos" ? "No tienes ninguna pregunta fallada ahora mismo. ¡Vas genial!" : ""}
        ${modo === "favoritos" ? "Aún no has marcado ninguna pregunta como favorita. Pulsa la ⭐ durante un test para guardarla aquí." : ""}
        ${modo !== "fallos" && modo !== "favoritos" ? "No hay preguntas disponibles para esta selección." : ""}
        <br/><br/><a class="btn btn-primario" href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}">Volver al dashboard</a>
      </div>`;
    return;
  }

  pintarPregunta();
})();

function pintarPregunta() {
  detenerLectura();
  respondida = false;
  const p = preguntasSet[indice];
  const pct = Math.round((indice / preguntasSet.length) * 100);
  const esFav = favoritosSet.has(p.id);
  const letras = ["A", "B", "C", "D", "E", "F"];

  document.getElementById("zona-quiz").innerHTML = `
    <div class="quiz-barra"><div style="width:${pct}%"></div></div>
    <div class="pregunta-caja">
      <div class="info-superior">
        <span class="chip oficial">${indice + 1} / ${preguntasSet.length}</span>
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
    </div>
    <div class="acciones-quiz">
      <a href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}" class="btn btn-secundario">← Salir</a>
      <button id="btn-siguiente" class="btn btn-primario" style="display:none">Siguiente →</button>
    </div>
  `;

  document.getElementById("btn-favorito").addEventListener("click", () => alternarFavorito(p.id));
  document.querySelectorAll(".opcion").forEach((el) => el.addEventListener("click", () => elegirOpcion(el, p)));
  document.getElementById("btn-siguiente").addEventListener("click", siguientePregunta);

  document.getElementById("btn-altavoz-pregunta").addEventListener("click", (e) => {
    const opcionesTexto = p.opciones.map((op, i) => `${letras[i]}. ${op}`).join(". ");
    leerTexto(`${p.enunciado}. Opciones: ${opcionesTexto}`, e.currentTarget);
  });
}

async function elegirOpcion(el, pregunta) {
  if (respondida) return;
  respondida = true;

  const opcionElegida = pregunta.opciones[parseInt(el.dataset.opcion, 10)];
  const esCorrecta = opcionElegida === pregunta.opcion_correcta;
  if (esCorrecta) aciertos++;

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
    leerTexto(`${esCorrecta ? "Correcto." : "Incorrecto."} ${pregunta.explicacion}`, e.currentTarget);
  });

  document.getElementById("btn-siguiente").style.display = "inline-flex";
  document.getElementById("btn-siguiente").textContent =
    indice + 1 < preguntasSet.length ? "Siguiente →" : "Ver resultado →";

  await sb.from("intentos").insert({
    usuario_id: usuarioActual.id,
    pregunta_id: pregunta.id,
    acierto: esCorrecta,
  });
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
  indice++;
  if (indice >= preguntasSet.length) {
    pintarResultado();
  } else {
    pintarPregunta();
  }
}

function pintarResultado() {
  const total = preguntasSet.length;
  const pct = Math.round((aciertos / total) * 100);
  document.getElementById("zona-quiz").innerHTML = `
    <div class="quiz-barra"><div style="width:100%"></div></div>
    <div class="pregunta-caja resultado-final">
      <div class="porcentaje">${pct}%</div>
      <p style="font-size:1.1rem;font-weight:700;margin:8px 0 4px">${aciertos} de ${total} correctas</p>
      <p class="subtitulo">${
        pct >= 80 ? "¡Excelente trabajo! 🎉" : pct >= 50 ? "Vas por buen camino, sigue practicando 💪" : "Repasa este tema con calma, tú puedes 🙂"
      }</p>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:20px; flex-wrap:wrap">
        <a href="${enlaceAsignatura("asignatura.html", ASIGNATURA_ID)}" class="btn btn-secundario">Volver al dashboard</a>
        <a href="${enlaceAsignatura("practica.html", ASIGNATURA_ID)}" class="btn btn-primario">Otra práctica</a>
      </div>
    </div>
  `;
}
