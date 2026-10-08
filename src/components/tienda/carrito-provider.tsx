"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AROMAS, productoPorSlug, type Producto, type Variante } from "@/lib/catalogo";

export type ItemCarrito = { slug: string; clave: string; cantidad: number };

export type LineaCarrito = ItemCarrito & { producto: Producto; variante: Variante; total: number };

type Ctx = {
  lineas: LineaCarrito[];
  cantidad: number;
  subtotal: number;
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  agregar: (slug: string, clave: string, cantidad: number) => void;
  cambiar: (slug: string, clave: string, delta: number) => void;
  quitar: (slug: string, clave: string) => void;
  aviso: string | null;
  avisar: (msg: string) => void;
};

const CarritoCtx = createContext<Ctx | null>(null);

// El carrito vive en el navegador (localStorage) hasta que exista sesión (fase 2).
// Store externo + useSyncExternalStore: sin desajustes de hidratación y sincronizado entre pestañas.
const CLAVE_STORAGE = "bpx-carrito";
const VACIO: ItemCarrito[] = [];
const oyentes = new Set<() => void>();
let cache: ItemCarrito[] | null = null;

function leer(): ItemCarrito[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(CLAVE_STORAGE) ?? "[]");
    cache = Array.isArray(raw) ? raw : VACIO;
  } catch {
    cache = VACIO;
  }
  return cache;
}

function escribir(items: ItemCarrito[]) {
  cache = items;
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  } catch {}
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  oyentes.add(o);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CLAVE_STORAGE) return;
    cache = null;
    o();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    oyentes.delete(o);
    window.removeEventListener("storage", onStorage);
  };
}

const setItems = (f: (prev: ItemCarrito[]) => ItemCarrito[]) => escribir(f(leer()));

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(suscribir, leer, () => VACIO);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const avisar = useCallback((msg: string) => {
    clearTimeout(timer.current);
    setAviso(msg);
    timer.current = setTimeout(() => setAviso(null), 2600);
  }, []);

  const agregar = useCallback(
    (slug: string, clave: string, cantidad: number) => {
      const p = productoPorSlug(slug);
      if (!p) return;
      setItems((prev) => {
        const i = prev.findIndex((x) => x.slug === slug && x.clave === clave);
        if (i < 0) return [...prev, { slug, clave, cantidad }];
        const copia = [...prev];
        copia[i] = { ...copia[i], cantidad: Math.min(99, copia[i].cantidad + cantidad) };
        return copia;
      });
      const v = p.variantes.find((x) => x.clave === clave);
      avisar(`Agregado al carrito: ${p.nombre}${v?.aroma ? " · " + AROMAS[v.aroma] : ""}`);
    },
    [avisar],
  );

  const cambiar = useCallback((slug: string, clave: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((x) => (x.slug === slug && x.clave === clave ? { ...x, cantidad: Math.min(99, x.cantidad + delta) } : x))
        .filter((x) => x.cantidad > 0),
    );
  }, []);

  const quitar = useCallback((slug: string, clave: string) => {
    setItems((prev) => prev.filter((x) => !(x.slug === slug && x.clave === clave)));
  }, []);

  const valor = useMemo<Ctx>(() => {
    const lineas = items.flatMap((it) => {
      const producto = productoPorSlug(it.slug);
      const variante = producto?.variantes.find((x) => x.clave === it.clave);
      if (!producto || !variante) return [];
      return [{ ...it, producto, variante, total: (producto.precio ?? 0) * it.cantidad }];
    });
    return {
      lineas,
      cantidad: lineas.reduce((s, x) => s + x.cantidad, 0),
      subtotal: lineas.reduce((s, x) => s + x.total, 0),
      abierto,
      abrir: () => setAbierto(true),
      cerrar: () => setAbierto(false),
      agregar,
      cambiar,
      quitar,
      aviso,
      avisar,
    };
  }, [items, abierto, agregar, cambiar, quitar, aviso, avisar]);

  return <CarritoCtx.Provider value={valor}>{children}</CarritoCtx.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoCtx);
  if (!ctx) throw new Error("useCarrito fuera de CarritoProvider");
  return ctx;
}
