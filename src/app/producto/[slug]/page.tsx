import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FichaProducto } from "@/components/tienda/ficha-producto";
import { relacionados, type Producto } from "@/lib/catalogo";
import { obtenerProductos } from "@/lib/datos/catalogo";

export async function generateStaticParams() {
  return (await obtenerProductos()).map((p) => ({ slug: p.slug }));
}

async function buscar(slug: string) {
  const productos = await obtenerProductos();
  const p = productos.find((x) => x.slug === slug);
  return p ? { p, rel: relacionados(p, productos) } : null;
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const r = await buscar((await params).slug);
  if (!r) return {};
  return { title: r.p.nombre, description: r.p.desc || `${r.p.nombre} — BIOPUREX` };
}

/** Lee ?aroma= en tiempo de request; la ficha base (sin aroma) va en el shell estático. */
async function FichaConAroma({
  producto,
  rel,
  searchParams,
}: {
  producto: Producto;
  rel: Producto[];
  searchParams: PageProps<"/producto/[slug]">["searchParams"];
}) {
  const { aroma } = await searchParams;
  return <FichaProducto key={producto.slug} producto={producto} claveInicial={typeof aroma === "string" ? aroma : null} relacionados={rel} />;
}

export default async function Pagina({ params, searchParams }: PageProps<"/producto/[slug]">) {
  const r = await buscar((await params).slug);
  if (!r) notFound();
  return (
    <Suspense fallback={<FichaProducto key={r.p.slug} producto={r.p} claveInicial={null} relacionados={r.rel} />}>
      <FichaConAroma producto={r.p} rel={r.rel} searchParams={searchParams} />
    </Suspense>
  );
}
