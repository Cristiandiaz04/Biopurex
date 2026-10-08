"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Box, Check, PackageCheck, Truck, Wallet, X } from "lucide-react";
import { cancelarPedido, confirmarPago, marcarEntregado, marcarEnviado } from "@/acciones/admin";
import type { TipoCliente } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import type { EstadoPedido } from "@/lib/pedidos";
import { Modal } from "./modal";
import { boton } from "./ui";

const MOTIVOS = ["Cliente lo solicitó", "Pago no recibido", "Sin stock suficiente", "Datos de envío incorrectos", "Pedido duplicado", "Otro"];

export function AccionesPedido({
  pedidoId,
  codigo,
  estado,
  tipoCliente,
  total,
  unidades,
}: {
  pedidoId: string;
  codigo: string;
  estado: EstadoPedido;
  tipoCliente: TipoCliente;
  total: number;
  unidades: number;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [modal, setModal] = useState<"cancelar" | "cobro" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function ejecutar(fn: () => Promise<{ ok?: string; error?: string }>) {
    setError(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) {
        setError(r.error);
        return;
      }
      setModal(null);
      setAviso(r.ok ?? "Listo");
      setTimeout(() => setAviso(null), 2600);
      router.refresh();
    });
  }

  const enEspera = estado === "esperando_pago" || estado === "pago_en_revision";
  const acciones = [
    { label: "Confirmar pago", icono: Check, en: enEspera, porque: "Solo pedidos esperando pago", fn: () => confirmarPago(pedidoId, codigo) },
    { label: "Marcar enviado", icono: Truck, en: estado === "confirmado", porque: "Primero confirma el pedido", fn: () => marcarEnviado(pedidoId, codigo) },
    {
      label: "Marcar entregado",
      icono: PackageCheck,
      en: estado === "enviado",
      porque: "Primero márcalo como enviado",
      fn: () => marcarEntregado(pedidoId, codigo, null),
    },
  ];
  const cancelable = estado !== "entregado" && estado !== "cancelado";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {acciones.map(({ label, icono: Icono, en, porque, fn }) => (
          <button
            key={label}
            type="button"
            disabled={!en || pendiente}
            title={en ? label : porque}
            onClick={() => (label === "Marcar entregado" && tipoCliente === "contra_entrega" ? setModal("cobro") : ejecutar(fn))}
            className={en ? boton.primario : boton.secundario}
          >
            <Icono size={16} strokeWidth={2.25} aria-hidden />
            {label}
          </button>
        ))}
        <button type="button" disabled={!cancelable || pendiente} onClick={() => setModal("cancelar")} className={boton.peligro}>
          <X size={16} strokeWidth={2.25} aria-hidden />
          Cancelar
        </button>
      </div>
      {error && !modal && (
        <p role="alert" className="m-0 mt-2 w-full text-[13px] font-semibold text-error">
          {error}
        </p>
      )}

      {modal === "cancelar" && (
        <Modal titulo={`¿Cancelar el pedido ${codigo}?`} sub="Esta acción no se puede deshacer." cerrar={() => setModal(null)}>
          <div role="radiogroup" aria-label="Motivo" className="flex flex-col gap-1.5">
            <div className="mb-0.5 text-[13px] font-semibold">Motivo de cancelación</div>
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={motivo === m}
                onClick={() => setMotivo(m)}
                className={`flex min-h-11 items-center gap-3 rounded-sm px-3.5 text-left text-sm font-medium ${
                  motivo === m ? "bg-navy-50 shadow-[inset_0_0_0_1.5px_var(--navy)]" : "shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <span
                  className="size-[18px] flex-none rounded-full"
                  style={{ boxShadow: motivo === m ? "inset 0 0 0 5px var(--navy)" : "inset 0 0 0 1.5px var(--border)" }}
                />
                {m}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Detalle (opcional)
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Ej.: el cliente pidió cambiar a galón"
              className="resize-y rounded-sm border-[1.5px] border-line px-3 py-2.5 text-sm font-normal text-navy outline-none focus:border-navy"
            />
          </label>
          <div className="flex flex-col gap-1.5 rounded-sm bg-navy-50 px-3.5 py-3 text-[13px] leading-[1.45]">
            <span className="flex gap-2">
              <Box size={16} className="flex-none" aria-hidden />
              {enEspera ? `Las ${unidades} unidades apartadas se liberan.` : `Las ${unidades} unidades regresan al inventario como devolución.`}
            </span>
            {tipoCliente === "credito" && !enEspera && (
              <span className="flex gap-2">
                <Wallet size={16} className="flex-none" aria-hidden />
                Se restan {lempiras(total)} del saldo del cliente.
              </span>
            )}
          </div>
          {error && <div role="alert" className="text-[13px] font-semibold text-error">{error}</div>}
          <div className="flex flex-wrap justify-end gap-2.5">
            <button type="button" onClick={() => setModal(null)} className={boton.secundario}>
              Volver
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                if (!motivo) return setError("Elige el motivo de la cancelación");
                ejecutar(() => cancelarPedido(pedidoId, codigo, detalle.trim() ? `${motivo}: ${detalle.trim()}` : motivo));
              }}
              className="inline-flex h-10 items-center rounded-full bg-error px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Sí, cancelar pedido
            </button>
          </div>
        </Modal>
      )}

      {modal === "cobro" && (
        <Modal
          titulo="Registrar cobro contra entrega"
          sub={<>Al confirmar, el pedido queda «Entregado» con el cobro de <strong className="text-navy">{lempiras(total)}</strong>.</>}
          cerrar={() => setModal(null)}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Forma de cobro</span>
            <div className="flex flex-wrap gap-1.5">
              {(["efectivo", "tarjeta", "transferencia"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={metodo === m}
                  onClick={() => setMetodo(m)}
                  className={`h-11 rounded-full px-4 text-sm font-semibold capitalize ${metodo === m ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {error && <div role="alert" className="text-[13px] font-semibold text-error">{error}</div>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setModal(null)} className={boton.secundario}>
              Volver
            </button>
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => marcarEntregado(pedidoId, codigo, metodo))} className={boton.primario}>
              Confirmar entrega y cobro
            </button>
          </div>
        </Modal>
      )}

      {aviso && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-navy py-3 pl-3.5 pr-[18px] text-sm font-medium text-white shadow-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-green text-navy">
            <Check size={16} strokeWidth={2.25} aria-hidden />
          </span>
          {aviso}
        </div>
      )}
    </>
  );
}
