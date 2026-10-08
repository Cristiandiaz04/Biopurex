import type { Metadata } from "next";
import { Suspense } from "react";
import { MarcoAdmin } from "@/components/admin/marco-admin";
import { exigirAdmin } from "@/lib/datos/admin";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel BIOPUREX" }, robots: { index: false } };

async function ConAdmin({ children }: { children: React.ReactNode }) {
  const { supabase, perfil } = await exigirAdmin();
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .in("estado", ["esperando_pago", "pago_en_revision"]);
  return (
    <MarcoAdmin nombre={perfil.nombre} pendientes={count ?? 0}>
      {children}
    </MarcoAdmin>
  );
}

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-surface" aria-busy="true" />}>
      <ConAdmin>{children}</ConAdmin>
    </Suspense>
  );
}
