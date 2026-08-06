// ============================================================
// Configuración de conexión a Supabase
// Proyecto: "Ingeniería Informática"
// ============================================================
const SUPABASE_URL = "https://pfzjubddiqdfpxqoulqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmemp1YmRkaXFkZnB4cW91bHF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDMwNDUsImV4cCI6MjEwMTU3OTA0NX0.koPbKIsRPqnHNfsSFwwY5Ip22Rr5JxPDRWStv1McxVY";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
