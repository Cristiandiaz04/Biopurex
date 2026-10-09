import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogoVista } from "@/components/tienda/catalogo-vista";
import { obtenerCategorias } from "@/lib/datos/catalogo";

const GENERAL = "Productos de limpieza BIOPUREX: limpieza del hogar, lavandería, cocina, grado alimenticio, aromatizantes y línea automotriz. Compra en línea.";

export async function generateMetadata({ searchParams }: PageProps<"/catalogo">): Promise<Metadata> {
  const sp = await searchParams;
  const cat = typeof sp.cat === "string" ? (await obtenerCategorias()).find((c) => c.id === sp.cat) : undefined;
  // Búsquedas, filtros de aroma/presentación y orden: resultados internos, no se indexan.
  const filtrado = ["q", "aroma", "tam", "orden", "todos"].some((k) => sp[k] !== undefined);
  if (cat && !filtrado) {
    return {
      title: cat.nombre,
      description: `${cat.nombre}: productos de limpieza BIOPUREX hechos en San Pedro Sula. Compra en línea.`,
      alternates: { canonical: `/catalogo?cat=${cat.id}` },
      openGraph: { title: `${cat.nombre} · BIOPUREX`, url: `/catalogo?cat=${cat.id}` },
    };
  }
  return {
    title: "Tienda",
    description: GENERAL,
    alternates: { canonical: "/catalogo" },
    ...(filtrado || sp.cat !== undefined ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function Catalogo() {
  return (
    <Suspense>
      <CatalogoVista />
    </Suspense>
  );
}
