import { Suspense } from "react";
import { TablaPedidos } from "@/components/admin/tabla-pedidos";
import { TituloPagina } from "@/components/admin/ui";
import { listarPedidosAdmin } from "@/lib/datos/admin";

export const metadata = { title: "Pedidos" };

async function Pedidos() {
  const filas = await listarPedidosAdmin();
  const porConfirmar = filas.filter((f) => f.estado === "esperando_pago" || f.estado === "pago_en_revision").length;
  return (
    <>
      <TituloPagina titulo="Pedidos" sub={`${filas.length} pedidos · ${porConfirmar} por confirmar`} />
      <TablaPedidos filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Pedidos />
    </Suspense>
  );
}
