// ============================================================
// Vídeos — videos.html?asignatura=ID
// Dos bloques: los que recomienda el profe y los que pasan los compañeros.
// Dentro de cada bloque, una caja desplegable por unidad.
// ============================================================

function vdEsc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function vdUrl(v) {
  if (!v.minuto_inicio || !/youtu/.test(v.url)) return v.url;
  return v.url + (v.url.includes("?") ? "&" : "?") + "t=" + v.minuto_inicio;
}

function vdNumUnidad(u) {
  const m = /^UD(\d+)/.exec(u || "");
  return m ? parseInt(m[1], 10) : 999;
}

function vdBloque(titulo, subtitulo, videos) {
  if (!videos.length) {
    return `<section class="vd-bloque"><h2>${titulo}</h2><p class="vd-sub">Todavía no hay ninguno.</p></section>`;
  }
  const porUnidad = new Map();
  videos.forEach((v) => {
    const k = v.unidad || "Otros";
    if (!porUnidad.has(k)) porUnidad.set(k, []);
    porUnidad.get(k).push(v);
  });
  const unidades = [...porUnidad.keys()].sort((a, b) => vdNumUnidad(a) - vdNumUnidad(b) || a.localeCompare(b));
  const cajas = unidades
    .map((u) => {
      const lista = porUnidad.get(u).sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || a.id - b.id);
      const filas = lista
        .map(
          (v) => `<a class="vd-item" href="${vdEsc(vdUrl(v))}" target="_blank" rel="noopener">
            <span class="vd-play">▶</span>
            <span>
              <div class="vd-tit">${vdEsc(v.titulo)}</div>
              <div class="vd-meta">${vdEsc(v.canal || "")}${v.duracion_min ? " · " + v.duracion_min + " min" : ""}</div>
              ${v.para_que_sirve ? `<div class="vd-para">${vdEsc(v.para_que_sirve)}</div>` : ""}
            </span>
          </a>`
        )
        .join("");
      return `<details class="vd-ud"><summary>${vdEsc(u)}<span class="vd-n">· ${lista.length} vídeo${lista.length === 1 ? "" : "s"}</span></summary><div class="vd-lista">${filas}</div></details>`;
    })
    .join("");
  return `<section class="vd-bloque"><h2>${titulo}</h2><p class="vd-sub">${subtitulo}</p>${cajas}</section>`;
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const ASIGNATURA_ID = exigirAsignaturaId();
  if (!ASIGNATURA_ID) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const { data: asignatura } = await sb.from("asignaturas").select("id, nombre").eq("id", ASIGNATURA_ID).single();
  if (!asignatura) return;
  pintarNavbar("videos.html", usuario, asignatura);
  document.getElementById("nombre-asignatura").textContent = asignatura.nombre;

  const { data: videos } = await sb
    .from("recursos")
    .select("id, unidad, titulo, url, canal, minuto_inicio, para_que_sirve, orden, origen, duracion_min")
    .eq("asignatura_id", ASIGNATURA_ID)
    .eq("verificado", true);

  const todos = videos || [];
  const cont = document.getElementById("lista-videos");
  if (!todos.length) {
    cont.innerHTML = `<div class="vacio"><div class="icono">🎬</div>Todavía no hay vídeos en esta asignatura.</div>`;
    return;
  }
  cont.innerHTML =
    vdBloque("🎓 Recomendados por el profe", "Los que manda o enseña el profesor.", todos.filter((v) => v.origen === "profe")) +
    vdBloque("👥 Recomendados por compañeros y otros canales", "Los que han pasado compañeros de clase y otros canales que explican bien.", todos.filter((v) => v.origen !== "profe"));

  // La primera unidad de cada bloque, abierta.
  cont.querySelectorAll(".vd-bloque").forEach((b) => {
    const primera = b.querySelector(".vd-ud");
    if (primera) primera.open = true;
  });
})();
