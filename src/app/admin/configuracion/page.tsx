import { Suspense } from "react";
import { FormularioConfiguracion } from "@/components/admin/formulario-configuracion";
import { TituloPagina } from "@/components/admin/ui";
import { configuracionAdmin } from "@/lib/datos/admin-docs";

export const metadata = { title: "Configuración" };

async function Configuracion() {
  const c = await configuracionAdmin();
  return (
    <>
      <TituloPagina titulo="Configuración" sub="Datos de la empresa, cuenta bancaria y costos de envío." />
      <FormularioConfiguracion inicial={c} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Configuracion />
    </Suspense>
  );
}
