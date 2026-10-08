import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Direcciones } from "@/components/cuenta/direcciones";
import { MarcoCuenta } from "@/components/cuenta/marco-cuenta";
import { Cargando } from "@/components/ui/cargando";
import { obtenerDirecciones, obtenerPerfil } from "@/lib/datos/cuenta";

export const metadata: Metadata = { title: "Mi cuenta" };

async function Cuenta() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/cuenta");
  const direcciones = await obtenerDirecciones();
  return (
    <MarcoCuenta perfil={perfil} activo="/cuenta">
      <Direcciones direcciones={direcciones} nombre={perfil.nombre} />
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
