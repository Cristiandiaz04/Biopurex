"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AlertTriangle, Check, Minus, Package, Plus, ShoppingBag, Truck } from "lucide-react";
import {
  AVISO_SEGURIDAD,
  aromaVar,
  esMayoreo,
  esOscuro,
  varianteInicial,
  type Producto,
} from "@/lib/catalogo";
import { lempiras } from "@/lib/formato";
import { useCarrito } from "./carrito-provider";
import { useCatalogo } from "./catalogo-provider";
import { Insignias, type InsigniaId } from "./insignias";
import { TarjetaProducto } from "./tarjeta-producto";

const COTIZAR = (p: Producto) =>
  `mailto:mibiopurex@gmail.com?subject=${encodeURIComponent("Cotización: " + p.nombre)}`;

/** Gotas que salpican al cambiar de aroma: ángulo (grados), distancia y tamaño en % del ancho de la foto. */
const GOTAS = Array.from({ length: 12 }, (_, i) => {
  const angulo = i * 30 + (i % 2 ? 12 : -6);
  const distancia = 36 + ((i * 7) % 4) * 5;
  const rad = (angulo * Math.PI) / 180;
  return { dx: Math.cos(rad) * distancia, dy: Math.sin(rad) * distancia * 0.9, tam: 4 + ((i * 5) % 3) * 1.6, retraso: (i % 4) * 35 };
});

/**
 * Ficha de producto. Indicación de Cristian (2026-10-08): el fondo de TODA la página toma el
 * color del aroma elegido (Lavanda → fondo lavanda) y cambia con un fundido.
 */
export function FichaProducto({
  producto: p,
  claveInicial,
  relacionados,
}: {
  producto: Producto;
  claveInicial: string | null;
  relacionados: Producto[];
}) {
  const { agregar } = useCarrito();
  const { porSlug, envio } = useCatalogo();
  const [clave, setClave] = useState(() => varianteInicial(p, claveInicial).clave);
  const [cantidad, setCantidad] = useState(1);
  // Cuántas veces se cambió de aroma: las animaciones solo corren tras un cambio (no al cargar, para no retrasar la foto).
  const [cambios, setCambios] = useState(0);
  // Fotos de los otros aromas: se cargan cuando la página ya está quieta, para que al cambiar la botella aparezca al instante.
  const [precargar, setPrecargar] = useState(false);
  useEffect(() => {
    if (p.variantes.length < 2) return;
    const t = setTimeout(() => setPrecargar(true), 1500);
    return () => clearTimeout(t);
  }, [p.variantes.length]);
  const v = p.variantes.find((x) => x.clave === clave) ?? p.variantes[0];
  const oscuro = esOscuro(p);
  const tinte = v.aroma ?? p.tinte;
  const conAromas = p.variantes.length > 1;
  const cotizar = p.precio == null || p.cotizar;

  /**
   * Cambio de aroma (pedido de Cristian: "una animación espectacular"). El color nuevo se expande
   * en círculo desde la muestra tocada y cubre toda la página (View Transitions); dentro, la
   * botella cae con rebote y salpican gotas. Sin soporte o con "reducir movimiento": cambio directo.
   */
  function elegir(nueva: string, origen?: HTMLElement) {
    if (nueva === clave) return;
    const aplicar = () => {
      setClave(nueva);
      setCambios((c) => c + 1);
    };
    const raiz = document.documentElement;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!origen || quieto || !("startViewTransition" in document)) {
      aplicar();
    } else {
      const r = origen.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      raiz.style.setProperty("--vt-x", `${x}px`);
      raiz.style.setProperty("--vt-y", `${y}px`);
      raiz.style.setProperty("--vt-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
      raiz.setAttribute("data-transicion", "aroma");
      const t = document.startViewTransition(() => flushSync(aplicar));
      t.finished.finally(() => raiz.removeAttribute("data-transicion"));
    }
    // Mantiene el aroma en la URL (compartible) sin recargar la página.
    const url = new URL(window.location.href);
    url.searchParams.set("aroma", nueva);
    window.history.replaceState(null, "", url);
  }

  function accion() {
    if (cotizar) {
      window.location.href = COTIZAR(p);
      return;
    }
    agregar(p.slug, v.clave, cantidad);
  }

  const insignias: InsigniaId[] = [...p.insignias];
  if (p.tamano === "20 L") insignias.push("mayoreo");

  const pagina = tinte ? (oscuro ? "bg-aroma-page-dark" : "bg-aroma-page") : oscuro ? "bg-graphite" : "bg-surface";
  const th = oscuro
    ? { fg: "text-white", fg2: "text-on-dark-2", line: "border-graphite-3", sombraLinea: "var(--graphite-3)", btn: "bg-white text-graphite", surf: "bg-graphite-2", anillo: "var(--graphite)", anilloSel: "var(--white)" }
    : { fg: "text-navy", fg2: "text-text-2", line: "border-line", sombraLinea: "var(--border)", btn: "bg-navy text-white", surf: "bg-bg/70", anillo: "var(--bg)", anilloSel: "var(--navy)" };
  const cta = cotizar ? "Solicitar cotización" : "Agregar al carrito";

  const contador = (alto: string, ancho: string) => (
    <div className={`inline-flex flex-none items-center rounded-full ${alto}`} style={{ boxShadow: `inset 0 0 0 1.5px ${th.sombraLinea}` }}>
      <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} aria-label="Restar uno" className={`flex items-center justify-center ${alto} ${ancho}`}>
        <Minus size={16} strokeWidth={2.25} aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-7 text-center font-bold tabular-nums">
        {cantidad}
      </span>
      <button type="button" onClick={() => setCantidad((c) => Math.min(999, c + 1))} aria-label="Sumar uno" className={`flex items-center justify-center ${alto} ${ancho}`}>
        <Plus size={16} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );

  return (
    <main
      className={`transition-[background-color] duration-[450ms] ease-out ${pagina} ${th.fg}`}
      style={{ "--aroma": tinte ? aromaVar(tinte) : undefined, "--focus": oscuro ? "var(--white)" : "var(--navy)" } as React.CSSProperties}
    >
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,3vw,40px)] pb-[clamp(40px,6vw,72px)] pt-5">
        <nav aria-label="Ruta" className={`mb-5 flex flex-wrap items-center gap-1.5 text-[13px] ${th.fg2}`}>
          <Link href="/" className="py-1.5 no-underline hover:underline">Inicio</Link>
          <span>/</span>
          <Link href={`/catalogo?cat=${p.cat}`} className="py-1.5 no-underline hover:underline">{p.catNombre}</Link>
          <span>/</span>
          <span className={`font-semibold ${th.fg}`}>{p.nombre}</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-[clamp(20px,4vw,56px)] min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Foto */}
          <div className="flex flex-col gap-3 min-[900px]:sticky min-[900px]:top-[120px]">
            <div
              className="relative aspect-square overflow-hidden rounded-xl transition-[background-color] duration-[450ms] [container-type:inline-size]"
              style={{
                backgroundColor: tinte
                  ? `color-mix(in srgb, var(--aroma) ${oscuro ? 22 : 20}%, ${oscuro ? "var(--graphite-2)" : "var(--bg)"})`
                  : oscuro ? "var(--graphite-2)" : "var(--bg)",
              }}
            >
              <div
                key={cambios ? `circulo-${clave}` : "circulo"}
                className={`absolute left-1/2 top-[54%] aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color] duration-[450ms] ${cambios ? "aroma-circulo" : ""}`}
                style={{
                  backgroundColor: tinte
                    ? `color-mix(in srgb, var(--aroma) ${oscuro ? 36 : 32}%, ${oscuro ? "var(--graphite-2)" : "var(--bg)"})`
                    : oscuro ? "var(--graphite-3)" : "var(--border)",
                }}
              />
              {cambios > 0 && (
                <div key={`efecto-${clave}`} aria-hidden className="pointer-events-none absolute inset-0">
                  <span className="aroma-onda absolute left-1/2 top-[54%] aspect-square w-[62%] rounded-full shadow-[inset_0_0_0_3px_var(--aroma)]" />
                  {GOTAS.map((g, i) => (
                    <span
                      key={i}
                      className="aroma-gota absolute left-1/2 top-[54%] aspect-square rounded-full"
                      style={
                        {
                          width: `${g.tam}cqi`,
                          "--dx": `${g.dx}cqi`,
                          "--dy": `${g.dy}cqi`,
                          animationDelay: `${g.retraso}ms`,
                          background: "radial-gradient(circle at 32% 30%, color-mix(in srgb, var(--aroma) 45%, white) 0 20%, color-mix(in srgb, var(--aroma) 82%, var(--navy)) 26%)",
                          boxShadow: "0 4px 10px -2px color-mix(in srgb, var(--aroma) 60%, transparent)",
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              )}
              {precargar && (
                <div aria-hidden className="pointer-events-none absolute inset-[9%] opacity-0">
                  {[...new Set(p.variantes.map((x) => x.img))]
                    .filter((src) => src !== v.img)
                    .map((src) => (
                      <Image key={src} src={src} alt="" fill loading="eager" sizes="(max-width: 899px) 90vw, 560px" className="object-contain" />
                    ))}
                </div>
              )}
              <div key={v.img} className={`absolute inset-[9%] ${oscuro ? "drop-product-dark" : "drop-product"} ${cambios ? "aroma-botella" : ""}`}>
                <Image src={v.img} alt={`${p.nombre}${v.aroma ? ` aroma ${v.etiqueta}` : ""}`} fill priority sizes="(max-width: 899px) 90vw, 560px" className="object-contain" />
              </div>
              <div className="absolute left-4 top-4">
                <Insignias ids={insignias} />
              </div>
            </div>
          </div>

          {/* Información */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-[3px] w-8 rounded-sm bg-green" />
                <span className={`text-[13px] font-semibold uppercase tracking-[.08em] ${th.fg2}`}>{p.catNombre}</span>
              </div>
              <h1 className="font-display text-h2 m-0 leading-[1.02]">{p.nombre}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[28px] font-bold tabular-nums">{cotizar ? "Precio a consultar" : lempiras(p.precio)}</span>
              </div>
              {p.desc && <p className={`m-0 max-w-[60ch] text-pretty leading-[1.6] ${th.fg2}`}>{p.desc}</p>}
            </div>

            {conAromas && (
              <div>
                <div className="mb-1.5 text-sm">
                  Aroma:{" "}
                  <strong key={v.clave} className={cambios ? "aroma-texto" : ""}>
                    {v.etiqueta}
                  </strong>
                </div>
                <div role="radiogroup" aria-label="Aroma" className="-ml-1.5 flex flex-wrap gap-1">
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
                        onClick={(e) => elegir(x.clave, e.currentTarget)}
                        className="flex size-12 items-center justify-center rounded-full transition-[scale] duration-200 hover:scale-110"
                      >
                        <span
                          className={`relative size-8 overflow-hidden rounded-full transition-shadow ${sel && cambios ? "aroma-pop" : ""}`}
                          style={{
                            background: x.aroma ? aromaVar(x.aroma) : undefined,
                            boxShadow: sel ? `0 0 0 3px ${th.anillo}, 0 0 0 5px ${th.anilloSel}` : `0 0 0 1px ${oscuro ? "var(--graphite-3)" : "rgba(30,42,94,.12)"}`,
                          }}
                        >
                        </span>
                      </button>
                    );
                  })}
                </div>
                {v.aroma && p.notas[v.aroma] && <p className={`mb-0 mt-2 text-sm leading-normal ${th.fg2}`}>{p.notas[v.aroma]}</p>}
              </div>
            )}

            {p.hermanos.length > 1 && (
              <div>
                <div className="mb-2 text-sm font-semibold">Presentación</div>
                <div role="list" className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2">
                  {p.hermanos.map((h) => {
                    const sel = h.slug === p.slug;
                    const hp = porSlug(h.slug);
                    if (!hp) return null;
                    const mismoAroma = v.aroma && hp.variantes.some((x) => x.clave === v.clave);
                    return (
                      <Link
                        key={h.slug}
                        role="listitem"
                        href={`/producto/${h.slug}${mismoAroma ? `?aroma=${v.clave}` : ""}`}
                        aria-current={sel ? "page" : undefined}
                        scroll={false}
                        className={`flex min-h-[60px] flex-col justify-center gap-0.5 rounded-md px-3.5 py-2.5 no-underline transition-colors ${sel ? th.btn : ""}`}
                        style={sel ? undefined : { boxShadow: `inset 0 0 0 1.5px ${th.sombraLinea}` }}
                      >
                        <span className="text-[15px] font-semibold">{h.tamano}</span>
                        <span className={`text-[13px] ${sel ? "" : th.fg2}`}>{lempiras(hp.precio)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {p.hermanos.length === 1 && (
              <div className={`text-sm ${th.fg2}`}>
                Presentación: <strong className={th.fg}>{p.tamano}</strong>
              </div>
            )}

            <div className="hidden items-center gap-3 min-[900px]:flex">
              {contador("h-[52px]", "w-12")}
              <button
                type="button"
                onClick={accion}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full px-6 font-semibold btn-fx disabled:cursor-not-allowed disabled:opacity-45 ${th.btn}`}
              >
                <ShoppingBag size={20} aria-hidden />
                {cta}
              </button>
            </div>

            {esMayoreo(p) && (
              <div className={`flex items-start gap-3 rounded-md p-4 ${th.surf}`}>
                <Package size={20} className="mt-px flex-none" aria-hidden />
                <div className="text-sm leading-normal">
                  <strong>¿Compras para tu negocio?</strong> Pide precio por volumen.{" "}
                  <a href={COTIZAR(p)} className="font-semibold">Solicitar cotización</a>
                </div>
              </div>
            )}
            <div className={`flex items-start gap-3 text-sm leading-normal ${th.fg2}`}>
              <Truck size={20} className={`flex-none ${th.fg}`} aria-hidden />
              <span>
                {envio.zonas.length ? `Entregamos en ${envio.zonas.join(", ")}` : "Entregas a domicilio"}
                {envio.desde != null && ` · envío ${lempiras(envio.desde)}`}
                {envio.gratisDesde != null && ` · gratis en compras de más de ${lempiras(envio.gratisDesde)}`}
              </span>
            </div>

            <div className={`border-t ${th.line}`} />

            {p.beneficios.length > 0 && (
              <div>
                <h2 className="mb-3.5 mt-0 text-lg font-bold">Beneficios</h2>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {p.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-3 leading-[1.45]">
                      <span className="flex size-6 flex-none items-center justify-center rounded-full bg-green-50 text-success">
                        <Check size={16} strokeWidth={2.25} aria-hidden />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.modoUso.length > 0 && (
              <div>
                <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                  <h2 className="m-0 text-lg font-bold">Modo de uso</h2>
                </div>
                <ol className={`m-0 flex flex-col gap-2 pl-5 leading-normal ${th.fg2}`}>
                  {p.modoUso.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ol>
              </div>
            )}
            {p.seguridad && (
              <div role="note" className="rounded-md bg-warning-50 p-[18px] text-navy shadow-[inset_0_0_0_1px_var(--warning)]">
                <div className="mb-2.5 flex items-center gap-2 font-bold text-warning">
                  <AlertTriangle size={20} aria-hidden />
                  Aviso de seguridad
                </div>
                <ul className="m-0 flex flex-col gap-1.5 pl-5 text-sm leading-normal">
                  {AVISO_SEGURIDAD.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <section className="mt-[clamp(48px,7vw,96px)]">
          <span className="brand-line mb-3" />
          <h2 className="font-display text-h2 mb-6 mt-0">También te puede interesar</h2>
          <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[900px]:gap-6">
            {relacionados.map((r) => (
              <TarjetaProducto key={r.slug} producto={r} />
            ))}
          </div>
        </section>
      </div>

      {/* Barra fija de compra en móvil */}
      <div
        className={`sticky bottom-0 z-20 flex items-center gap-2.5 border-t px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 transition-[background-color] duration-[450ms] min-[900px]:hidden ${pagina} ${th.line}`}
      >
        {contador("h-[52px]", "w-11")}
        <button
          type="button"
          onClick={accion}
          className={`flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold btn-fx disabled:cursor-not-allowed disabled:opacity-45 ${th.btn}`}
        >
          {cta}
          {!cotizar && <span className="font-medium opacity-85">{lempiras((p.precio ?? 0) * cantidad)}</span>}
        </button>
      </div>
    </main>
  );
}
