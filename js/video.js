// ============================================================
// 🎬 Ver un vídeo de la tabla `recursos` dentro de la web (se abre desde Mi plan).
// - Empieza en su minuto (minuto_inicio) y recuerda por dónde ibas.
// - Cuenta lo que has visto de verdad; al llegar al final (o al 90 %) se marca hecho en Mi plan.
// - Mientras suena, el cronómetro de Mi plan sigue contando aunque no toques la pantalla.
// - Si el vídeo está en `video_voz`, se puede oír en español con la voz de la web.
// ============================================================
function vdEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function vdYoutubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function vdReloj(seg) {
  seg = Math.max(0, Math.round(seg || 0));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
function vdApiYoutube() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  return new Promise((ok) => {
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (previo) previo(); ok(); };
    const sc = document.createElement("script");
    sc.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(sc);
  });
}

(async function iniciar() {
  const sesion = await exigirSesion();
  if (!sesion) return;
  const usuario = await obtenerOCrearUsuario(sesion);
  if (!usuario) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"), 10);
  const clavePlan = params.get("claveplan") || "";
  const cont = document.getElementById("vd-cuerpo");
  if (!id) { window.location.href = "index.html"; return; }

  const { data: r } = await sb.from("recursos").select("id, asignatura_id, unidad, titulo, url, canal, minuto_inicio, para_que_sirve, duracion_min, apartado").eq("id", id).maybeSingle();
  const { data: asig } = r ? await sb.from("asignaturas").select("id, nombre").eq("id", r.asignatura_id).maybeSingle() : { data: null };
  pintarNavbar("plan.html", usuario, asig || null);
  if (!r) {
    document.getElementById("vd-titulo").textContent = "🎬 Vídeo";
    cont.innerHTML = `<div class="vacio"><div class="icono">📭</div>No encuentro este vídeo.<br/><br/><a class="btn btn-primario" href="plan.html">Volver a Mi plan</a></div>`;
    return;
  }
  document.title = `${r.titulo} · Vídeo`;
  document.getElementById("vd-titulo").textContent = `🎬 ${r.titulo}`;
  document.getElementById("vd-subtitulo").textContent = [asig && asig.nombre, r.unidad, r.duracion_min ? `dura unos ${r.duracion_min} min` : ""].filter(Boolean).join(" · ");

  const yt = vdYoutubeId(r.url);
  const volver = `<a class="btn btn-secundario" href="plan.html">⬅ Volver a Mi plan</a>`;
  const yaHecho = async () => {
    if (!clavePlan) return;
    await sb.from("plan_hecho").upsert({ clave: clavePlan }, { onConflict: "auth_user_id,clave" });
  };

  // Vídeos que no son de YouTube (campus, noticias…): no se pueden meter aquí.
  if (!yt) {
    cont.innerHTML = `<div class="cl-vd">
      ${r.para_que_sirve ? `<div class="cl-vd-para">${vdEsc(r.para_que_sirve)}</div>` : ""}
      <p>Este vídeo está en el campus (o en otra web) y no se puede ver dentro de esta página. Se abre en otra pestaña; cuando termines, vuelve aquí y pulsa «Ya lo he visto».</p>
      <div class="cl-vd-botones">
        <a class="btn btn-primario" href="${vdEsc(r.url)}" target="_blank" rel="noopener">Abrirlo ↗</a>
        ${clavePlan ? `<button type="button" class="btn btn-primario" id="vd-hecho">✅ Ya lo he visto</button>` : ""}
        ${volver}
      </div></div>`;
    document.getElementById("vd-hecho")?.addEventListener("click", async (e) => { await yaHecho(); e.target.textContent = "✅ Hecho en Mi plan"; e.target.disabled = true; });
    return;
  }

  const { data: voz } = await sb.from("video_voz").select("frases").eq("youtube_id", yt).maybeSingle();
  const frases = (voz && voz.frases) || [];
  const CLAVE_POS = `video_pos_${id}`;
  let posGuardada = 0;
  try { posGuardada = parseFloat(localStorage.getItem(CLAVE_POS)) || 0; } catch (e) {}
  const inicio = Number(r.minuto_inicio) || 0;

  cont.innerHTML = `
    ${r.para_que_sirve ? `<div class="cl-vd-para vd-para">🎯 ${vdEsc(r.para_que_sirve)}</div>` : ""}
    ${r.apartado ? `<div class="cl-vd-para">📖 Va con el apartado «${vdEsc(r.apartado)}» del tema.</div>` : ""}
    <div class="vd-marco"><div id="vd-player"></div></div>
    <div class="vd-barra">
      <div class="vd-progreso"><div id="vd-progreso-relleno"></div></div>
      <div class="vd-info" id="vd-info">Visto: 0:00</div>
    </div>
    <div class="cl-vd-botones vd-botones">
      ${frases.length ? `<button type="button" class="btn btn-primario" id="vd-voz">🔊 Oírlo en español</button>` : ""}
      ${clavePlan ? `<button type="button" class="btn btn-primario" id="vd-hecho">✅ Ya lo he visto</button>` : ""}
      ${volver}
      <a class="btn btn-secundario" href="${vdEsc(r.url)}" target="_blank" rel="noopener">Abrir en YouTube ↗</a>
    </div>
    <div class="cl-vd-sub" id="vd-sub" hidden></div>
    <div class="cl-vd-aviso" id="vd-aviso-voz" hidden>🔇 El vídeo va sin sonido: lo lee la voz de la web en español. Si pausas el vídeo, la voz también para.</div>
    <p class="pl-mini vd-nota">Mientras el vídeo está en marcha, el tiempo cuenta en Mi plan aunque no toques nada. Al llegar al final se marca hecho solo.</p>`;

  await vdApiYoutube();
  let vistos = 0, total = 0, marcado = false, conVoz = false, ultima = -1;
  const btnHecho = document.getElementById("vd-hecho");
  const marcar = async () => {
    if (marcado) return;
    marcado = true;
    await yaHecho();
    if (btnHecho) { btnHecho.textContent = "✅ Hecho en Mi plan"; btnHecho.disabled = true; }
  };
  btnHecho?.addEventListener("click", marcar);

  const player = new YT.Player("vd-player", {
    host: "https://www.youtube-nocookie.com",
    videoId: yt,
    playerVars: { rel: 0, playsinline: 1, hl: "es", iv_load_policy: 3, start: Math.floor(posGuardada > inicio + 5 ? posGuardada : inicio) },
    events: {
      onReady: () => { total = player.getDuration() || 0; },
      onStateChange: (e) => {
        window.cronoVideoSonando = e.data === YT.PlayerState.PLAYING;
        if (e.data === YT.PlayerState.PLAYING) cronoActivar();
        if (e.data !== YT.PlayerState.PLAYING) { try { speechSynthesis.cancel(); } catch (x) {} ultima = -2; }
        if (e.data === YT.PlayerState.ENDED) { try { localStorage.removeItem(CLAVE_POS); } catch (x) {} marcar(); }
      },
    },
  });

  // 🔊 Voz en español: silencia el vídeo y lee cada frase en su segundo.
  const btnVoz = document.getElementById("vd-voz");
  btnVoz?.addEventListener("click", () => {
    conVoz = !conVoz;
    btnVoz.textContent = conVoz ? "🔈 Volver al sonido del vídeo" : "🔊 Oírlo en español";
    document.getElementById("vd-aviso-voz").hidden = !conVoz;
    try { speechSynthesis.cancel(); } catch (x) {}
    ultima = -1;
    document.getElementById("vd-sub").hidden = !conVoz;
    if (conVoz) { player.mute(); player.playVideo(); }
    else player.unMute();
  });
  const decir = (f, sig) => {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(f.s);
    u.lang = "es-ES";
    const hueco = Math.max(1, (sig || f.t + 6) - f.t);
    const base = Math.max(1.2, typeof velocidadLectura === "number" ? velocidadLectura : 1.2);
    u.rate = Math.min(2, Math.max(base, f.s.length / (15 * hueco)));
    speechSynthesis.speak(u);
  };

  let ultimoT = null;
  setInterval(() => {
    if (!player.getPlayerState) return;
    const sonando = player.getPlayerState() === YT.PlayerState.PLAYING;
    window.cronoVideoSonando = sonando;
    const t = player.getCurrentTime ? player.getCurrentTime() : 0;
    if (!total) total = player.getDuration ? player.getDuration() : 0;
    if (sonando && ultimoT !== null && t > ultimoT && t - ultimoT < 3) vistos += t - ultimoT; // solo lo visto, no los saltos
    ultimoT = t;
    if (sonando) { try { localStorage.setItem(CLAVE_POS, String(t)); } catch (x) {} }
    const aVer = Math.max(1, total - inicio);
    const pc = Math.min(100, Math.round((vistos / aVer) * 100));
    document.getElementById("vd-progreso-relleno").style.width = pc + "%";
    document.getElementById("vd-info").textContent = `Visto: ${vdReloj(vistos)} de ${vdReloj(aVer)} · vas por el ${vdReloj(t)}`;
    if (pc >= 90) marcar();
    if (conVoz && sonando && frases.length) {
      if (!player.isMuted()) player.mute();
      let i = -1;
      for (let k = 0; k < frases.length; k++) { if (frases[k].t <= t + 0.15) i = k; else break; }
      if (i >= 0 && i !== ultima) {
        const reciente = t - frases[i].t < 1.5 || ultima === i - 1;
        ultima = i;
        document.getElementById("vd-sub").textContent = frases[i].s;
        if (reciente) decir(frases[i], frases[i + 1] && frases[i + 1].t);
      }
    }
  }, 250);
})();
