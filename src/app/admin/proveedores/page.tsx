import { Suspense } from "react";
import { BotonProveedor, TablaProveedores } from "@/components/admin/proveedores";
import { TituloPagina } from "@/components/admin/ui";
import { listarProveedores } from "@/lib/datos/admin-docs";

export const metadata = { title: "Proveedores" };

async function Proveedores() {
  const filas = await listarProveedores();
  return (
    <>
      <TituloPagina titulo="Proveedores" sub={`${filas.length} proveedores`}>
        <BotonProveedor />
      </TituloPagina>
      <TablaProveedores filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Proveedores />
    </Suspense>
  );
}
