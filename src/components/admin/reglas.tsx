"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Copy, Factory, Plus, Search, Trash2 } from "lucide-react";
import { guardarReceta } from "@/acciones/produccion";
import { MensajeError } from "@/components/ui/campo";
import type { MateriaPrima, Receta, VarianteFabricable } from "@/lib/datos/produccion";
import { lempiras } from "@/lib/formato";
import { calcularProduccion, cantidad } from "@/lib/unidades";
import { entradaAdmin } from "./modal";
import { boton, Chip, PuntoAroma, td, th, Vacio } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function TablaReglas({ variantes, recetas, materias }: { variantes: VarianteFabricable[]; recetas: Receta[]; materias: MateriaPrima[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "con" | "sin">("todas");
  const porVariante = new Map(recetas.map((r) => [r.varianteId, r]));
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return variantes.filter((v) => {
      const tiene = porVariante.has(v.id);
      return (filtro === "todas" || (filtro === "con" ? tiene : !tiene)) && (!nq || norm(`${v.producto} ${v.etiqueta} ${v.sku}`).includes(nq));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantes, recetas, q, filtro]);
  const chip = (sel: boolean) => `inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${sel ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`;
  const con = variantes.filter((v) => porVariante.has(v.id)).length;

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setFiltro("todas")} className={chip(filtro === "todas")}>Todos <span className="text-xs opacity-75">{variantes.length}</span></button>
          <button type="button" onClick={() => setFiltro("con")} className={chip(filtro === "con")}>Con regla <span className="text-xs opacity-75">{con}</span></button>
          <button type="button" onClick={() => setFiltro("sin")} className={chip(filtro === "sin")}>Sin regla <span className="text-xs opacity-75">{variantes.length - con}</span></button>
        </div>
        <label className="flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, aroma o SKU" aria-label="Buscar" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo="Nada coincide con estos filtros" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead><tr><th className={th}>Producto · aroma</th><th className={th}>Regla</th><th className={`${th} text-right`}>Rinde por lote</th><th className={`${th} text-right`}>Costo por unidad</th><th className={`${th} text-right`}>Se pueden hacer</th></tr></thead>
            <tbody>
              {lista.map((v) => {
                const r = porVariante.get(v.id);
                const calc = r ? calcularProduccion(r, r.rendimiento, materias) : null;
                return (
                  <tr key={v.id} onClick={() => router.push(`/admin/produccion/reglas/${v.id}`)} className="cursor-pointer hover:bg-surface">
                    <td className={td}>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.img} alt="" className="size-9 flex-none object-contain" />
                        <div>
                          <div className="font-semibold">{v.producto}</div>
                          <div className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={v.aroma} />{v.etiqueta}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>{r ? <Chip className="bg-success-50 text-success">{r.ingredientes.length} materias</Chip> : <Chip className="bg-surface text-text-2">Sin regla</Chip>}</td>
                    <td className={`${td} text-right tabular-nums`}>{r ? r.rendimiento.toLocaleString("en-US") : "—"}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{calc ? (calc.sinCosto ? <span className="text-warning">Falta costo</span> : lempiras(calc.costoTotal / r!.rendimiento)) : "—"}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{calc ? calc.maximo : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Ing = { clave: string; materiaId: string; cantidad: string };
let k = 0;
const ingVacio = (): Ing => ({ clave: `i${k++}`, materiaId: "", cantidad: "" });

export function EditorRegla({
  variante,
  receta,
  materias,
  otras,
}: {
  variante: VarianteFabricable;
  receta: Receta | null;
  materias: MateriaPrima[];
  otras: { varianteId: string; label: string; receta: Receta }[];
}) {
  const router = useRouter();
  const [rend, setRend] = useState(receta ? String(receta.rendimiento) : "1");
  const [notas, setNotas] = useState(receta?.notas ?? "");
  const [ings, setIngs] = useState<Ing[]>(() =>
    receta?.ingredientes.length ? receta.ingredientes.map((i) => ({ clave: `i${k++}`, materiaId: i.materiaId, cantidad: String(i.cantidad) })) : [ingVacio()],
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const porId = new Map(materias.map((m) => [m.id, m]));
  const rendimiento = Number(rend) > 0 ? Number(rend) : 1;
  const borrador = { rendimiento, ingredientes: ings.filter((i) => i.materiaId && Number(i.cantidad) > 0).map((i) => ({ materiaId: i.materiaId, cantidad: Number(i.cantidad) })) };
  const calc = calcularProduccion(borrador, rendimiento, materias);
  const cambiar = (clave: string, c: Partial<Ing>) => {
    setOk(null);
    setIngs((xs) => xs.map((x) => (x.clave === clave ? { ...x, ...c } : x)));
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[900px]:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Un lote rinde (unidades de {variante.producto})
            <input value={rend} onChange={(e) => { setRend(e.target.value); setOk(null); }} inputMode="decimal" className={`${entradaAdmin} text-right tabular-nums`} />
            <span className="text-xs font-normal text-text-2">Ej.: con estas cantidades salen 4 galones → 4.</span>
          </label>
          {otras.length > 0 && (
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Copiar de otra regla
              <select
                value=""
                onChange={(e) => {
                  const o = otras.find((x) => x.varianteId === e.target.value);
                  if (!o) return;
                  setRend(String(o.receta.rendimiento));
                  setIngs(o.receta.ingredientes.map((i) => ({ clave: `i${k++}`, materiaId: i.materiaId, cantidad: String(i.cantidad) })));
                  setOk(`Copiada de ${o.label}. Cambia lo que sea distinto (por ejemplo, el aromatizante) y guarda.`);
                }}
                className={`${entradaAdmin} cursor-pointer`}
              >
                <option value="">Elige un producto…</option>
                {otras.map((o) => <option key={o.varianteId} value={o.varianteId}>{o.label}</option>)}
              </select>
              <span className="flex items-center gap-1 text-xs font-normal text-text-2"><Copy size={12} aria-hidden />Útil cuando solo cambia el aroma o el colorante.</span>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold min-[900px]:col-span-2">
            Notas (opcional)
            <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} placeholder="Orden de mezcla, tiempos…" className={entradaAdmin} />
          </label>
        </div>

        <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
          <div className="border-b border-line px-4 py-3">
            <h2 className="m-0 text-base font-bold">Materia prima por lote</h2>
          </div>
          {materias.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-text-2">
              Primero crea tu <Link href="/admin/materia-prima">catálogo de materia prima</Link>.
            </p>
          ) : (
            <>
              {ings.map((i) => {
                const m = porId.get(i.materiaId);
                return (
                  <div key={i.clave} className="grid grid-cols-[minmax(0,1fr)_150px_40px] items-end gap-2.5 border-b border-line px-4 py-3">
                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-text-2">
                      Materia prima
                      <select value={i.materiaId} onChange={(e) => cambiar(i.clave, { materiaId: e.target.value })} className={`${entradaAdmin} cursor-pointer`}>
                        <option value="">Elige…</option>
                        {materias.filter((x) => x.activo || x.id === i.materiaId).map((x) => (
                          <option key={x.id} value={x.id} disabled={ings.some((o) => o.materiaId === x.id && o.clave !== i.clave)}>
                            {x.nombre} ({x.unidad})
                          </option>
                        ))}
                      </select>
                      {m && <span className="font-medium">Hay {cantidad(m.stock, m.unidad)}</span>}
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-2">
                      Cantidad {m ? `(${m.unidad})` : ""}
                      <input value={i.cantidad} onChange={(e) => cambiar(i.clave, { cantidad: e.target.value })} inputMode="decimal" placeholder="0" className={`${entradaAdmin} text-right tabular-nums`} />
                    </label>
                    <button type="button" onClick={() => setIngs((xs) => (xs.length > 1 ? xs.filter((x) => x.clave !== i.clave) : [ingVacio()]))} aria-label="Quitar" className="flex h-11 w-10 items-center justify-center rounded-sm text-text-2 hover:bg-error-50 hover:text-error">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                );
              })}
              <div className="px-4 py-3">
                <button type="button" onClick={() => setIngs((xs) => [...xs, ingVacio()])} className={boton.secundario}>
                  <Plus size={16} aria-hidden />
                  Agregar materia prima
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[1180px]:sticky min-[1180px]:top-0">
        <h2 className="m-0 text-base font-bold">Resumen</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-sm tabular-nums">
          <dt className="text-text-2">Costo del lote</dt><dd className="m-0 text-right">{calc.sinCosto ? "—" : lempiras(calc.costoTotal)}</dd>
          <dt className="text-text-2">Costo por unidad</dt><dd className="m-0 text-right font-bold">{calc.costoUnitario == null ? "—" : lempiras(calc.costoUnitario)}</dd>
          <dt className="text-text-2">Se pueden hacer hoy</dt><dd className="m-0 text-right font-bold">{borrador.ingredientes.length ? `${calc.maximo} u.` : "—"}</dd>
        </dl>
        {calc.sinCosto && borrador.ingredientes.length > 0 && <p className="m-0 text-xs text-warning">Alguna materia prima no tiene costo: se calcula al comprarla.</p>}
        {error && <MensajeError>{error}</MensajeError>}
        {ok && (
          <div role="status" className="flex gap-2 rounded-sm bg-success-50 px-3 py-2.5 text-[13px] font-semibold text-success">
            <CheckCircle2 size={16} className="flex-none" aria-hidden />
            {ok}
          </div>
        )}
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              setError(null);
              const r = await guardarReceta({ varianteId: variante.id, rendimiento: rend, notas, ingredientes: ings.map((i) => ({ materiaId: i.materiaId, cantidad: i.cantidad })) });
              if (r.error) return setError(r.error);
              setOk(r.ok ?? "Guardada");
              router.refresh();
            })
          }
          className={`${boton.primario} h-12 justify-center text-[15px]`}
        >
          {pendiente ? "Guardando…" : "Guardar regla"}
        </button>
        {receta && (
          <Link href={`/admin/produccion?variante=${variante.id}`} className={`${boton.secundario} h-11 justify-center no-underline`}>
            <Factory size={16} aria-hidden />
            Producir este producto
          </Link>
        )}
      </div>
    </div>
  );
}
