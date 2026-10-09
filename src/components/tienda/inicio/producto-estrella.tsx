"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AROMAS, aromaVar, type AromaId, type Producto } from "@/lib/catalogo";
import { lempiras } from "@/lib/formato";

const img = (p: Producto, a: AromaId) => (p.variantes.find((x) => x.aroma === a) ?? p.variantes[0]).img;

/** Sección "Producto estrella": el fondo toma el color del aroma y rota solo hasta que el usuario elige. */
export function ProductoEstrella({ galon: GALON, litro: LITRO }: { galon: Producto; litro: Producto }) {
  const AROMAS_DZ = GALON.variantes.map((x) => x.aroma).filter((a): a is AromaId => !!a);
  const [aroma, setAroma] = useState<AromaId>(AROMAS_DZ[0] ?? "lavanda");
  const pausado = useRef(false);

  const total = AROMAS_DZ.length;
  // Precio real más bajo entre las dos presentaciones (sin precio si ambas son por cotización).
  const precios = [GALON, LITRO].filter((p) => !p.cotizar && p.precio != null).map((p) => p.precio as number);
  const desde = precios.length ? Math.min(...precios) : null;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || total < 2) return;
    const t = setInterval(() => {
      if (pausado.current || document.hidden) return;
      setAroma((a) => AROMAS_DZ[(AROMAS_DZ.indexOf(a) + 1) % total]);
    }, 3200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return (
    <section
      className="bg-aroma-page transition-[background-color] duration-[450ms]"
      style={{ "--aroma": aromaVar(aroma) } as React.CSSProperties}
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-[clamp(8px,4vw,56px)] px-[clamp(16px,3vw,40px)] py-[clamp(24px,5vw,72px)] min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="order-2 flex flex-col gap-[18px] min-[900px]:order-1">
          <div className="flex items-center gap-2.5">
            <span className="h-[3px] w-8 rounded-sm bg-green" />
            <span className="text-[13px] font-semibold uppercase tracking-[.08em]">Producto estrella</span>
          </div>
          <h2 className="font-display text-h1 m-0 tracking-[.005em]">
            Desinfectante
            <br />
            Multiusos
          </h2>
          <p className="m-0 text-[clamp(18px,1.6vw,22px)] font-semibold">Tu mejor aliado en la limpieza.</p>
          <p className="m-0 max-w-[46ch] text-pretty leading-[1.55] text-text-2">{GALON.desc}</p>
          <div>
            <div className="mb-1 text-sm">
              Aroma: <strong>{AROMAS[aroma]}</strong>
            </div>
            <div role="radiogroup" aria-label="Aroma" className="-ml-2 flex flex-wrap gap-0.5">
              {AROMAS_DZ.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={a === aroma}
                  aria-label={AROMAS[a]}
                  title={AROMAS[a]}
                  onClick={() => {
                    pausado.current = true;
                    setAroma(a);
                  }}
                  className="flex size-11 items-center justify-center rounded-full"
                >
                  <span
                    className="size-7 rounded-full transition-shadow"
                    style={{
                      background: aromaVar(a),
                      boxShadow: a === aroma ? "0 0 0 3px var(--bg), 0 0 0 5px var(--navy)" : "0 0 0 1px rgba(30,42,94,.12)",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {desde != null && <span className="text-2xl font-bold">Desde {lempiras(desde)}</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/producto/desinfectante-galon?aroma=${aroma}`}
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-navy px-7 font-semibold text-white no-underline transition-[background-color,transform] hover:bg-navy-700 active:scale-[.98]"
            >
              Comprar ahora <ChevronRight size={20} aria-hidden />
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex h-[52px] items-center rounded-full bg-bg px-6 font-semibold text-navy no-underline shadow-[inset_0_0_0_1.5px_var(--navy)] transition-colors hover:bg-navy-50"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
        <div className="relative order-1 h-[clamp(300px,42vw,540px)] min-[900px]:order-2">
          <div className="bg-aroma-circle absolute left-1/2 top-[52%] aspect-square w-[min(88%,480px)] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color] duration-[450ms]" />
          <div key={aroma} className="absolute inset-0 flex items-end justify-center">
            <div className="drop-product relative h-[90%] w-[46%]">
              <Image src={img(GALON, aroma)} alt={`Desinfectante Multiusos galón aroma ${AROMAS[aroma]}`} fill sizes="(max-width: 899px) 46vw, 300px" className="object-contain object-bottom" />
            </div>
            <div className="drop-product relative -ml-[4%] h-[72%] w-[22%]">
              <Image src={img(LITRO, aroma)} alt={`Desinfectante Multiusos litro aroma ${AROMAS[aroma]}`} fill sizes="(max-width: 899px) 22vw, 150px" className="object-contain object-bottom" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
