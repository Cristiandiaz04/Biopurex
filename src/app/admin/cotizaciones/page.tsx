import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { TablaCotizaciones } from "@/components/admin/cotizaciones";
import { boton, TituloPagina } from "@/components/admin/ui";
import { listarCotizaciones } from "@/lib/datos/admin-docs";

export const metadata = { title: "Cotizaciones" };

async function Cotizaciones() {
  const filas = await listarCotizaciones();
  return (
    <>
      <TituloPagina titulo="Cotizaciones" sub="Imprímelas para el cliente y conviértelas en pedido cuando acepte.">
        <Link href="/admin/cotizaciones/nueva" className={`${boton.primario} no-underline`}>
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          Nueva cotización
        </Link>
      </TituloPagina>
      <TablaCotizaciones filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Cotizaciones />
    </Suspense>
  );
}
