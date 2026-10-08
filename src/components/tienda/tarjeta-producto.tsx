"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AROMAS, aromaVar, esMayoreo, esOscuro, varianteInicial, type Producto } from "@/lib/catalogo";
import { lempiras } from "@/lib/formato";
import { useCarrito } from "./carrito-provider";
import { Insignias, type InsigniaId } from "./insignias";

/**
 * Tarjeta de un producto en UN aroma (en el catálogo cada aroma es su propia tarjeta).
 * El aroma se cambia dentro de la ficha del producto, no aquí.
 */
export function TarjetaProducto({ producto: p, clave }: { producto: Producto; clave?: string | null }) {
  const { agregar } = useCarrito();
  const v = varianteInicial(p, clave);
  const oscura = esOscuro(p);
  const tinte = v.aroma ?? p.tinte;
  const conAromas = p.variantes.length > 1;
  const href = `/producto/${p.slug}${conAromas ? `?aroma=${v.clave}` : ""}`;
  const puedeAgregar = p.precio != null && !p.cotizar && !v.agotado;

  const insignias: InsigniaId[] = [...p.insignias];
  if (esMayoreo(p)) insignias.push("mayoreo");
  if (v.agotado) insignias.push("agotado");

  const fondo = tinte ? (oscura ? "bg-aroma-dark" : "bg-aroma-soft") : oscura ? "bg-graphite-2" : "bg-surface";
  const fg = oscura ? "text-white" : "text-navy";
  const fg2 = oscura ? "text-on-dark-2" : "text-text-2";
  const anillo = oscura ? "var(--graphite-2)" : "var(--bg)";

  return (
    <div
      className={`relative flex h-full flex-col rounded-lg transition-[background-color,transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-2 ${fondo}`}
      style={{ "--aroma": tinte ? aromaVar(tinte) : undefined } as React.CSSProperties}
    >
      <Link href={href} aria-label={`Ver ${p.nombre}${conAromas ? ` ${v.etiqueta}` : ""}`} className="relative block aspect-square rounded-t-lg">
        <div className="absolute inset-[12%_14%_6%]">
          <Image
            key={v.img}
            src={v.img}
            alt=""
            fill
            sizes="(max-width: 899px) 45vw, 260px"
            className={`animate-fade-in object-contain ${oscura ? "drop-product-dark" : "drop-product"}`}
          />
        </div>
        <div className="absolute left-2.5 top-2.5">
          <Insignias ids={insignias} chica />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-4">
        <Link href={href} tabIndex={-1} className={`pr-11 text-[15px] font-semibold leading-[1.3] no-underline ${fg}`}>
          {p.nombre}
        </Link>
        {conAromas && (
          <Link href={href} tabIndex={-1} className={`mt-1 flex items-center gap-1.5 text-[13px] font-semibold no-underline ${fg}`}>
            {v.aroma && <span className="size-3 flex-none rounded-full" style={{ background: aromaVar(v.aroma), boxShadow: `0 0 0 1.5px ${anillo}` }} />}
            {v.etiqueta}
          </Link>
        )}
        <Link href={href} tabIndex={-1} className="flex flex-1 flex-col gap-1 pr-11 no-underline">
          <span className={`text-[13px] ${fg2}`}>{p.tamano}</span>
          <span className={`mt-0.5 text-base font-bold tabular-nums ${fg}`}>
            {p.cotizar || p.precio == null ? "Precio a consultar" : lempiras(p.precio)}
          </span>
        </Link>
      </div>

      {puedeAgregar && (
        <button
          type="button"
          onClick={() => agregar(p.slug, v.clave, 1)}
          aria-label={`Agregar ${p.nombre}${v.aroma ? ` ${AROMAS[v.aroma]}` : ""} al carrito`}
          className={`absolute bottom-3 right-2.5 flex size-11 items-center justify-center rounded-full transition-transform hover:scale-[1.06] active:scale-[.94] ${
            oscura ? "bg-white text-graphite" : "bg-navy text-white"
          }`}
        >
          <Plus size={20} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  );
}
