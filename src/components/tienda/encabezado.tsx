"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Package, Search, ShoppingBag, User } from "lucide-react";
import { categoria, type CategoriaId } from "@/lib/catalogo";
import { useCarrito } from "./carrito-provider";

const NAV: CategoriaId[] = ["hogar", "lavanderia", "cocina", "auto", "articulos"];

function NavCategorias() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const activa = pathname === "/catalogo" ? sp.get("cat") : null;
  return (
    <nav aria-label="Categorías" className="hidden items-center gap-1 min-[1180px]:flex">
      {NAV.map((id) => (
        <Link
          key={id}
          href={`/catalogo?cat=${id}`}
          className="relative flex h-11 items-center whitespace-nowrap rounded-sm px-3 text-sm font-semibold text-navy no-underline hover:bg-surface"
        >
          {categoria(id).corto}
          <span
            className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-sm bg-green transition-opacity"
            style={{ opacity: activa === id ? 1 : 0 }}
          />
        </Link>
      ))}
    </nav>
  );
}

function Buscador({ movil }: { movil?: boolean }) {
  const sp = useSearchParams();
  return (
    <form
      action="/catalogo"
      role="search"
      className={
        movil
          ? "flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-text-2"
          : "ml-auto flex h-11 max-w-[400px] flex-1 items-center gap-2 rounded-full border border-line bg-surface px-4 text-text-2"
      }
    >
      <Search size={20} strokeWidth={2} aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={sp.get("q") ?? ""}
        placeholder={movil ? "Buscar productos" : "Buscar desinfectante, cloro, shampoo…"}
        aria-label="Buscar productos"
        className="min-w-0 flex-1 bg-transparent text-base text-navy outline-none placeholder:text-text-2 min-[900px]:text-[15px]"
      />
    </form>
  );
}

function BotonCarrito({ movil }: { movil?: boolean }) {
  const { cantidad, abrir } = useCarrito();
  if (movil)
    return (
      <button
        type="button"
        onClick={abrir}
        aria-label={`Abrir carrito, ${cantidad} productos`}
        className="relative flex size-11 items-center justify-center rounded-full text-navy hover:bg-surface"
      >
        <ShoppingBag size={20} strokeWidth={2} aria-hidden />
        {cantidad > 0 && (
          <span className="absolute right-0.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-navy px-[5px] text-[11px] font-bold text-white shadow-[0_0_0_2px_var(--bg)]">
            {cantidad}
          </span>
        )}
      </button>
    );
  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Abrir carrito, ${cantidad} productos`}
      className="flex h-11 items-center gap-2 rounded-full bg-navy pl-3.5 pr-[18px] text-sm font-semibold text-white hover:bg-navy-700"
    >
      <ShoppingBag size={20} strokeWidth={2} aria-hidden />
      Carrito
      <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-navy">
        {cantidad}
      </span>
    </button>
  );
}

export function Encabezado() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="bg-navy px-4 py-2 text-center text-xs font-medium tracking-[.02em] text-white">
        Envíos a todo Honduras · Compra 100 % en línea
      </div>

      {/* Móvil */}
      <div className="min-[900px]:hidden">
        <div className="flex items-center gap-0.5 py-1.5 pl-3 pr-2">
          <Link href="/" aria-label="BIOPUREX, ir al inicio" className="flex h-11 items-center rounded-sm">
            <Image src="/img/logo.png" alt="BIOPUREX" width={76} height={38} priority className="h-[38px] w-auto" />
          </Link>
          <div className="flex-1" />
          <Link href="/cuenta" aria-label="Mi cuenta" className="flex size-11 items-center justify-center rounded-full text-navy hover:bg-surface">
            <User size={20} strokeWidth={2} aria-hidden />
          </Link>
          <BotonCarrito movil />
        </div>
        <div className="px-4 pb-3">
          <Suspense>
            <Buscador movil />
          </Suspense>
        </div>
      </div>

      {/* Escritorio */}
      <div className="mx-auto hidden h-[76px] max-w-[1280px] items-center gap-7 px-[clamp(16px,3vw,40px)] min-[900px]:flex">
        <Link href="/" aria-label="BIOPUREX, ir al inicio" className="flex h-14 flex-none items-center rounded-sm">
          <Image src="/img/logo.png" alt="BIOPUREX" width={96} height={48} priority className="h-12 w-auto" />
        </Link>
        <Suspense>
          <NavCategorias />
          <Buscador />
        </Suspense>
        <div className="flex flex-none items-center gap-1">
          <Link
            href="/pedidos"
            aria-label="Mis pedidos"
            className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-navy no-underline hover:bg-surface"
          >
            <Package size={20} strokeWidth={2} aria-hidden />
            <span className="hidden min-[1180px]:inline">Mis pedidos</span>
          </Link>
          <Link href="/cuenta" aria-label="Mi cuenta" className="flex size-11 items-center justify-center rounded-full text-navy hover:bg-surface">
            <User size={20} strokeWidth={2} aria-hidden />
          </Link>
          <BotonCarrito />
        </div>
      </div>
    </header>
  );
}
