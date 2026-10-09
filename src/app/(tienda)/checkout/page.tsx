import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioCheckout } from "@/components/tienda/formulario-checkout";
import { Cargando } from "@/components/ui/cargando";
import { obtenerConfiguracion, obtenerZonas } from "@/lib/datos/catalogo";
import { obtenerDirecciones, obtenerPerfil } from "@/lib/datos/cuenta";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };

async function Checkout() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/checkout");
  const [direcciones, conf, zonas] = await Promise.all([obtenerDirecciones(), obtenerConfiguracion(), obtenerZonas()]);
  return <FormularioCheckout perfil={perfil} direcciones={direcciones} conf={conf} zonas={zonas} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <Checkout />
    </Suspense>
  );
}
