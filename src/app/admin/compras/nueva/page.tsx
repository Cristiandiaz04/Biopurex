import { Suspense } from "react";
import { FormularioCompra } from "@/components/admin/formulario-compra";
import { TituloPagina } from "@/components/admin/ui";
import { listarProveedores, opcionesVariantes } from "@/lib/datos/admin-docs";

export const metadata = { title: "Nueva compra" };

async function Nueva({ searchParams }: { searchParams: PageProps<"/admin/compras/nueva">["searchParams"] }) {
  const [sp, proveedores, opciones] = await Promise.all([searchParams, listarProveedores(), opcionesVariantes()]);
  const prov = typeof sp.proveedor === "string" ? sp.proveedor : "";
  const variante = typeof sp.variante === "string" ? sp.variante : "";
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
  return (
    <>
      <TituloPagina volver={{ href: "/admin/compras", label: "Compras" }} titulo="Nueva compra" />
      <FormularioCompra
        proveedores={proveedores.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre }))}
        opciones={opciones}
        hoy={hoy}
        inicial={prov || variante ? { id: "", proveedorId: prov, facturaProveedor: null, fecha: hoy, notas: null, lineas: variante ? [{ varianteId: variante, cantidad: 1, costo: opciones.find((o) => o.id === variante)?.costo ?? 0 }] : [] } : undefined}
      />
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/admin/compras/nueva">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Nueva searchParams={searchParams} />
    </Suspense>
  );
}
