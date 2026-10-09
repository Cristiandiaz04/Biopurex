import type { Metadata } from "next";
import { FormularioRecuperar } from "@/components/cuenta/formulario-recuperar";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };

export default function Recuperar() {
  return (
    <main className="flex min-h-[70vh] justify-center bg-surface px-4 py-[clamp(32px,6vw,72px)]">
      <FormularioRecuperar />
    </main>
  );
}
