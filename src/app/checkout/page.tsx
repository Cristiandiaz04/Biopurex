import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioCheckout } from "@/components/tienda/formulario-checkout";
import { Cargando } from "@/components/ui/cargando";
import { obtenerConfiguracion } from "@/lib/datos/catalogo";
import { obtenerDirecciones, obtenerPerfil } from "@/lib/datos/cuenta";

export const metadata: Metadata = { title: "Finalizar compra" };

async function Checkout() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/checkout");
  const [direcciones, conf] = await Promise.all([obtenerDirecciones(), obtenerConfiguracion()]);
  return <FormularioCheckout perfil={perfil} direcciones={direcciones} conf={conf} />;
}

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <Checkout />
    </Suspense>
  );
}
