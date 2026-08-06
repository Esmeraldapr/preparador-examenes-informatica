// ============================================================
// Lógica de trucos.html — chuletario de trucos rápidos
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
  pintarNavbar("trucos.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: trucos } = await sb.from("trucos").select("*").eq("asignatura_id", ASIGNATURA_ID).order("id");

  const cont = document.getElementById("lista-trucos");
  if (!trucos || !trucos.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">💡</div>Aún no hay trucos guardados para esta asignatura.</div>`;
    return;
  }

  cont.innerHTML = trucos
    .map((t, idx) => {
      const parrafos = String(t.explicacion)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const parrafosHtml = parrafos
        .map((p) => `<p class="parrafo-leible" title="Pulsa para escuchar desde aquí">${p}</p>`)
        .join("");
      return `
    <div class="tarjeta">
      <div class="cabecera ${COLORES[idx % COLORES.length]}">
        <span class="icono">💡</span>
        <h3>${t.nombre}</h3>
        <button type="button" class="btn-altavoz" data-idx="${idx}" title="Escuchar todo desde el principio" aria-label="Escuchar todo desde el principio">🔊</button>
      </div>
      <div class="cuerpo">
        ${t.imagen_url ? `<img class="imagen-truco ampliable" src="${t.imagen_url}" alt="${t.nombre}" title="Pulsa para ver en grande" />` : ""}
        <div class="meta" style="color:var(--texto); font-size:.9rem; line-height:1.55">${parrafosHtml}</div>
      </div>
    </div>`;
    })
    .join("");

  cont.addEventListener("click", (e) => {
    const boton = e.target.closest(".btn-altavoz");
    if (!boton) return;
    const t = trucos[Number(boton.dataset.idx)];
    leerTexto(`${t.nombre}. ${t.explicacion}`, boton);
  });
})();
