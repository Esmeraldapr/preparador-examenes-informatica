// ============================================================
// Configuración de conexión a Supabase
// Proyecto: "Ingeniería Informática"
// ============================================================
const SUPABASE_URL = "https://pfzjubddiqdfpxqoulqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmemp1YmRkaXFkZnB4cW91bHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDMwNDUsImV4cCI6MjEwMTU3OTA0NX0.koPbKIsRPqnHNfsSFwwY5Ip22Rr5JxPDRWStv1McxVY";

// Con mala cobertura (metro), una petición puede quedarse «colgada» para siempre.
// Esto la corta a los 15 s (lecturas) o 25 s (escrituras) y reintenta una vez
// las lecturas, para que la página nunca se quede pillada esperando.
function fetchConTiempo(url, opciones = {}) {
  const metodo = (opciones.method || "GET").toUpperCase();
  const limite = metodo === "GET" || metodo === "HEAD" ? 15000 : 25000;
  const intentar = (quedan) => {
    const ctrl = new AbortController();
    const reloj = setTimeout(() => ctrl.abort(), limite);
    if (opciones.signal) {
      if (opciones.signal.aborted) ctrl.abort();
      else opciones.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
    return fetch(url, { ...opciones, signal: ctrl.signal })
      .finally(() => clearTimeout(reloj))
      .catch((err) => {
        if (quedan > 0 && (metodo === "GET" || metodo === "HEAD") && !opciones.signal?.aborted) {
          return new Promise((r) => setTimeout(r, 1500)).then(() => intentar(quedan - 1));
        }
        throw err;
      });
  };
  return intentar(1);
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: fetchConTiempo },
});
