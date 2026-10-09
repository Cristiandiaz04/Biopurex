import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaPedidos } from "@/components/pedidos/vista-pedidos";
import { Cargando } from "@/components/ui/cargando";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false, follow: false } };

export default function Pedidos() {
  return (
    <Suspense fallback={<Cargando />}>
      <VistaPedidos />
    </Suspense>
  );
}
