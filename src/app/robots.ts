import type { MetadataRoute } from "next";

/** Que los buscadores indexen la tienda, no el panel ni las páginas privadas del cliente. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cuenta", "/pedidos", "/checkout", "/auth", "/ingresar", "/recuperar"] },
  };
}
