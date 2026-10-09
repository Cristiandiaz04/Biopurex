import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Direcciones } from "@/components/cuenta/direcciones";
import { MarcoCuenta } from "@/components/cuenta/marco-cuenta";
import { Cargando } from "@/components/ui/cargando";
import { obtenerZonas } from "@/lib/datos/catalogo";
import { obtenerDirecciones, obtenerPerfil } from "@/lib/datos/cuenta";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

async function Cuenta() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/cuenta");
  const [direcciones, zonas] = await Promise.all([obtenerDirecciones(), obtenerZonas()]);
  return (
    <MarcoCuenta perfil={perfil} activo="/cuenta">
      <Direcciones direcciones={direcciones} nombre={perfil.nombre} municipios={zonas.municipios} />
    </MarcoCuenta>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <Cuenta />
    </Suspense>
  );
}
