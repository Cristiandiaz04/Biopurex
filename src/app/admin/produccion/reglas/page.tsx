import Link from "next/link";
import { Suspense } from "react";
import { Factory } from "lucide-react";
import { TablaReglas } from "@/components/admin/reglas";
import { boton, TituloPagina } from "@/components/admin/ui";
import { listarMaterias, listarRecetas, variantesFabricables } from "@/lib/datos/produccion";

export const metadata = { title: "Reglas de creación" };

async function Reglas() {
  const [variantes, recetas, materias] = await Promise.all([variantesFabricables(), listarRecetas(), listarMaterias()]);
  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/produccion", label: "Producción" }}
        titulo="Reglas de creación"
        sub="Qué materia prima lleva una producción de cada producto y cuántas unidades salen. Los artículos que se compran hechos (escobas, dispensadores) no necesitan regla."
      >
        <Link href="/admin/produccion" className={`${boton.primario} no-underline`}>
          <Factory size={16} aria-hidden />
          Registrar producción
        </Link>
      </TituloPagina>
      <TablaReglas variantes={variantes.filter((v) => !["articulos", "dispensadores"].includes(v.categoria))} recetas={recetas} materias={materias} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Reglas />
    </Suspense>
  );
}
