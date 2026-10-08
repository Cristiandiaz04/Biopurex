"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Plus, Tag } from "lucide-react";
import { alternarDescuento, guardarDescuento, type DatosDescuento } from "@/acciones/admin";
import { MensajeError } from "@/components/ui/campo";
import type { CodigoDescuento } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, td, th, Vacio } from "./ui";

const vacio: DatosDescuento = { codigo: "", porcentaje: "10", descripcion: "", clienteId: "", minimoCompra: "", validoHasta: "", usosMaximos: "", activo: true };

function estado(d: CodigoDescuento, hoy: string) {
  if (!d.activo) return { label: "Inactivo", clase: "bg-surface text-text-2" };
  if (d.validoHasta && d.validoHasta < hoy) return { label: "Vencido", clase: "bg-error-50 text-error" };
  if (d.usosMaximos !== null && d.usos >= d.usosMaximos) return { label: "Agotado", clase: "bg-warning-50 text-warning" };
  return { label: "Activo", clase: "bg-success-50 text-success" };
}

export function GestorDescuentos({ codigos, clientes, hoy }: { codigos: CodigoDescuento[]; clientes: { id: string; nombre: string }[]; hoy: string }) {
  const router = useRouter();
  const [form, setForm] = useState<DatosDescuento | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const set = <K extends keyof DatosDescuento>(k: K, v: DatosDescuento[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const err = (k: string) => errores[k] && <span className="text-xs font-semibold text-error">{errores[k]}</span>;

  function abrir(d?: CodigoDescuento) {
    setErrores({});
    setError(null);
    setForm(
      d
        ? {
            id: d.id,
            codigo: d.codigo,
            porcentaje: String(d.porcentaje),
            descripcion: d.descripcion ?? "",
            clienteId: d.clienteId ?? "",
            minimoCompra: d.minimoCompra == null ? "" : d.minimoCompra.toFixed(2),
            validoHasta: d.validoHasta ?? "",
            usosMaximos: d.usosMaximos == null ? "" : String(d.usosMaximos),
            activo: d.activo,
          }
        : vacio,
    );
  }

  function guardar() {
    if (!form) return;
    iniciar(async () => {
      const r = await guardarDescuento(form);
      if (r.error) {
        setError(r.error);
        setErrores(r.errores ?? {});
        return;
      }
      setForm(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="m-0 text-base font-bold">Códigos de descuento</h2>
          <button type="button" onClick={() => abrir()} className={boton.primario}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            Nuevo código
          </button>
        </div>
        {codigos.length === 0 ? (
          <Vacio titulo="Todavía no hay códigos" texto="Crea un código para tus clientes mayoristas. Ellos lo escriben al pagar y se les descuenta el porcentaje del subtotal." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Código</th>
                  <th className={`${th} text-right`}>Descuento</th>
                  <th className={th}>Para</th>
                  <th className={th}>Condiciones</th>
                  <th className={`${th} text-right`}>Usos</th>
                  <th className={th}>Estado</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {codigos.map((d) => {
                  const e = estado(d, hoy);
                  const cond = [d.minimoCompra != null && `Desde ${lempiras(d.minimoCompra)}`, d.validoHasta && `Vence ${d.validoHasta.split("-").reverse().join("/")}`]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr key={d.id}>
                      <td className={td}>
                        <div className="flex items-center gap-2 font-mono font-bold">
                          <Tag size={14} aria-hidden />
                          {d.codigo}
                        </div>
                        {d.descripcion && <div className="text-xs text-text-2">{d.descripcion}</div>}
                      </td>
                      <td className={`${td} text-right text-base font-bold tabular-nums`}>{d.porcentaje} %</td>
                      <td className={`${td} text-[13px]`}>{d.clienteNombre ?? "Todos los clientes"}</td>
                      <td className={`${td} text-[13px] text-text-2`}>{cond || "Sin condiciones"}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {d.usos}
                        {d.usosMaximos != null && <span className="text-text-2"> / {d.usosMaximos}</span>}
                      </td>
                      <td className={td}>
                        <Chip className={e.clase}>{e.label}</Chip>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <button
                          type="button"
                          disabled={pendiente}
                          onClick={() => iniciar(async () => { await alternarDescuento(d.id, !d.activo); router.refresh(); })}
                          className="h-8 rounded-full px-3 text-[13px] font-semibold shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-navy-50"
                        >
                          {d.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button type="button" onClick={() => abrir(d)} aria-label={`Editar ${d.codigo}`} className="ml-1 inline-flex size-8 items-center justify-center rounded-full align-middle hover:bg-surface">
                          <Pencil size={14} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <Modal titulo={form.id ? `Editar ${form.codigo}` : "Nuevo código de descuento"} sub="Se descuenta el porcentaje del subtotal de productos (no del envío)." cerrar={() => setForm(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Código
              <input value={form.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase().replace(/\s/g, ""))} maxLength={30} placeholder="MAYOREO10" className={`${entradaAdmin} font-mono uppercase`} />
              {err("codigo")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Descuento (%)
              <input value={form.porcentaje} onChange={(e) => set("porcentaje", e.target.value)} inputMode="decimal" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("porcentaje")}
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Descripción (opcional, solo la ves tú)
            <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={160} placeholder="Ej.: clientes de mayoreo, galones y 20 L" className={entradaAdmin} />
            {err("descripcion")}
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Para quién
            <select value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>Solo {c.nombre}</option>
              ))}
            </select>
            {err("clienteId")}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Compra mínima (L.)
              <input value={form.minimoCompra} onChange={(e) => set("minimoCompra", e.target.value)} inputMode="decimal" placeholder="Opcional" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("minimoCompra")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Vence
              <input type="date" value={form.validoHasta} onChange={(e) => set("validoHasta", e.target.value)} className={entradaAdmin} />
              {err("validoHasta")}
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Usos máximos
              <input value={form.usosMaximos} onChange={(e) => set("usosMaximos", e.target.value)} inputMode="numeric" placeholder="Sin límite" className={`${entradaAdmin} text-right tabular-nums`} />
              {err("usosMaximos")}
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="size-5 accent-[var(--navy)]" />
            Activo (los clientes ya lo pueden usar)
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setForm(null)} className={boton.secundario}>Cancelar</button>
            <button type="button" onClick={guardar} disabled={pendiente} className={boton.primario}>
              {pendiente ? "Guardando…" : form.id ? "Guardar" : "Crear código"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
