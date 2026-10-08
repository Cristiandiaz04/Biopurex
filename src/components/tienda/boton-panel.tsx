"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const CLAVE = "bpx-rol";

/**
 * Botón "Panel" del encabezado de la tienda: solo para cuentas admin.
 * El encabezado es estático (cacheado), así que el rol se consulta en el navegador
 * y se guarda por sesión para no repetir la consulta en cada página.
 */
export function BotonPanel({ movil }: { movil?: boolean }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let vivo = true;

    async function revisar() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        if (vivo) setAdmin(false);
        return;
      }
      try {
        const guardado = sessionStorage.getItem(CLAVE);
        if (guardado?.startsWith(uid + ":")) {
          if (vivo) setAdmin(guardado.endsWith(":admin"));
          return;
        }
      } catch {}
      const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", uid).single();
      const rol = perfil?.rol ?? "cliente";
      try {
        sessionStorage.setItem(CLAVE, `${uid}:${rol}`);
      } catch {}
      if (vivo) setAdmin(rol === "admin");
    }

    revisar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      try {
        sessionStorage.removeItem(CLAVE);
      } catch {}
      revisar();
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
