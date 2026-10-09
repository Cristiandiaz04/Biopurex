import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioContrasena } from "@/components/cuenta/formularios-cuenta";
import { MarcoCuenta } from "@/components/cuenta/marco-cuenta";
import { Cargando } from "@/components/ui/cargando";
import { obtenerPerfil } from "@/lib/datos/cuenta";

export const metadata: Metadata = { title: "Contraseña", robots: { index: false, follow: false } };

async function Contrasena() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/cuenta/contrasena");
  return (
    <MarcoCuenta perfil={perfil} activo="/cuenta/contrasena">
      <FormularioContrasena />
    </MarcoCuenta>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contrasena />
    </Suspense>
  );
}
