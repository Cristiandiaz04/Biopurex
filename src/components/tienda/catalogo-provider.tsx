"use client";

import { createContext, useContext, useMemo } from "react";
import type { Producto } from "@/lib/catalogo";

type Ctx = {
  productos: Producto[];
  porSlug: (slug: string) => Producto | undefined;
  envio: { sps: number; resto: number };
};

const CatalogoCtx = createContext<Ctx | null>(null);

/** Entrega a los componentes de cliente el catálogo que el layout leyó (cacheado) de Supabase. */
export function CatalogoProvider({
  productos,
  envio,
  children,
}: {
  productos: Producto[];
  envio: { sps: number; resto: number };
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
