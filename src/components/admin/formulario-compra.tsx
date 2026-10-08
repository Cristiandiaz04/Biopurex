"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Info } from "lucide-react";
import { guardarCompra } from "@/acciones/admin-docs";
import { MensajeError } from "@/components/ui/campo";
import type { OpcionVariante } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { EditorLineas, lineaVacia, totalLineas, type Linea } from "./editor-lineas";
import { entradaAdmin } from "./modal";
import { boton } from "./ui";

export function FormularioCompra({
  inicial,
  proveedores,
  opciones,
  hoy,
}: {
  inicial?: { id: string; proveedorId: string; facturaProveedor: string | null; fecha: string; notas: string | null; lineas: { varianteId: string; cantidad: number; costo: number }[] };
  proveedores: { id: string; nombre: string }[];
  opciones: OpcionVariante[];
  hoy: string;
}) {
  const router = useRouter();
  const [proveedorId, setProveedorId] = useState(inicial?.proveedorId ?? "");
  const [factura, setFactura] = useState(inicial?.facturaProveedor ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy);
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [lineas, setLineasEstado] = useState<Linea[]>(() =>
    inicial?.lineas.length
      ? inicial.lineas.map((l) => ({ ...lineaVacia(), varianteId: l.varianteId, cantidad: String(l.cantidad), valor: l.costo.toFixed(2) }))
      : [lineaVacia()],
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const t = totalLineas(lineas, opciones, "costo");
  const isv = Math.round(t.monto * 15) / 100;

  function guardar(recibir: boolean) {
    setError(null);
    setOk(null);
    if (recibir && !window.confirm(`¿Confirmar la compra? Se sumarán ${t.unidades} unidades al inventario y ya no se podrá editar.`)) return;
    iniciar(async () => {
      const r = await guardarCompra({
        id: inicial?.id,
        proveedorId,
        facturaProveedor: factura,
        fecha,
        notas,
        lineas: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, costo: l.valor })),
        recibir,
      });
      if (r.error) {
        setError(r.error);
        if (r.id && !inicial?.id) router.replace(`/admin/compras/${r.id}`);
        return;
      }
      if (recibir || !inicial?.id) router.push(`/admin/compras/${r.id}`);
      else {
        setOk(r.ok ?? null);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[900px]:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Proveedor
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
              <option value="">Elige…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            {proveedores.length === 0 && (
              <span className="text-xs font-normal text-text-2">
                Primero <Link href="/admin/proveedores">crea un proveedor</Link>.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            N° factura del proveedor
            <input value={factura} onChange={(e) => setFactura(e.target.value)} maxLength={40} placeholder="000-001-01-00000000" className={`${entradaAdmin} font-mono`} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Fecha de recepción
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={entradaAdmin} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold min-[900px]:col-span-3">
            Notas (opcional)
            <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} className={entradaAdmin} />
          </label>
        </div>
        <EditorLineas lineas={lineas} setLineas={setLineasEstado} opciones={opciones} modo="costo" />
      </div>
      <div className="flex flex-col gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[1180px]:sticky min-[1180px]:top-0">
        <h2 className="m-0 text-base font-bold">Resumen</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-sm tabular-nums">
          <dt className="text-text-2">Líneas</dt><dd className="m-0 text-right">{t.lineas}</dd>
          <dt className="text-text-2">Unidades</dt><dd className="m-0 text-right">{t.unidades}</dd>
          <dt className="text-text-2">Subtotal</dt><dd className="m-0 text-right">{lempiras(t.monto)}</dd>
          <dt className="text-text-2">ISV 15 %</dt><dd className="m-0 text-right">{lempiras(isv)}</dd>
          <dt className="text-base font-bold">Total</dt><dd className="m-0 text-right text-base font-bold">{lempiras(t.monto + isv)}</dd>
        </dl>
        <div className="flex gap-2.5 rounded-sm bg-success-50 p-3 text-[13px] leading-[1.45]">
          <Info size={16} className="flex-none text-success" aria-hidden />
          <span>
            Al confirmar se sumarán <strong>{t.unidades} unidades</strong> al inventario y cada línea quedará como <strong>Entrada</strong> en el kardex de su variante. El costo del producto se actualiza con el de esta compra.
          </span>
        </div>
        {error && <MensajeError>{error}</MensajeError>}
        {ok && <span role="status" className="text-sm font-semibold text-success">{ok}</span>}
        <button type="button" onClick={() => guardar(true)} disabled={pendiente} className={`${boton.primario} h-12 justify-center text-[15px]`}>
          <Check size={16} strokeWidth={2.25} aria-hidden />
          Confirmar compra
        </button>
        <button type="button" onClick={() => guardar(false)} disabled={pendiente} className={`${boton.secundario} h-11 justify-center`}>
          {pendiente ? "Guardando…" : "Guardar borrador"}
        </button>
      </div>
    </div>
  );
}
