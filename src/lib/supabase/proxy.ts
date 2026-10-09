import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas que piden sesión. El resto de la tienda es pública. */
const PRIVADAS = ["/checkout", "/pedidos", "/cuenta", "/admin"];

export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresca la sesión en cada request (no quitar). getClaims verifica la firma del token localmente.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname, search } = request.nextUrl;
  if (!user && PRIVADAS.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = `?siguiente=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/ingresar") {
    const url = request.nextUrl.clone();
    url.pathname = "/cuenta";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
