import type { MetadataRoute } from "next";
import { absoluta } from "@/lib/sitio";

/** Que los buscadores indexen la tienda, no el panel ni las páginas privadas del cliente. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/cuenta", "/pedidos", "/checkout", "/auth", "/ingresar", "/recuperar"],
    },
    sitemap: absoluta("/sitemap.xml"),
  };
}
