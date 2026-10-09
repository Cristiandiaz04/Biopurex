import { createBrowserClient } from "@supabase/ssr";

/** Cliente de Supabase para componentes de cliente (usa la sesión de las cookies). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
  });
}
