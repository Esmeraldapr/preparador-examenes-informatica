// ============================================================
// Lógica de formulas.html — zona de fórmulas de referencia
// ============================================================

const COLORES = ["", "g2", "g3", "g4"];

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("formulas.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: formulas } = await sb.from("formulas").select("*").eq("asignatura_id", ASIGNATURA_ID).order("id");

  const cont = document.getElementById("lista-formulas");
  if (!formulas || !formulas.length) {
    cont.innerHTML = `
      <div class="vacio">
        <div class="icono">🧮</div>
        Aún no hay fórmulas guardadas.<br/>
        En cuanto vayamos añadiendo exámenes, cada fórmula usada en una explicación se guardará aquí con su expresión y el contexto de cuándo se usa.
      </div>`;
    return;
  }

  cont.innerHTML = formulas
    .map((f, idx) => {
      const reglas = String(f.expresion)
        .split("|")
        .map((r) => r.trim())
        .filter(Boolean);
      const reglasHtml = reglas
        .map(
          (r, i) =>
            `<div class="regla-formula" data-idx="${idx}" data-regla="${i}" title="Pulsa para escuchar esta fórmula">${r}</div>`
        )
        .join("");
      const parrafos = String(f.explicacion)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const parrafosHtml = parrafos
        .map((p) => `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${p}</p>`)
        .join("");
      return `
    <div class="tarjeta">
      <div class="cabecera ${COLORES[idx % COLORES.length]}">
        <span class="icono">🧮</span>
        <h3>${f.nombre}</h3>
        <button type="button" class="btn-altavoz" data-idx="${idx}" title="Escuchar la explicación (sin la fórmula)" aria-label="Escuchar la explicación">🔊</button>
      </div>
      <div class="cuerpo">
        <div class="caja-formula">${reglasHtml}</div>
        <div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${parrafosHtml}</div>
      </div>
    </div>`;
    })
    .join("");

  // Botón principal: lee solo el nombre + la explicación (los símbolos de la fórmula no se leen bien en voz alta).
  // Cada caja de fórmula individual sí se puede escuchar pulsándola directamente.
  cont.addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-altavoz");
    if (boton) {
      const f = formulas[Number(boton.dataset.idx)];
      leerTexto(`${f.nombre}. ${f.explicacion}`, boton);
      return;
    }

    const caja = e.target.closest(".regla-formula");
    if (caja) {
      const f = formulas[Number(caja.dataset.idx)];
      const reglas = String(f.expresion).split("|").map((r) => r.trim()).filter(Boolean);
      const texto = reglas[Number(caja.dataset.regla)] || "";
      detenerLectura();
      leerTexto(texto.replace(/→/g, " igual a ").replace(/\|/g, ". "), null);
    }
  });
})();
