import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * ¿La sesión actual es admin? Lo usa el botón "Panel" del encabezado de la tienda, que es
 * estático: así el navegador no tiene que descargar la librería de Supabase en cada página.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let admin = false;
  if (data.user) {
    const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", data.user.id).maybeSingle();
    admin = perfil?.rol === "admin";
  }
  return NextResponse.json({ admin }, { headers: { "Cache-Control": "private, no-store" } });
}
