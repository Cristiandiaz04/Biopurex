import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioAcceso } from "@/components/cuenta/formulario-acceso";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false, follow: false } };

export default function Ingresar() {
  return (
    <main className="flex min-h-[70vh] justify-center bg-surface px-4 py-[clamp(32px,6vw,72px)]">
      <Suspense>
        <FormularioAcceso />
      </Suspense>
    </main>
  );
}
