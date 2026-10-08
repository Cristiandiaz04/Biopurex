"use client";

import { Plus, Trash2 } from "lucide-react";
import { aromaVar, esAroma } from "@/lib/catalogo";
import type { OpcionVariante } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { entradaAdmin } from "./modal";
import { boton } from "./ui";

export type Linea = { clave: string; varianteId: string; cantidad: string; valor: string };

let contador = 0;
export const lineaVacia = (): Linea => ({ clave: `l${Date.now()}-${contador++}`, varianteId: "", cantidad: "1", valor: "" });

/**
 * Líneas por variante. modo "costo": el admin escribe el costo (compras).
 * modo "precio": el precio sale del producto y no se edita (cotizaciones).
 */
export function EditorLineas({
  lineas,
  setLineas,
  opciones,
  modo,
}: {
  lineas: Linea[];
  setLineas: (f: (l: Linea[]) => Linea[]) => void;
  opciones: OpcionVariante[];
  modo: "costo" | "precio";
}) {
  const porId = new Map(opciones.map((o) => [o.id, o]));
  const grupos = [...new Set(opciones.map((o) => o.producto))];
  const cambiar = (clave: string, cambios: Partial<Linea>) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="border-b border-line px-4 py-3">
        <h2 className="m-0 text-base font-bold">{modo === "costo" ? "Líneas por variante" : "Productos"}</h2>
      </div>
      {lineas.map((l, i) => {
        const o = porId.get(l.varianteId);
        const cant = Number(l.cantidad) || 0;
        const unit = modo === "costo" ? Number(l.valor.replace(/,/g, "")) || 0 : (o?.precio ?? 0);
        return (
          <div key={l.clave} className="grid grid-cols-1 items-end gap-2.5 border-b border-line px-4 py-3 min-[900px]:grid-cols-[minmax(0,1fr)_110px_140px_120px_40px]">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-text-2">
              Variante {lineas.length > 1 && i + 1}
              <span className="relative flex items-center">
                <span
                  className="pointer-events-none absolute left-3 size-3.5 rounded-full"
                  style={{ background: o && esAroma(o.aroma) ? aromaVar(o.aroma) : "var(--border)" }}
                />
                <select
                  value={l.varianteId}
                  onChange={(e) => {
                    const nueva = porId.get(e.target.value);
                    cambiar(l.clave, { varianteId: e.target.value, valor: modo === "costo" && !l.valor && nueva?.costo != null ? nueva.costo.toFixed(2) : l.valor });
                  }}
                  className={`${entradaAdmin} cursor-pointer pl-8`}
                >
                  <option value="">Elige un producto…</option>
                  {grupos.map((g) => (
                    <optgroup key={g} label={g}>
                      {opciones
                        .filter((x) => x.producto === g)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.etiqueta === g ? g : `${g} · ${x.etiqueta}`}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </span>
              {o && (
                <span className={`font-medium ${modo === "precio" && o.disponible < cant ? "text-error" : ""}`}>
                  {o.sku} · stock {o.stock}, disponible {o.disponible}
                  {modo === "precio" && o.disponible < cant && " — no alcanza"}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-2">
              Cantidad
              <input value={l.cantidad} onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })} inputMode="numeric" className={`${entradaAdmin} text-right tabular-nums`} />
            </label>
            {modo === "costo" ? (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-2">
                Costo unitario (L.)
                <input value={l.valor} onChange={(e) => cambiar(l.clave, { valor: e.target.value })} inputMode="decimal" placeholder="0.00" className={`${entradaAdmin} text-right tabular-nums`} />
              </label>
            ) : (
              <div className="flex flex-col gap-1.5 text-xs font-semibold text-text-2">
                Precio
                <span className="flex h-11 items-center justify-end text-sm tabular-nums text-navy">{o ? (o.precio == null ? "Sin precio" : lempiras(o.precio)) : "—"}</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5 text-xs font-semibold text-text-2">
              Subtotal
              <span className="flex h-11 items-center justify-end text-sm font-bold tabular-nums text-navy">{lempiras(unit * cant)}</span>
            </div>
            <button
              type="button"
              onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.clave !== l.clave) : [lineaVacia()]))}
              aria-label="Quitar línea"
              className="flex h-11 w-10 items-center justify-center rounded-sm text-text-2 hover:bg-error-50 hover:text-error"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        );
      })}
      <div className="px-4 py-3">
        <button type="button" onClick={() => setLineas((ls) => [...ls, lineaVacia()])} className={boton.secundario}>
          <Plus size={16} aria-hidden />
          Agregar línea
        </button>
      </div>
    </div>
  );
}

export function totalLineas(lineas: Linea[], opciones: OpcionVariante[], modo: "costo" | "precio") {
  const porId = new Map(opciones.map((o) => [o.id, o]));
  return lineas.reduce(
    (acc, l) => {
      if (!l.varianteId) return acc;
      const cant = Number(l.cantidad) || 0;
      const unit = modo === "costo" ? Number(l.valor.replace(/,/g, "")) || 0 : (porId.get(l.varianteId)?.precio ?? 0);
      return { unidades: acc.unidades + cant, monto: acc.monto + unit * cant, lineas: acc.lineas + 1 };
    },
    { unidades: 0, monto: 0, lineas: 0 },
  );
}
