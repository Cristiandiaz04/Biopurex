"use client";

import { createContext, useContext, useMemo } from "react";
import type { Producto } from "@/lib/catalogo";

/** Resumen del envío para la tienda: costo más bajo, mínimo del envío gratis y municipios con entrega. */
export type ResumenEnvio = { desde: number | null; gratisDesde: number | null; zonas: string[] };

type Ctx = {
  productos: Producto[];
  porSlug: (slug: string) => Producto | undefined;
  envio: ResumenEnvio;
};

const CatalogoCtx = createContext<Ctx | null>(null);

/** Entrega a los componentes de cliente el catálogo que el layout leyó (cacheado) de Supabase. */
export function CatalogoProvider({
  productos,
  envio,
  children,
}: {
  productos: Producto[];
  envio: ResumenEnvio;
  children: React.ReactNode;
}) {
  const valor = useMemo<Ctx>(() => {
    const mapa = new Map(productos.map((p) => [p.slug, p]));
    return { productos, porSlug: (s) => mapa.get(s), envio };
  }, [productos, envio]);
  return <CatalogoCtx.Provider value={valor}>{children}</CatalogoCtx.Provider>;
}

export function useCatalogo() {
  const ctx = useContext(CatalogoCtx);
  if (!ctx) throw new Error("useCatalogo fuera de CatalogoProvider");
  return ctx;
}
