"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { actualizarCliente, registrarAbono } from "@/acciones/admin";
import type { TipoCliente } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { entradaAdmin, Modal } from "./modal";
import { boton } from "./ui";

/** Etiqueta del cliente (Normal / Contra entrega / Crédito) y límite de crédito. */
export function EtiquetaCliente({ id, tipo, limite }: { id: string; tipo: TipoCliente; limite: number }) {
  const router = useRouter();
  const [t, setT] = useState(tipo);
  const [lim, setLim] = useState(limite ? limite.toFixed(2) : "");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cambio = t !== tipo || (t === "credito" && Number(lim || 0) !== limite);

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-[13px] font-semibold">
        Etiqueta
        <select value={t} onChange={(e) => { setT(e.target.value as TipoCliente); setMsg(null); }} className="h-10 cursor-pointer rounded-full border-[1.5px] border-line bg-white px-3 text-sm font-semibold text-navy">
          <option value="normal">Normal</option>
          <option value="contra_entrega">Pago contra entrega</option>
          <option value="credito">Crédito</option>
        </select>
      </label>
      {t === "credito" && (
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Límite de crédito (L.)
          <input value={lim} onChange={(e) => { setLim(e.target.value); setMsg(null); }} inputMode="decimal" placeholder="0.00" className="h-10 w-36 rounded-full border-[1.5px] border-line bg-white px-3 text-right text-sm tabular-nums text-navy outline-none focus:border-navy" />
        </label>
      )}
      {cambio && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await actualizarCliente(id, t, t === "credito" ? lim : String(limite));
              setMsg(r);
              if (r.ok) router.refresh();
            })
          }
          className={boton.primario}
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      )}
      {msg?.ok && <span role="status" className="pb-2.5 text-[13px] font-semibold text-success">{msg.ok}</span>}
      {msg?.error && <span role="alert" className="pb-2.5 text-[13px] font-semibold text-error">{msg.error}</span>}
    </div>
  );
}

/** Botón + diálogo "Registrar abono" (se aplica a los pedidos más antiguos). */
export function BotonAbono({ id, nombre, saldo, chico }: { id: string; nombre: string; saldo: number; chico?: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const m = Number(monto.replace(/,/g, ""));
  const nuevo = Number.isFinite(m) ? saldo - m : saldo;

  return (
    <>
      <button
        type="button"
        disabled={saldo <= 0}
        onClick={() => { setAbierto(true); setError(null); setMonto(""); setRef(""); }}
        className={chico ? "h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-navy-50 disabled:opacity-40" : boton.primario}
      >
        {!chico && <Plus size={16} strokeWidth={2.25} aria-hidden />}
        Registrar abono
      </button>
      {abierto && (
        <Modal
          titulo="Registrar abono"
          sub={<>{nombre} · saldo actual <strong className="text-navy">{lempiras(saldo)}</strong>. Se aplica a los pedidos más antiguos primero.</>}
          cerrar={() => setAbierto(false)}
        >
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Monto (L.)
            <span className="flex gap-2">
              <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${entradaAdmin} text-right text-base tabular-nums`} />
              <button type="button" onClick={() => setMonto(saldo.toFixed(2))} className="h-11 flex-none rounded-sm px-3.5 text-[13px] font-semibold shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-navy-50">
                Saldo total
              </button>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Método
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
                {["Transferencia", "Depósito", "Cheque", "Efectivo"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Referencia
              <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} placeholder="Banco y N°" className={entradaAdmin} />
            </label>
          </div>
          <div className="flex justify-between rounded-sm bg-surface px-3.5 py-3 text-sm">
            <span className="text-text-2">Nuevo saldo</span>
            <strong className={`tabular-nums ${nuevo < 0 ? "text-error" : ""}`}>{lempiras(Math.max(nuevo, 0))}</strong>
          </div>
          {error && <div role="alert" className="text-[13px] font-semibold text-error">{error}</div>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setAbierto(false)} className={boton.secundario}>Cancelar</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await registrarAbono(id, monto, metodo, ref);
                  if (r.error) return setError(r.error);
                  setAbierto(false);
                  router.refresh();
                })
              }
              className={boton.primario}
            >
              {pendiente ? "Registrando…" : "Registrar abono"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
