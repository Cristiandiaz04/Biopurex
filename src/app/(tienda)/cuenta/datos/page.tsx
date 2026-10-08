import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioDatos } from "@/components/cuenta/formularios-cuenta";
import { MarcoCuenta } from "@/components/cuenta/marco-cuenta";
import { Cargando } from "@/components/ui/cargando";
import { obtenerPerfil } from "@/lib/datos/cuenta";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Datos personales" };

async function Datos() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/ingresar?siguiente=/cuenta/datos");
  const { data } = await (await createClient()).from("perfiles").select("rtn").eq("id", perfil.id).single();
  return (
    <MarcoCuenta perfil={perfil} activo="/cuenta/datos">
      <FormularioDatos perfil={perfil} rtn={data?.rtn ?? null} />
    </MarcoCuenta>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <Datos />
    </Suspense>
  );
}
