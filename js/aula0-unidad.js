// ============================================================
// Lógica de aula0-unidad.html — explicación + test corto de una
// unidad de Aula 0. Es una zona de repaso/chuletario: el test se
// puede repetir tantas veces como se quiera y no se guarda en el
// historial de intentos ni afecta a las estadísticas de la
// asignatura (igual que fórmulas o gráficas, es material de
// referencia, no un examen).
// ============================================================

let ASIGNATURA_ID = null;
let UNIDAD = null;
let preguntas = [];
let indice = 0;
let aciertos = 0;
let respondida = false;

function mezclarAula0(arr) {
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
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("", usuario, asignatura);

  document.getElementById("enlace-volver").href = enlaceAsignatura("aula0.html", ASIGNATURA_ID);

  const params = new URLSearchParams(window.location.search);
  const unidadId = params.get("unidad");

  if (!unidadId) {
    document.getElementById("zona-unidad").innerHTML = `
      <div class="vacio"><div class="icono">⚠️</div>No se ha indicado ninguna unidad.<br/><br/>
      <a class="btn btn-primario" href="${enlaceAsignatura("aula0.html", ASIGNATURA_ID)}">Volver a Aula 0</a></div>`;
    return;
  }

  const { data: unidad } = await sb
    .from("aula0_unidades")
    .select("id, orden, nombre, icono, explicacion")
    .eq("id", unidadId)
    .eq("asignatura_id", ASIGNATURA_ID)
    .maybeSingle();

  if (!unidad) {
    document.getElementById("zona-unidad").innerHTML = `
      <div class="vacio"><div class="icono">⚠️</div>Esta unidad de Aula 0 no existe.<br/><br/>
      <a class="btn btn-primario" href="${enlaceAsignatura("aula0.html", ASIGNATURA_ID)}">Volver a Aula 0</a></div>`;
    return;
  }
  UNIDAD = unidad;
  document.title = `${unidad.nombre} · Aula 0`;

  const { data: datosPreguntas } = await sb
    .from("aula0_preguntas")
    .select("*")
    .eq("unidad_id", unidad.id)
    .order("orden");

  preguntas = mezclarAula0(datosPreguntas || []);

  pintarCabecera();
  pintarQuiz();
})();

function pintarCabecera() {
  const parrafos = String(UNIDAD.explicacion)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const parrafosHtml = parrafos
    .map((p) => `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${p}</p>`)
    .join("");

  const zona = document.getElementById("zona-unidad");
  const cabecera = document.createElement("div");
  cabecera.innerHTML = `
    <div class="panel">
      <div class="panel-cabecera">
        <h1 style="margin:0"><span>${UNIDAD.icono || "📘"}</span> Aula 0 · ${UNIDAD.orden}. ${UNIDAD.nombre}</h1>
        <button type="button" class="btn btn-secundario" id="btn-altavoz-unidad">🔊 Escuchar explicación</button>
      </div>
      <div style="font-size:.98rem; line-height:1.7">${parrafosHtml}</div>
    </div>
    <div id="zona-quiz-aula0"></div>
  `;
  zona.innerHTML = "";
  zona.appendChild(cabecera);

  document.getElementById("btn-altavoz-unidad").addEventListener("click", (e) => {
    detenerLectura();
    leerTexto(`${UNIDAD.nombre}. ${UNIDAD.explicacion}`, e.currentTarget);
  });
}

function pintarQuiz() {
  const cont = document.getElementById("zona-quiz-aula0");

  if (!preguntas.length) {
    cont.innerHTML = `
      <div class="vacio">
        <div class="icono">✏️</div>
        Todavía no hay preguntas de práctica para esta unidad.
      </div>`;
    return;
  }

  cont.innerHTML = `
    <div class="panel">
      <div class="panel-cabecera">
        <h2 style="margin:0">✏️ Ponte a prueba</h2>
        <span class="chip no-oficial">No cuenta para tus estadísticas · puedes repetirlo</span>
      </div>
      <div id="cuerpo-quiz-aula0"></div>
    </div>
  `;

  indice = 0;
  aciertos = 0;
  pintarPreguntaAula0();
}

function pintarPreguntaAula0() {
  detenerLectura();
  respondida = false;
  const p = preguntas[indice];
  const pct = Math.round((indice / preguntas.length) * 100);
  const letras = ["A", "B", "C", "D", "E", "F"];
  const esUltima = indice + 1 >= preguntas.length;

  document.getElementById("cuerpo-quiz-aula0").innerHTML = `
    <div class="quiz-barra"><div style="width:${pct}%"></div></div>
    <div class="pregunta-caja">
      <div class="info-superior">
        <span class="chip oficial">${indice + 1} / ${preguntas.length}</span>
        <button type="button" class="btn-altavoz" id="btn-altavoz-pregunta-aula0" style="position:static; margin-left:auto" title="Escuchar la pregunta y las opciones" aria-label="Escuchar la pregunta y las opciones">🔊</button>
      </div>
      <div class="enunciado parrafo-leible" title="Pulsa para escuchar desde aquí">${p.enunciado}</div>
      <div class="opciones" id="opciones-aula0">
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
      <div id="zona-explicacion-aula0"></div>
    </div>
    <div class="acciones-quiz">
      <a href="${enlaceAsignatura("aula0.html", ASIGNATURA_ID)}" class="btn btn-secundario">← Volver a Aula 0</a>
      <button id="btn-siguiente-aula0" class="btn btn-primario">${esUltima ? "Ver resultado →" : "Siguiente →"}</button>
    </div>
  `;

  document.querySelectorAll("#opciones-aula0 .opcion").forEach((el) => el.addEventListener("click", () => elegirOpcionAula0(el, p)));
  document.getElementById("btn-siguiente-aula0").addEventListener("click", siguientePreguntaAula0);
  document.getElementById("btn-altavoz-pregunta-aula0").addEventListener("click", (e) => {
    const letrasTxt = p.opciones.map((op, i) => `${letras[i]}. ${op}`).join(". ");
    leerTexto(`${p.enunciado}. Opciones: ${letrasTxt}`, e.currentTarget);
  });
}

function elegirOpcionAula0(el, pregunta) {
  if (respondida) return;
  respondida = true;

  const opcionElegida = pregunta.opciones[parseInt(el.dataset.opcion, 10)];
  const esCorrecta = opcionElegida === pregunta.opcion_correcta;
  if (esCorrecta) aciertos++;

  document.querySelectorAll("#opciones-aula0 .opcion").forEach((o) => {
    o.classList.add("deshabilitada");
    const texto = pregunta.opciones[parseInt(o.dataset.opcion, 10)];
    if (texto === pregunta.opcion_correcta) o.classList.add("correcta");
    else if (o === el) o.classList.add("incorrecta");
  });

  document.getElementById("zona-explicacion-aula0").innerHTML = `
    <div class="explicacion-caja ${esCorrecta ? "bien" : "mal"}" style="position:relative">
      <button type="button" class="btn-altavoz" id="btn-altavoz-explicacion-aula0" style="position:absolute; top:10px; right:10px; width:30px; height:30px; font-size:.9rem" title="Escuchar la explicación" aria-label="Escuchar la explicación">🔊</button>
      <strong>${esCorrecta ? "✅ ¡Correcto!" : "❌ Incorrecto"}</strong><br/>
      <span class="parrafo-leible" title="Pulsa para escuchar desde aquí">${pregunta.explicacion}</span>
    </div>`;

  document.getElementById("btn-altavoz-explicacion-aula0").addEventListener("click", (e) => {
    leerTexto(`${esCorrecta ? "Correcto." : "Incorrecto."} ${pregunta.explicacion}`, e.currentTarget);
  });
}

function siguientePreguntaAula0() {
  indice++;
  if (indice >= preguntas.length) {
    pintarResultadoAula0();
  } else {
    pintarPreguntaAula0();
  }
}

function pintarResultadoAula0() {
  const total = preguntas.length;
  const pct = Math.round((aciertos / total) * 100);

  document.getElementById("cuerpo-quiz-aula0").innerHTML = `
    <div class="quiz-barra"><div style="width:100%"></div></div>
    <div class="pregunta-caja resultado-final">
      <div class="porcentaje">${pct}%</div>
      <p style="font-size:1.1rem;font-weight:700;margin:8px 0 4px">${aciertos} de ${total} correctas</p>
      <p class="subtitulo">${
        pct >= 80 ? "¡Dominas bien esta unidad! 🎉" : pct >= 50 ? "Vas bien, repasa lo que has fallado antes de seguir 💪" : "Conviene repasar esta unidad con calma antes de continuar 🙂"
      }</p>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:20px; flex-wrap:wrap">
        <button id="btn-repetir-aula0" class="btn btn-secundario">🔁 Repetir test</button>
        <a href="${enlaceAsignatura("aula0.html", ASIGNATURA_ID)}" class="btn btn-primario">Volver a Aula 0</a>
      </div>
    </div>
  `;

  document.getElementById("btn-repetir-aula0").addEventListener("click", () => {
    preguntas = mezclarAula0(preguntas);
    indice = 0;
    aciertos = 0;
    pintarPreguntaAula0();
  });
}
