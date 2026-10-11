"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { AROMAS, aromaVar } from "@/lib/catalogo";
import { lempiras } from "@/lib/formato";
import { costoEnvio, faltaParaGratis } from "@/lib/envio";
import { useCarrito } from "./carrito-provider";
import { useCatalogo } from "./catalogo-provider";

export function CarritoLateral() {
  const { lineas, cantidad, subtotal, abierto, cerrar, cambiar, quitar } = useCarrito();
  const { envio } = useCatalogo();
  // Estimado con el municipio más barato; el real se calcula en el checkout según la dirección.
  const envioEstimado = envio.desde == null ? null : costoEnvio(envio.desde, subtotal, envio.gratisDesde);
  const falta = faltaParaGratis(subtotal, envio.gratisDesde);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, cerrar]);

  return (
    <>
      <div
        onClick={cerrar}
        aria-hidden
        className="fixed inset-0 z-[70] bg-[var(--scrim)] transition-opacity duration-300"
        style={{ opacity: abierto ? 1 : 0, pointerEvents: abierto ? "auto" : "none" }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className="fixed inset-y-0 right-0 z-[71] flex w-[min(420px,100%)] flex-col bg-bg shadow-2 transition-[transform,visibility] duration-[340ms] ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: abierto ? "translateX(0)" : "translateX(105%)", visibility: abierto ? "visible" : "hidden" }}
      >
        <div className="flex items-center justify-between border-b border-line py-3 pl-5 pr-3">
          <h2 className="font-display m-0 whitespace-nowrap text-[28px] leading-none">
            Tu carrito{" "}
            <span className="font-sans text-[15px] font-semibold normal-case text-text-2">({cantidad})</span>
          </h2>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar carrito"
            className="btn-pop flex size-11 items-center justify-center rounded-full hover:bg-surface"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        {lineas.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex size-[88px] items-center justify-center rounded-full bg-surface">
              <ShoppingBag size={28} strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className="mb-0 mt-2 text-xl font-bold">Tu carrito está vacío</h3>
            <p className="m-0 max-w-[28ch] leading-normal text-text-2">
              Explora nuestros productos y encuentra tu aroma favorito.
            </p>
            <Link
              href="/catalogo"
              onClick={cerrar}
              className="mt-2 flex h-[52px] items-center rounded-full bg-navy px-7 font-semibold text-white no-underline hover:bg-navy-700 btn-fx"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {lineas.map((l) => (
                <div key={l.slug + l.clave} className="flex gap-3.5 border-b border-line py-4">
                  <Link
                    href={`/producto/${l.slug}${l.variante.aroma ? `?aroma=${l.variante.clave}` : ""}`}
                    onClick={cerrar}
                    aria-label={`Ver ${l.producto.nombre}`}
                    className={`relative size-[84px] flex-none rounded-md ${l.producto.tinte ? "bg-aroma-soft" : "bg-surface"}`}
                    style={{ "--aroma": l.producto.tinte ? aromaVar(l.variante.aroma ?? l.producto.tinte) : undefined } as React.CSSProperties}
                  >
                    <Image src={l.variante.img} alt="" fill sizes="84px" className="object-contain p-2" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 text-[15px] font-semibold leading-[1.3]">{l.producto.nombre}</div>
                      <button
                        type="button"
                        onClick={() => quitar(l.slug, l.clave)}
                        aria-label={`Quitar ${l.producto.nombre}`}
                        className="btn-pop -mr-2 -mt-1.5 flex size-9 items-center justify-center rounded-full text-text-2 hover:bg-surface hover:text-error"
                      >
                        <Trash2 size={16} strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-text-2">
                      {l.variante.aroma && (
                        <span className="size-2.5 rounded-full" style={{ background: aromaVar(l.variante.aroma) }} />
                      )}
                      {l.variante.aroma ? `${AROMAS[l.variante.aroma]} · ` : ""}
                      {l.producto.tamano}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="inline-flex h-11 items-center rounded-full shadow-[inset_0_0_0_1.5px_var(--border)]">
                        <button
                          type="button"
                          onClick={() => cambiar(l.slug, l.clave, -1)}
                          aria-label="Restar uno"
                          className="btn-pop flex h-11 w-10 items-center justify-center rounded-full"
                        >
                          <Minus size={16} strokeWidth={2.25} aria-hidden />
                        </button>
                        <span key={l.cantidad} className="aroma-pop min-w-[22px] text-center text-sm font-bold">{l.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => cambiar(l.slug, l.clave, 1)}
                          aria-label="Sumar uno"
                          className="btn-pop flex h-11 w-10 items-center justify-center rounded-full"
                        >
                          <Plus size={16} strokeWidth={2.25} aria-hidden />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums">{lempiras(l.total)}</div>
                        <div className="text-xs text-text-2">{lempiras(l.producto.precio)} c/u</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2.5 border-t border-line bg-surface px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-2">Subtotal</span>
                <span className="font-semibold">{lempiras(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-text-2">Envío estimado</span>
                <span className="text-right">{envioEstimado == null ? "Se calcula al pagar" : envioEstimado === 0 ? <strong className="text-success">Gratis</strong> : lempiras(envioEstimado)}</span>
              </div>
              {falta != null && falta >= 0 && (
                <p className="m-0 rounded-sm bg-success-50 px-3 py-2 text-[13px] leading-normal text-success">
                  Envío gratis en compras de más de {lempiras(envio.gratisDesde!)}. Te faltan {lempiras(falta)} o más.
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-bold">Total estimado</span>
                <span className="text-xl font-bold">{lempiras(subtotal + (envioEstimado ?? 0))}</span>
              </div>
              <Link
                href="/checkout"
                onClick={cerrar}
                className="mt-1 flex h-[54px] items-center justify-center gap-2 rounded-full bg-navy font-semibold text-white no-underline hover:bg-navy-700 btn-fx"
              >
                Ir a pagar <ChevronRight size={20} aria-hidden />
              </Link>
              <button
                type="button"
                onClick={cerrar}
                className="btn-pop chip-pop h-11 rounded-full text-center text-sm font-semibold hover:bg-bg"
              >
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function AvisoCarrito() {
  const { aviso } = useCarrito();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex w-max max-w-[calc(100%-32px)] items-center gap-2.5 rounded-full bg-navy py-3 pl-3.5 pr-[18px] text-sm font-medium text-white shadow-2 transition-[opacity,transform] duration-250 max-[899px]:bottom-24"
      style={{ opacity: aviso ? 1 : 0, transform: aviso ? "translate(-50%,0)" : "translate(-50%,16px)" }}
    >
      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-green text-navy">
        <Check size={16} strokeWidth={2.25} aria-hidden />
      </span>
      {aviso}
    </div>
  );
}
