import type { MetadataRoute } from "next";
import { obtenerCategorias, obtenerProductos } from "@/lib/datos/catalogo";
import { absoluta } from "@/lib/sitio";

/** Páginas públicas para Google: inicio, tienda, categorías, fichas de producto y páginas informativas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, categorias] = await Promise.all([obtenerProductos(), obtenerCategorias()]);
  const conProductos = categorias.filter((c) => productos.some((p) => p.cat === c.id));
  return [
    { url: absoluta("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluta("/catalogo"), changeFrequency: "weekly", priority: 0.9 },
    ...conProductos.map((c) => ({ url: absoluta(`/catalogo?cat=${c.id}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...productos.map((p) => ({
      url: absoluta(`/producto/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [...new Set(p.variantes.map((v) => absoluta(v.img)))],
    })),
    { url: absoluta("/envios"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluta("/privacidad"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
