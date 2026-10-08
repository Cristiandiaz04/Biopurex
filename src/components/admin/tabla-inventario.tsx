"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { CATEGORIAS, categoria, esCategoria } from "@/lib/catalogo";
import type { ProductoAdmin } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { Chip, PuntoAroma, td, th, Vacio } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function TablaInventario({ productos }: { productos: ProductoAdmin[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [modo, setModo] = useState<"productos" | "variantes">(sp.get("vista") === "variantes" ? "variantes" : "productos");
  const [cat, setCat] = useState<string | null>(null);
  const [bajo, setBajo] = useState(sp.get("bajo") === "1");
  const [q, setQ] = useState("");

  const nq = norm(q.trim());
  const prods = useMemo(
    () =>
      productos.filter(
        (p) =>
          (!cat || p.categoria === cat) &&
          (!nq || norm(`${p.nombre} ${p.variantes.map((v) => `${v.etiqueta} ${v.sku}`).join(" ")}`).includes(nq)),
      ),
    [productos, cat, nq],
  );
  const vars = useMemo(
    () =>
      prods
        .flatMap((p) => p.variantes.map((v) => ({ p, v, disp: v.stock - v.apartado })))
        .filter((x) => (!bajo || x.disp <= x.v.minimo) && (!nq || norm(`${x.p.nombre} ${x.v.etiqueta} ${x.v.sku}`).includes(nq))),
    [prods, bajo, nq],
  );

  const chip = (sel: boolean) =>
    `h-[34px] whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${sel ? "bg-navy text-white" : "bg-white text-navy shadow-[inset_0_0_0_1.5px_var(--border)]"}`;
  const vacio = modo === "productos" ? prods.length === 0 : vars.length === 0;

  return (
    <>
      <div className="mb-3 flex w-fit rounded-full bg-white p-[3px] shadow-[inset_0_0_0_1px_var(--border)]">
        {(["productos", "variantes"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} className={`h-[34px] rounded-full px-4 text-[13px] font-semibold capitalize ${modo === m ? "bg-navy text-white" : ""}`}>
            {m === "productos" ? "Por producto" : "Por variante"}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCat(null)} className={chip(!cat)}>Todas</button>
            {CATEGORIAS.map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} className={chip(cat === c.id)}>
                {c.corto}
              </button>
            ))}
          </div>
          {modo === "variantes" && (
            <button
              type="button"
              aria-pressed={bajo}
              onClick={() => setBajo((b) => !b)}
              className={`inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${bajo ? "bg-error-50 text-error shadow-[inset_0_0_0_1.5px_var(--error)]" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
            >
              <AlertTriangle size={14} aria-hidden />
              Solo stock bajo
            </button>
          )}
          <label className="ml-auto flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
            <Search size={16} aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, aroma o SKU" aria-label="Buscar productos" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
          </label>
        </div>

        {vacio ? (
          <Vacio titulo="Nada coincide con estos filtros" texto="Prueba otra categoría, aroma o SKU.">
            <button type="button" onClick={() => { setCat(null); setQ(""); setBajo(false); }} className="h-10 rounded-full bg-navy px-[18px] text-sm font-semibold text-white">
              Limpiar filtros
            </button>
          </Vacio>
        ) : modo === "productos" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr><th className={th}>Producto</th><th className={th}>Aromas</th><th className={`${th} text-right`}>Precio</th><th className={`${th} text-right`}>Existencia</th><th className={`${th} text-right`}>Apartado</th><th className={th}>Alertas</th></tr>
              </thead>
              <tbody>
                {prods.map((p) => {
                  const ex = p.variantes.reduce((s, v) => s + v.stock, 0);
                  const ap = p.variantes.reduce((s, v) => s + v.apartado, 0);
                  const bajos = p.variantes.filter((v) => v.activo && v.stock - v.apartado <= v.minimo).length;
                  const aromas = p.variantes.filter((v) => v.aroma);
                  return (
                    <tr key={p.id} onClick={() => router.push(`/admin/productos/${p.slug}`)} className="cursor-pointer hover:bg-surface">
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.variantes[0]?.img ?? "/img/logo.png"} alt="" className="size-11 flex-none object-contain" />
                          <div>
                            <div className="font-semibold">
                              {p.nombre}
                              {!p.activo && <Chip chico className="ml-2 bg-surface text-text-2">Oculto</Chip>}
                            </div>
                            <div className="text-xs text-text-2">
                              {esCategoria(p.categoria) ? categoria(p.categoria).nombre : p.categoria} · {p.variantes.length} {p.variantes.length === 1 ? "variante" : "variantes"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        {aromas.length ? (
                          <div className="flex max-w-[150px] flex-wrap gap-1">
                            {aromas.map((v) => (
                              <span key={v.id} title={v.etiqueta}><PuntoAroma aroma={v.aroma} tam={16} /></span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] text-text-2">Sin aroma</span>
                        )}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right text-[13px] tabular-nums`}>{p.cotizar ? "Cotización" : lempiras(p.precio)}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{ex}</td>
                      <td className={`${td} text-right tabular-nums text-warning`}>{ap}</td>
                      <td className={td}>{bajos > 0 && <Chip className="bg-error-50 text-error">{bajos} con stock bajo</Chip>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr><th className={th}>Producto · aroma</th><th className={th}>SKU</th><th className={`${th} text-right`}>Precio</th><th className={`${th} text-right`}>Existencia</th><th className={`${th} text-right`}>Apartado</th><th className={`${th} text-right`}>Disponible</th><th className={`${th} text-right`}>Mínimo</th><th className={th}>Estado</th></tr>
              </thead>
              <tbody>
                {vars.map(({ p, v, disp }) => (
                  <tr key={v.id} onClick={() => router.push(`/admin/productos/${p.slug}?variante=${v.id}`)} className="cursor-pointer hover:bg-surface">
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.img} alt="" className="size-9 flex-none object-contain" />
                        <div>
                          <div className="font-semibold">{p.nombre}</div>
                          <div className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v.aroma} />{v.etiqueta}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap font-mono text-xs text-text-2`}>{v.sku}</td>
                    <td className={`${td} whitespace-nowrap text-right text-[13px] tabular-nums`}>{lempiras(p.precio)}</td>
                    <td className={`${td} text-right tabular-nums`}>{v.stock}</td>
                    <td className={`${td} text-right tabular-nums text-warning`}>{v.apartado}</td>
                    <td className={`${td} text-right font-bold tabular-nums ${disp <= v.minimo ? "text-error" : ""}`}>{disp}</td>
                    <td className={`${td} text-right text-[13px] tabular-nums text-text-2`}>{v.minimo}</td>
                    <td className={td}>
                      {!v.activo ? <Chip className="bg-surface text-text-2">Oculto</Chip> : disp <= v.minimo ? <Chip className="bg-error-50 text-error">Stock bajo</Chip> : <Chip className="bg-surface text-text-2">OK</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
