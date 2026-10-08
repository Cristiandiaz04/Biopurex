import { Suspense } from "react";
import { TablaFacturas } from "@/components/admin/facturas";
import { TituloPagina } from "@/components/admin/ui";
import { listarFacturas } from "@/lib/datos/admin-docs";

export const metadata = { title: "Facturas" };

async function Facturas() {
  const filas = await listarFacturas();
  return (
    <>
      <TituloPagina titulo="Facturas" sub="Sin CAI · numeración interna. Se emiten desde el detalle de un pedido confirmado." />
      <TablaFacturas filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Facturas />
    </Suspense>
  );
}
