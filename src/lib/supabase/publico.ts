import { createClient } from "@supabase/supabase-js";

/**
 * Cliente sin sesión (rol anon) para lecturas públicas cacheadas con "use cache":
 * catálogo y configuración. Nunca leer aquí datos de un usuario.
 */
export function clientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
