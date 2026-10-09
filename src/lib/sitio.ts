import type { Producto } from "@/lib/catalogo";

/**
 * Dirección pública del sitio (para URLs canónicas, sitemap y datos estructurados).
 * En Vercel sale del dominio de producción; los links de prueba apuntan igual a producción.
 */
export const SITIO = (
  process.env.SITIO_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const absoluta = (ruta: string) => (ruta.startsWith("http") ? ruta : `${SITIO}${ruta.startsWith("/") ? "" : "/"}${ruta}`);

/** Datos reales del negocio (los mismos del pie de página). */
export const NEGOCIO = {
  nombre: "BIOPUREX",
  telefono: "+504 8936-1277",
  correo: "mibiopurex@gmail.com",
  instagram: "https://instagram.com/biopurex_",
  ciudad: "San Pedro Sula",
  departamento: "Cortés",
};

/** JSON para <script type="application/ld+json">, sin permitir que el contenido cierre la etiqueta. */
export const jsonLd = (dato: object) => JSON.stringify(dato).replace(/</g, "\\u003c");

export function datosOrganizacion() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: NEGOCIO.nombre,
    url: SITIO,
    logo: absoluta("/img/logo.png"),
    email: NEGOCIO.correo,
    sameAs: [NEGOCIO.instagram],
    address: { "@type": "PostalAddress", addressLocality: NEGOCIO.ciudad, addressRegion: NEGOCIO.departamento, addressCountry: "HN" },
    contactPoint: { "@type": "ContactPoint", telephone: NEGOCIO.telefono, contactType: "customer service", areaServed: "HN", availableLanguage: "es" },
  };
}

/**
 * Producto (Schema.org) solo con datos reales: sin reseñas, valoraciones ni disponibilidad inventada.
 * Sin precio (productos por cotización) no se incluye la oferta.
 */
export function datosProducto(p: Producto) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.desc || undefined,
    sku: p.codigo || undefined,
    category: p.catNombre || undefined,
    brand: { "@type": "Brand", name: NEGOCIO.nombre },
    image: [...new Set(p.variantes.map((v) => absoluta(v.img)))],
    url: absoluta(`/producto/${p.slug}`),
    ...(p.precio != null && !p.cotizar
      ? { offers: { "@type": "Offer", price: p.precio.toFixed(2), priceCurrency: "HNL", url: absoluta(`/producto/${p.slug}`), seller: { "@type": "Organization", name: NEGOCIO.nombre } } }
      : {}),
  };
}

export function migasProducto(p: Producto) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: absoluta("/") },
      { "@type": "ListItem", position: 2, name: "Tienda", item: absoluta("/catalogo") },
      ...(p.catNombre ? [{ "@type": "ListItem", position: 3, name: p.catNombre, item: absoluta(`/catalogo?cat=${p.cat}`) }] : []),
      { "@type": "ListItem", position: p.catNombre ? 4 : 3, name: p.nombre, item: absoluta(`/producto/${p.slug}`) },
    ],
  };
}

/** Descripción para buscadores: 155 caracteres como máximo, sin cortar palabras. */
export function resumen(texto: string, max = 155) {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,.;:]$/, "") + "…";
}
