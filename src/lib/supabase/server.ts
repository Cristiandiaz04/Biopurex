import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Cliente de Supabase para Server Components y Server Actions, con la sesión del usuario. */
export async function createClient() {
  // Todo lo que usa la sesión se resuelve al pedir la página (no en el prefetch del App Shell):
  // así Supabase y las pantallas pueden usar la hora actual (Date.now) sin romper el render.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: lo resuelve el proxy al refrescar la sesión.
        }
      },
    },
  });
}

/** Usuario actual verificado (o null). */
export async function usuarioActual() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
