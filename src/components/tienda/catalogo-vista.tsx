"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  AROMAS,
  AROMA_IDS,
  TAMANOS_FILTRO,
  aromaVar,
  buscarProductos,
  type AromaId,
} from "@/lib/catalogo";
import { TarjetaProducto } from "./tarjeta-producto";
import { useCatalogo } from "./catalogo-provider";

const lista = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function CatalogoVista() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const { productos: todos, categorias, categoria } = useCatalogo();

  const catParam = sp.get("cat");
  const catSel = categoria(catParam);
  const cat = catSel?.id ?? null;
  const aromas = lista(sp.get("aroma")).filter((a): a is AromaId => a in AROMAS);
  const tamanos = lista(sp.get("tam")).filter((t) => TAMANOS_FILTRO.includes(t));
  const q = sp.get("q") ?? "";
  const orden = sp.get("orden") ?? "rel";
  const oscuro = catSel?.oscura ?? false;

  const productos = useMemo(
    () => buscarProductos(todos, { cat, q, aromas, tamanos, orden }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, todos],
  );

  function actualizar(cambios: Record<string, string | string[] | null>) {
    const n = new URLSearchParams(sp.toString());
    for (const [k, val] of Object.entries(cambios)) {
      const s = Array.isArray(val) ? val.join(",") : val;
      if (s) n.set(k, s);
      else n.delete(k);
    }
    const qs = n.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const alternar = (arr: string[], x: string) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const limpiar = () => router.replace(pathname, { scroll: false });

  useEffect(() => {
    if (!hojaAbierta) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHojaAbierta(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [hojaAbierta]);

  const activos = [
    ...(cat ? [{ label: catSel!.corto, color: null as string | null, quitar: () => actualizar({ cat: null }) }] : []),
    ...aromas.map((a) => ({ label: AROMAS[a], color: aromaVar(a), quitar: () => actualizar({ aroma: aromas.filter((x) => x !== a) }) })),
    ...tamanos.map((t) => ({ label: t, color: null, quitar: () => actualizar({ tam: tamanos.filter((x) => x !== t) }) })),
  ];
  const nFiltros = aromas.length + tamanos.length + (cat ? 1 : 0);
  const titulo = catSel ? catSel.nombre : q ? `Resultados para “${q}”` : "Todos los productos";

  const th = oscuro
    ? { page: "bg-graphite text-white", fg2: "text-on-dark-2", btn: "bg-white text-graphite", chip: "bg-graphite-2 text-white", line: "border-graphite-3", surf: "bg-graphite-2" }
    : { page: "bg-bg text-navy", fg2: "text-text-2", btn: "bg-navy text-white", chip: "bg-surface text-navy", line: "border-line", surf: "bg-surface" };

  const chip = (sel: boolean) =>
    `inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
      sel ? "bg-navy text-white shadow-[inset_0_0_0_1.5px_var(--navy)]" : "text-navy shadow-[inset_0_0_0_1.5px_var(--border)]"
    }`;

  return (
    <main
      className={`min-h-[70vh] transition-colors duration-300 ${th.page}`}
      style={oscuro ? ({ "--focus": "var(--white)" } as React.CSSProperties) : undefined}
    >
      <div className="mx-auto max-w-[1280px] px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-5">
        <nav aria-label="Ruta" className={`mb-4 flex items-center gap-1.5 text-[13px] ${th.fg2}`}>
          <Link href="/" className="py-1.5 no-underline hover:underline">
            Inicio
          </Link>
          <span>/</span>
          <span className={`font-semibold ${oscuro ? "text-white" : "text-navy"}`}>{catSel ? catSel.nombre : "Todos"}</span>
        </nav>
        <div className="mb-5">
          <span className="brand-line mb-3" />
          <h1 className="font-display text-h2 m-0">{titulo}</h1>
          <div className={`mt-2 text-sm ${th.fg2}`}>
            {productos.length} {productos.length === 1 ? "producto" : "productos"}
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHojaAbierta(true)}
            className={`flex h-11 items-center gap-2 rounded-full px-[18px] text-sm font-semibold transition-transform active:scale-[.97] ${th.btn}`}
          >
            <SlidersHorizontal size={16} strokeWidth={2.25} aria-hidden />
            Filtros
            {nFiltros > 0 && (
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${oscuro ? "bg-graphite text-white" : "bg-white text-navy"}`}>
                {nFiltros}
              </span>
            )}
          </button>
          <div className="flex-1" />
          <select
            value={orden}
            onChange={(e) => actualizar({ orden: e.target.value === "rel" ? null : e.target.value })}
            aria-label="Ordenar por"
            className={`h-11 min-w-0 max-w-[220px] cursor-pointer rounded-full border-[1.5px] pl-4 pr-3 text-sm font-semibold ${th.line} ${oscuro ? "bg-graphite text-white" : "bg-bg text-navy"}`}
          >
            <option value="rel">Relevancia</option>
            <option value="asc">Precio: menor a mayor</option>
            <option value="desc">Precio: mayor a menor</option>
            <option value="az">Nombre A–Z</option>
          </select>
        </div>

        {(activos.length > 0 || q) && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {activos.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.quitar}
                aria-label={`Quitar filtro ${c.label}`}
                className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full pl-3 pr-2.5 text-[13px] font-semibold ${th.chip}`}
              >
                {c.color && <span className="size-3 rounded-full" style={{ background: c.color }} />}
                {c.label}
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ))}
            <button type="button" onClick={limpiar} className="h-9 px-2 text-[13px] font-semibold underline underline-offset-[3px]">
              Limpiar todo
            </button>
          </div>
        )}

        {productos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[900px]:gap-6">
            {productos.map((p) => (
              <TarjetaProducto
                key={p.slug + aromas.join()}
                producto={p}
                claveInicial={aromas.find((a) => p.variantes.some((x) => x.aroma === a)) ?? null}
              />
            ))}
          </div>
        ) : (
          <div className={`flex flex-col items-center gap-3 rounded-xl px-5 py-[clamp(40px,8vw,88px)] text-center ${th.surf}`}>
            <span className={`flex size-[72px] items-center justify-center rounded-full ${oscuro ? "bg-graphite" : "bg-bg"}`}>
              <Search size={28} strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mb-0 mt-2 text-[22px] font-bold">No encontramos productos</h2>
            <p className={`m-0 max-w-[36ch] leading-normal ${th.fg2}`}>
              Prueba con otro aroma o presentación, o limpia los filtros para ver todo el catálogo.
            </p>
            <button type="button" onClick={limpiar} className={`mt-2 h-12 rounded-full px-6 font-semibold ${th.btn}`}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Hoja de filtros: abajo en móvil, a la derecha en escritorio. */}
      <div
        onClick={() => setHojaAbierta(false)}
        aria-hidden
        className="fixed inset-0 z-[60] bg-[var(--scrim)] transition-opacity duration-300"
        style={{ opacity: hojaAbierta ? 1 : 0, pointerEvents: hojaAbierta ? "auto" : "none" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={`fixed inset-x-0 bottom-0 z-[61] flex max-h-[86%] flex-col rounded-t-xl bg-bg text-navy shadow-2 transition-[transform,visibility] duration-[340ms] ease-[cubic-bezier(.2,.8,.2,1)] min-[900px]:inset-y-0 min-[900px]:left-auto min-[900px]:max-h-full min-[900px]:w-[min(420px,100%)] min-[900px]:rounded-l-xl min-[900px]:rounded-tr-none ${
          hojaAbierta ? "visible translate-x-0 translate-y-0" : "invisible translate-y-[105%] min-[900px]:translate-x-[105%] min-[900px]:translate-y-0"
        }`}
        style={{ "--focus": "var(--navy)" } as React.CSSProperties}
      >
        <div className="flex justify-center pt-2.5 min-[900px]:hidden">
          <span className="h-1 w-10 rounded-sm bg-line" />
        </div>
        <div className="flex items-center justify-between pb-2 pl-6 pr-3 pt-3">
          <h2 className="font-display m-0 text-[28px] leading-none">Filtros</h2>
          <button type="button" onClick={() => setHojaAbierta(false)} aria-label="Cerrar filtros" className="flex size-11 items-center justify-center rounded-full">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-2">
          <div>
            <div className="mb-2.5 text-xs font-bold uppercase tracking-[.08em] text-text-2">Categoría</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!cat} onClick={() => actualizar({ cat: null })} className={chip(!cat)}>
                Todos
              </button>
              {categorias.map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => actualizar({ cat: c.id })} className={chip(cat === c.id)}>
                  {c.corto}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[.08em] text-text-2">Aroma</div>
            <div className="grid grid-cols-2 gap-0.5">
              {AROMA_IDS.map((a) => {
                const sel = aromas.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => actualizar({ aroma: alternar(aromas, a) })}
                    className={`flex min-h-11 items-center gap-2.5 rounded-sm px-2 text-left text-sm ${sel ? "bg-navy-50 font-bold" : "font-medium"}`}
                  >
                    <span
                      className="size-[22px] flex-none rounded-full"
                      style={{
                        background: aromaVar(a),
                        boxShadow: sel ? "0 0 0 2px var(--bg), 0 0 0 4px var(--navy)" : "0 0 0 1px var(--border)",
                      }}
                    />
                    {AROMAS[a]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2.5 text-xs font-bold uppercase tracking-[.08em] text-text-2">Presentación</div>
            <div className="flex flex-wrap gap-2">
              {TAMANOS_FILTRO.map((t) => (
                <button key={t} type="button" aria-pressed={tamanos.includes(t)} onClick={() => actualizar({ tam: alternar(tamanos, t) })} className={chip(tamanos.includes(t))}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-line px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={limpiar} className="h-[52px] rounded-full px-5 font-semibold shadow-[inset_0_0_0_1.5px_var(--navy)]">
            Limpiar
          </button>
          <button type="button" onClick={() => setHojaAbierta(false)} className="h-[52px] flex-1 rounded-full bg-navy text-center font-semibold text-white">
            Ver {productos.length} resultado{productos.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </main>
  );
}
