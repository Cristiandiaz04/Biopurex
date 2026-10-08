import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Enlace de los correos de Supabase (confirmar cuenta, recuperar contraseña). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const sig = searchParams.get("siguiente") ?? "/cuenta";
  const siguiente = sig.startsWith("/") && !sig.startsWith("//") ? sig : "/cuenta";

  const supabase = await createClient();
  const { error } = tokenHash && tipo
    ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Enlace incompleto") };

  if (error) return NextResponse.redirect(`${origin}/ingresar?error=enlace`);
  return NextResponse.redirect(`${origin}${siguiente}`);
}
