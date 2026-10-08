import { Suspense } from "react";
import { BotonMunicipio, EnvioGratis, TarjetaMunicipio } from "@/components/admin/envios";
import { TituloPagina, Vacio } from "@/components/admin/ui";
import { listarZonasAdmin } from "@/lib/datos/admin-docs";

export const metadata = { title: "Zonas de envío" };

async function Envios() {
  const { municipios, gratisDesde } = await listarZonasAdmin();
  const activos = municipios.filter((m) => m.activo).length;
  return (
    <>
      <TituloPagina titulo="Zonas de envío" sub={`Los clientes solo pueden elegir estos municipios · ${activos} ${activos === 1 ? "municipio activo" : "municipios activos"}`}>
        <BotonMunicipio />
      </TituloPagina>
      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1180px]:grid-cols-1 min-[1440px]:grid-cols-2">
          {municipios.length === 0 ? (
            <Vacio titulo="Sin zonas de entrega" texto="Agrega un municipio para que los clientes puedan comprar." />
          ) : (
            municipios.map((m) => <TarjetaMunicipio key={m.id} municipio={m} />)
          )}
        </div>
        <EnvioGratis desde={gratisDesde} />
      </div>
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Envios />
    </Suspense>
  );
}
