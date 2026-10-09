"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";

const CLAVE = "bpx-rol";
// Con la misma sesión: "sí es admin" se recuerda 10 minutos; "no" solo 30 segundos, para que
// el botón aparezca enseguida si a la cuenta le acaban de dar el rol de admin.
const VIGENCIA_SI = 10 * 60_000;
const VIGENCIA_NO = 30_000;

/**
 * Botón "Panel" del encabezado de la tienda: solo para cuentas admin.
 * El encabezado es estático (cacheado), así que el rol se pregunta a /api/rol desde el navegador.
 */
/** usePathname necesita Suspense en páginas prerenderizadas; sin sesión no se muestra nada. */
export function BotonPanel(props: { movil?: boolean }) {
  return (
    <Suspense fallback={null}>
      <Boton {...props} />
    </Suspense>
  );
}

function Boton({ movil }: { movil?: boolean }) {
  const [admin, setAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let vivo = true;
    // La cookie de sesión de Supabase cambia al entrar o salir: sin ella no hay admin y,
    // con ella, la respuesta guardada vale mientras sea la misma sesión.
    const sesion = document.cookie.split("; ").find((c) => /^sb-[^=]+-auth-token(.0)?=/.test(c));
    if (!sesion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin sesión no hay que preguntar
      setAdmin(false);
      return;
    }
    const huella = sesion.slice(-24);
    try {
      const [en, h, valor] = (sessionStorage.getItem(CLAVE) ?? "").split("|");
      if (h === huella && Date.now() - Number(en) < (valor === "1" ? VIGENCIA_SI : VIGENCIA_NO)) {
        setAdmin(valor === "1");
        return;
      }
    } catch {}
    fetch("/api/rol", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((r: { admin: boolean }) => {
        try {
          sessionStorage.setItem(CLAVE, `${Date.now()}|${huella}|${r.admin ? 1 : 0}`);
        } catch {}
        if (vivo) setAdmin(r.admin);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [pathname]);

  if (!admin) return null;
  if (movil)
    return (
      <Link href="/admin" aria-label="Panel de administración" className="flex size-11 items-center justify-center rounded-full bg-navy-50 text-navy">
        <LayoutDashboard size={20} aria-hidden />
      </Link>
    );
  return (
    <Link
      href="/admin"
      className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-green-50 px-3.5 text-sm font-semibold text-navy no-underline shadow-[inset_0_0_0_1.5px_var(--green)] hover:bg-green/20"
    >
      <LayoutDashboard size={20} aria-hidden />
      Panel
    </Link>
  );
}
