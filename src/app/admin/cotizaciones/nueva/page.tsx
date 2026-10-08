import { Suspense } from "react";
import { FormularioCotizacion } from "@/components/admin/cotizaciones";
import { TituloPagina } from "@/components/admin/ui";
import { listarClientes } from "@/lib/datos/admin";
import { opcionesVariantes } from "@/lib/datos/admin-docs";

export const metadata = { title: "Nueva cotización" };

async function Nueva({ searchParams }: { searchParams: PageProps<"/admin/cotizaciones/nueva">["searchParams"] }) {
  const [sp, clientes, opciones] = await Promise.all([searchParams, listarClientes(), opcionesVariantes()]);
  return (
    <>
      <TituloPagina volver={{ href: "/admin/cotizaciones", label: "Cotizaciones" }} titulo="Nueva cotización" />
      <FormularioCotizacion
        clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo }))}
        opciones={opciones.filter((o) => o.precio != null)}
        clienteInicial={typeof sp.cliente === "string" ? sp.cliente : ""}
      />
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/admin/cotizaciones/nueva">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Nueva searchParams={searchParams} />
    </Suspense>
  );
}
