"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Factory, Minus, Plus } from "lucide-react";
import { producir } from "@/acciones/produccion";
import { MensajeError } from "@/components/ui/campo";
import type { MateriaPrima, Receta, VarianteFabricable } from "@/lib/datos/produccion";
import { lempiras } from "@/lib/formato";
import { calcularProduccion, cantidad } from "@/lib/unidades";
import { entradaAdmin } from "./modal";
import { boton, PuntoAroma, td, th } from "./ui";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Se registra por número de producciones: cada producción usa la materia prima de la regla
 * y rinde las unidades que dice la regla (ej. 1 producción = 20 galones, 2 = 40).
 */
export function FormularioProduccion({
  variantes,
  recetas,
  materias,
  inicial,
}: {
  variantes: VarianteFabricable[];
  recetas: Receta[];
  materias: MateriaPrima[];
  inicial: string;
}) {
  const router = useRouter();
  const porVariante = new Map(recetas.map((r) => [r.varianteId, r]));
  const fabricables = variantes.filter((v) => porVariante.has(v.id));
  const [vid, setVid] = useState(fabricables.some((v) => v.id === inicial) ? inicial : "");
  const [lotesTxt, setLotesTxt] = useState("1");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const receta = porVariante.get(vid);
  const v = fabricables.find((x) => x.id === vid);
  const lotes = Number(lotesTxt);
  const valida = Number.isInteger(lotes) && lotes > 0 && lotes <= 1000;
  const unidades = receta && valida ? lotes * receta.rendimiento : 0;
  const una = receta ? calcularProduccion(receta, receta.rendimiento, materias) : null;
  const calc = receta ? calcularProduccion(receta, unidades, materias) : null;
  const grupos = [...new Set(fabricables.map((x) => x.producto))];
  const cambiarLotes = (n: number) => {
    setLotesTxt(String(Math.max(1, Math.min(1000, n))));
    setOk(null);
  };

  if (!fabricables.length)
    return (
      <div className="rounded-md bg-white p-6 text-sm leading-normal shadow-[inset_0_0_0_1px_var(--border)]">
        <strong>Todavía no hay reglas de creación.</strong> Para producir, primero crea tu{" "}
        <Link href="/admin/materia-prima">materia prima</Link> y después la{" "}
        <Link href="/admin/produccion/reglas">regla de creación</Link> de cada producto.
      </div>
    );

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[900px]:grid-cols-[minmax(0,1fr)_200px]">
          <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-semibold">
            Producto a fabricar
            <select value={vid} onChange={(e) => { setVid(e.target.value); setLotesTxt("1"); setOk(null); setError(null); }} className={`${entradaAdmin} cursor-pointer`}>
              <option value="">Elige…</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {fabricables.filter((x) => x.producto === g).map((x) => (
                    <option key={x.id} value={x.id}>{x.etiqueta === g ? g : `${g} · ${x.etiqueta}`}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {v && <span className="flex items-center gap-1.5 text-xs font-normal text-text-2"><PuntoAroma aroma={v.aroma} />Stock actual en tienda: {v.stock}</span>}
          </label>
          <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
            <label htmlFor="producciones">Producciones</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => cambiarLotes((valida ? lotes : 1) - 1)} disabled={!receta || lotes <= 1} aria-label="Una producción menos" className="flex size-11 flex-none items-center justify-center rounded-sm shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-surface disabled:opacity-40">
                <Minus size={16} aria-hidden />
              </button>
              <input id="producciones" value={lotesTxt} onChange={(e) => { setLotesTxt(e.target.value.replace(/\D/g, "")); setOk(null); }} disabled={!receta} inputMode="numeric" className={`${entradaAdmin} text-center text-base font-bold tabular-nums`} />
              <button type="button" onClick={() => cambiarLotes((valida ? lotes : 0) + 1)} disabled={!receta} aria-label="Una producción más" className="flex size-11 flex-none items-center justify-center rounded-sm shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-surface disabled:opacity-40">
                <Plus size={16} aria-hidden />
              </button>
            </div>
            {calc && (
              <button type="button" onClick={() => cambiarLotes(calc.maximoLotes)} disabled={!calc.maximoLotes} className="self-end text-xs font-semibold underline disabled:opacity-40">
                Máximo: {calc.maximoLotes}
              </button>
            )}
          </div>
          {receta && una && (
            <div className="rounded-sm bg-navy-50 px-3.5 py-3 text-[13px] leading-normal min-[900px]:col-span-2">
              <strong>Regla:</strong> 1 producción = <strong>{fmt(receta.rendimiento)} u.</strong> con{" "}
              {una.lineas.map((l) => `${cantidad(l.necesario, l.unidad)} de ${l.nombre}`).join(", ")}.{" "}
              <Link href={`/admin/produccion/reglas/${vid}`}>Ver o cambiar la regla</Link>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold min-[900px]:col-span-2">
            Nota (opcional)
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ej.: lote de la mañana" className={entradaAdmin} />
          </label>
        </div>
        {calc && valida && (
          <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
            <div className="border-b border-line px-4 py-3">
              <h2 className="m-0 text-base font-bold">
                Materia prima para {lotes} {lotes === 1 ? "producción" : "producciones"}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead><tr><th className={th}>Materia prima</th><th className={`${th} text-right`}>Se usa</th><th className={`${th} text-right`}>Hay</th><th className={`${th} text-right`}>Queda</th><th className={`${th} text-right`}>Costo</th></tr></thead>
                <tbody>
                  {calc.lineas.map((l) => (
                    <tr key={l.materiaId} className={l.falta ? "bg-error-50" : ""}>
                      <td className={`${td} font-semibold`}>{l.nombre}{l.falta && <span className="ml-2 text-xs font-semibold text-error">Falta {cantidad(Math.round((l.necesario - l.stock) * 1000) / 1000, l.unidad)}</span>}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{cantidad(l.necesario, l.unidad)}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums text-text-2`}>{cantidad(l.stock, l.unidad)}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${l.falta ? "text-error" : ""}`}>{l.falta ? "—" : cantidad(Math.round((l.stock - l.necesario) * 1000) / 1000, l.unidad)}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{l.costo == null ? <span className="text-warning">Sin costo</span> : lempiras(l.costo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[1180px]:sticky min-[1180px]:top-0">
        <h2 className="m-0 text-base font-bold">Resumen</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-sm tabular-nums">
          <dt className="text-text-2">Producciones</dt><dd className="m-0 text-right">{receta && valida ? `${lotes} × ${fmt(receta.rendimiento)} u.` : "—"}</dd>
          <dt className="text-text-2">Unidades que entran a la tienda</dt><dd className="m-0 text-right font-bold">{unidades ? fmt(unidades) : "—"}</dd>
          <dt className="text-text-2">Costo total</dt><dd className="m-0 text-right">{calc && unidades && !calc.sinCosto ? lempiras(calc.costoTotal) : "—"}</dd>
          <dt className="text-text-2">Costo por unidad</dt><dd className="m-0 text-right font-bold">{calc?.costoUnitario != null && unidades ? lempiras(calc.costoUnitario) : "—"}</dd>
          <dt className="text-text-2">Stock en tienda después</dt><dd className="m-0 text-right font-bold">{v && unidades ? fmt(v.stock + unidades) : "—"}</dd>
        </dl>
        {calc && calc.faltantes.length > 0 && valida && (
          <div role="alert" className="flex gap-2 rounded-sm bg-error-50 px-3 py-2.5 text-[13px] font-semibold text-error">
            <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
            Falta materia prima. Compra o ajusta el stock antes de producir.
          </div>
        )}
        {error && <MensajeError>{error}</MensajeError>}
        {ok && (
          <div role="status" className="flex gap-2 rounded-sm bg-success-50 px-3 py-2.5 text-[13px] font-semibold text-success">
            <CheckCircle2 size={16} className="flex-none" aria-hidden />
            {ok}
          </div>
        )}
        <button
          type="button"
          disabled={pendiente || !receta || !valida || (calc?.faltantes.length ?? 0) > 0}
          onClick={() =>
            iniciar(async () => {
              setError(null);
              const r = await producir(vid, lotes, nota);
              if (r.error) return setError(r.error);
              setOk(`${r.ok}: +${fmt(unidades)} en tienda y la materia prima ya se descontó.`);
              setLotesTxt("1");
              setNota("");
              router.refresh();
            })
          }
          className={`${boton.primario} h-12 justify-center text-[15px]`}
        >
          <Factory size={16} aria-hidden />
          {pendiente ? "Registrando…" : "Registrar producción"}
        </button>
        <p className="m-0 text-xs leading-normal text-text-2">Se suma al inventario de la tienda (Entrada en el kardex) y el costo del producto pasa a ser el de esta producción.</p>
      </div>
    </div>
  );
}
