import Link from "next/link";
import { Suspense } from "react";
import { Truck } from "lucide-react";
import { BotonMateria, TablaMaterias } from "@/components/admin/materia-prima";
import { boton, TituloPagina } from "@/components/admin/ui";
import { listarMaterias } from "@/lib/datos/produccion";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Materia prima" };

async function Materias() {
  const filas = await listarMaterias();
  const valor = filas.reduce((s, m) => s + (m.costo ?? 0) * m.stock, 0);
  const bajas = filas.filter((m) => m.activo && m.stock <= m.minimo).length;
  return (
    <>
      <TituloPagina titulo="Materia prima" sub={`${filas.length} materias · ${lempiras(valor)} en inventario al costo · ${bajas} con stock bajo`}>
        <Link href="/admin/compras/nueva" className={`${boton.secundario} no-underline`}>
          <Truck size={16} aria-hidden />
          Comprar
        </Link>
        <BotonMateria />
      </TituloPagina>
      <TablaMaterias filas={filas} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Materias />
    </Suspense>
  );
}
