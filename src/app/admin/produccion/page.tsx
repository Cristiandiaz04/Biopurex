import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, FlaskConical } from "lucide-react";
import { FormularioProduccion } from "@/components/admin/formulario-produccion";
import { boton, CabeceraTarjeta, fechaCorta, PuntoAroma, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { listarMaterias, listarProducciones, listarRecetas, variantesFabricables } from "@/lib/datos/produccion";
import { lempiras } from "@/lib/formato";
import { cantidad } from "@/lib/unidades";

export const metadata = { title: "Producción" };

async function Produccion({ searchParams }: { searchParams: PageProps<"/admin/produccion">["searchParams"] }) {
  const [sp, variantes, recetas, materias, historial] = await Promise.all([searchParams, variantesFabricables(), listarRecetas(), listarMaterias(), listarProducciones()]);
  const porVariante = new Map(variantes.map((v) => [v.id, v]));
  const porMateria = new Map(materias.map((m) => [m.id, m]));

  return (
    <>
      <TituloPagina titulo="Producción" sub="Registra lo que fabricaste: se suma a la tienda y se descuenta la materia prima según la regla de creación.">
        <Link href="/admin/materia-prima" className={`${boton.secundario} no-underline`}>
          <FlaskConical size={16} aria-hidden />
          Materia prima
        </Link>
        <Link href="/admin/produccion/reglas" className={`${boton.secundario} no-underline`}>
          <BookOpen size={16} aria-hidden />
          Reglas de creación
        </Link>
      </TituloPagina>
      <FormularioProduccion variantes={variantes} recetas={recetas} materias={materias} inicial={typeof sp.variante === "string" ? sp.variante : ""} />
      <Tarjeta className="mt-4 overflow-hidden">
        <CabeceraTarjeta titulo="Historial de producción" />
        {historial.length === 0 ? (
          <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Todavía no registras producciones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead><tr><th className={th}>Producción</th><th className={th}>Fecha</th><th className={th}>Producto</th><th className={`${th} text-right`}>Unidades</th><th className={th}>Materia prima usada</th><th className={`${th} text-right`}>Costo / u.</th></tr></thead>
              <tbody>
                {historial.map((p) => {
                  const v = porVariante.get(p.varianteId);
                  return (
                    <tr key={p.id}>
                      <td className={`${td} whitespace-nowrap font-bold`}>{p.codigo}</td>
                      <td className={`${td} whitespace-nowrap text-[13px]`}>{fechaCorta(p.creadoEn, true)}</td>
                      <td className={td}>
                        <div className="font-semibold">{v?.producto ?? "Producto"}</div>
                        <div className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v?.aroma ?? null} />{v?.etiqueta}{p.nota ? ` · ${p.nota}` : ""}</div>
                      </td>
                      <td className={`${td} text-right font-semibold tabular-nums text-success`}>+{p.cantidad}</td>
                      <td className={`${td} text-[13px] text-text-2`}>
                        {p.consumos.map((c) => {
                          const m = porMateria.get(c.materiaId);
                          return m ? `${m.nombre} ${cantidad(c.cantidad, m.unidad)}` : "";
                        }).join(" · ")}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{p.costoUnitario == null ? "—" : lempiras(p.costoUnitario)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/admin/produccion">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Produccion searchParams={searchParams} />
    </Suspense>
  );
}
