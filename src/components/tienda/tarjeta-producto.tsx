"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AROMAS, aromaVar, esMayoreo, esOscuro, varianteInicial, type Producto } from "@/lib/catalogo";
import { lempiras } from "@/lib/formato";
import { useCarrito } from "./carrito-provider";
import { Insignias, type InsigniaId } from "./insignias";

export function TarjetaProducto({ producto: p, claveInicial }: { producto: Producto; claveInicial?: string | null }) {
  const { agregar } = useCarrito();
  const [clave, setClave] = useState(() => varianteInicial(p, claveInicial).clave);
  const v = p.variantes.find((x) => x.clave === clave) ?? p.variantes[0];
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
  const anilloSel = oscura ? "var(--white)" : "var(--navy)";

  return (
    <div
      className={`relative flex h-full flex-col rounded-lg transition-[background-color,transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-2 ${fondo}`}
      style={{ "--aroma": tinte ? aromaVar(tinte) : undefined } as React.CSSProperties}
    >
      <Link href={href} aria-label={`Ver ${p.nombre}`} className="relative block aspect-square rounded-t-lg">
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
          <>
            <div className={`mt-1.5 text-xs ${fg2}`}>
              Elegir aroma: <strong className={fg}>{v.etiqueta}</strong>
            </div>
            <div role="radiogroup" aria-label="Elegir aroma" className="-mx-2 mb-0.5 flex flex-wrap">
              {p.variantes.map((x) => {
                const sel = x.clave === clave;
                return (
                  <button
                    key={x.clave}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    aria-label={x.etiqueta}
                    title={x.etiqueta}
                    onClick={() => setClave(x.clave)}
                    className="flex size-8 items-center justify-center rounded-full"
                  >
                    <span
                      className="size-4 rounded-full transition-shadow"
                      style={{
                        background: x.aroma ? aromaVar(x.aroma) : undefined,
                        boxShadow: sel ? `0 0 0 2px ${anillo}, 0 0 0 4px ${anilloSel}` : `0 0 0 1.5px ${anillo}`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </>
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
