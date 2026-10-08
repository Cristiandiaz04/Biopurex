import { Suspense } from "react";
import { TablaClientes } from "@/components/admin/tabla-clientes";
import { TituloPagina } from "@/components/admin/ui";
import { listarClientes } from "@/lib/datos/admin";

export const metadata = { title: "Clientes" };

async function Clientes() {
  const filas = await listarClientes();
  return (
    <>
      <TituloPagina
        titulo="Clientes"
        sub="La etiqueta define cómo queda cada pedido: Normal espera la transferencia; Crédito y Contra entrega quedan confirmados."
      />
      <TablaClientes filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Clientes />
    </Suspense>
  );
}
