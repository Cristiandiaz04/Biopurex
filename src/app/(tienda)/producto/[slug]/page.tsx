import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FichaProducto } from "@/components/tienda/ficha-producto";
import { relacionados, type Producto } from "@/lib/catalogo";
import { obtenerProductos } from "@/lib/datos/catalogo";
import { absoluta, datosProducto, jsonLd, migasProducto, resumen } from "@/lib/sitio";

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
  const { p } = r;
  const descripcion = resumen(p.desc || `${p.nombre} de BIOPUREX, productos de limpieza hechos en San Pedro Sula.`);
  const imagen = absoluta(p.variantes[0].img);
  return {
    title: p.nombre,
    description: descripcion,
    // ?aroma= cambia solo el aroma mostrado: la página canónica es la del producto.
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { title: `${p.nombre} · BIOPUREX`, description: descripcion, url: `/producto/${p.slug}`, images: [{ url: imagen, alt: p.nombre }] },
    twitter: { card: "summary_large_image", title: `${p.nombre} · BIOPUREX`, description: descripcion, images: [imagen] },
  };
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datosProducto(r.p)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(migasProducto(r.p)) }} />
    <Suspense fallback={<FichaProducto key={r.p.slug} producto={r.p} claveInicial={null} relacionados={r.rel} />}>
      <FichaConAroma producto={r.p} rel={r.rel} searchParams={searchParams} />
    </Suspense>
    </>
  );
}
