import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorRegla } from "@/components/admin/reglas";
import { PuntoAroma, TituloPagina } from "@/components/admin/ui";
import { listarMaterias, listarRecetas, variantesFabricables } from "@/lib/datos/produccion";

export const metadata = { title: "Regla de creación" };

async function Regla({ params }: { params: PageProps<"/admin/produccion/reglas/[varianteId]">["params"] }) {
  const { varianteId } = await params;
  const [variantes, recetas, materias] = await Promise.all([variantesFabricables(), listarRecetas(), listarMaterias()]);
  const v = variantes.find((x) => x.id === varianteId);
  if (!v) notFound();
  const porId = new Map(variantes.map((x) => [x.id, x]));
  const receta = recetas.find((r) => r.varianteId === v.id) ?? null;
  const otras = recetas
    .filter((r) => r.varianteId !== v.id && porId.has(r.varianteId))
    .map((r) => {
      const o = porId.get(r.varianteId)!;
      return { varianteId: r.varianteId, label: o.etiqueta === o.producto ? o.producto : `${o.producto} · ${o.etiqueta}`, receta: r };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/produccion/reglas", label: "Reglas de creación" }}
        titulo={
          <span className="flex items-center gap-4">
            <span className="flex size-[72px] flex-none items-center justify-center rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.img} alt="" className="size-[60px] object-contain" />
            </span>
            {v.producto}
          </span>
        }
        sub={
          <span className="flex items-center gap-1.5">
            <PuntoAroma aroma={v.aroma} />
            {v.etiqueta} · {v.sku} · stock {v.stock}
          </span>
        }
      />
      <EditorRegla key={v.id} variante={v} receta={receta} materias={materias} otras={otras} />
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/produccion/reglas/[varianteId]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Regla params={params} />
    </Suspense>
  );
}
