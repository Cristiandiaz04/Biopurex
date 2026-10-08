import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FichaProducto } from "@/components/tienda/ficha-producto";
import { PRODUCTOS, productoPorSlug, relacionados, type Producto } from "@/lib/catalogo";

export function generateStaticParams() {
  return PRODUCTOS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) return {};
  return { title: p.nombre, description: p.desc || `${p.nombre} — BIOPUREX` };
}

/** Lee ?aroma= en tiempo de request; la ficha base (sin aroma) va en el shell estático. */
async function FichaConAroma({ producto, searchParams }: { producto: Producto; searchParams: PageProps<"/producto/[slug]">["searchParams"] }) {
  const { aroma } = await searchParams;
  return (
    <FichaProducto
      key={producto.slug}
      producto={producto}
      claveInicial={typeof aroma === "string" ? aroma : null}
      relacionados={relacionados(producto)}
    />
  );
}

export default async function Producto({ params, searchParams }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const p = productoPorSlug(slug);
  if (!p) notFound();
  return (
    <Suspense fallback={<FichaProducto key={p.slug} producto={p} claveInicial={null} relacionados={relacionados(p)} />}>
      <FichaConAroma producto={p} searchParams={searchParams} />
    </Suspense>
  );
}
