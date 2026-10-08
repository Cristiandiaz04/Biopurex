import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { TablaCompras } from "@/components/admin/tabla-compras";
import { boton, TituloPagina } from "@/components/admin/ui";
import { listarCompras } from "@/lib/datos/admin-docs";

export const metadata = { title: "Compras a proveedor" };

async function Compras() {
  const filas = await listarCompras();
  return (
    <>
      <TituloPagina titulo="Compras a proveedor" sub="Al confirmar una compra, cada línea entra al inventario de su variante.">
        <Link href="/admin/compras/nueva" className={`${boton.primario} no-underline`}>
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          Nueva compra
        </Link>
      </TituloPagina>
      <TablaCompras filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Compras />
    </Suspense>
  );
}
