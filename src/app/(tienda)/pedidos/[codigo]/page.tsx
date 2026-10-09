import type { Metadata } from "next";
import { Suspense } from "react";
import { VistaPedidos } from "@/components/pedidos/vista-pedidos";
import { Cargando } from "@/components/ui/cargando";

export const metadata: Metadata = { title: "Mi pedido", robots: { index: false, follow: false } };

async function Detalle({ params }: { params: PageProps<"/pedidos/[codigo]">["params"] }) {
  const { codigo } = await params;
  return <VistaPedidos codigo={decodeURIComponent(codigo).toUpperCase()} />;
}

export default function Pagina({ params }: PageProps<"/pedidos/[codigo]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Detalle params={params} />
    </Suspense>
  );
}
