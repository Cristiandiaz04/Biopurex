"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Printer, Receipt, Search, XCircle } from "lucide-react";
import { anularFactura, emitirFactura } from "@/acciones/admin-docs";
import { MensajeError } from "@/components/ui/campo";
import type { FilaFactura } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, td, th, Vacio } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const POR_PAGINA = 25;

export function TablaFacturas({ filas }: { filas: FilaFactura[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pag, setPag] = useState(0);
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((f) => !nq || norm(`${f.codigo} ${f.cliente} ${f.rtn ?? ""} ${f.pedidoCodigo}`).includes(nq));
  }, [filas, q]);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const p = Math.min(pag, paginas - 1);

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="border-b border-line px-4 py-3.5">
        <label className="flex h-10 max-w-[360px] items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPag(0); }} placeholder="N° de factura, cliente, RTN o pedido" aria-label="Buscar facturas" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo="No encontramos facturas" texto="Las facturas se emiten desde el detalle de un pedido confirmado." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead><tr><th className={th}>N° factura</th><th className={th}>Fecha</th><th className={th}>Cliente</th><th className={th}>Pedido</th><th className={th}>Condición</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr></thead>
              <tbody>
                {lista.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA).map((f) => (
                  <tr key={f.id} onClick={() => router.push(`/admin/facturas/${f.id}`)} className="cursor-pointer hover:bg-surface">
                    <td className={`${td} whitespace-nowrap font-mono text-[13px] font-bold`}>{f.codigo}</td>
                    <td className={`${td} text-[13px]`}>{new Date(f.emitidaEn).toLocaleDateString("es-HN", { timeZone: "America/Tegucigalpa" })}</td>
                    <td className={td}>
                      <div className="font-semibold">{f.cliente}</div>
                      <div className="text-xs text-text-2">{f.rtn ? `RTN ${f.rtn}` : "Consumidor final"}</div>
                    </td>
                    <td className={`${td} text-[13px]`}>{f.pedidoCodigo}</td>
                    <td className={`${td} text-[13px]`}>{f.condicion}</td>
                    <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.total)}</td>
                    <td className={td}>{f.estado === "emitida" ? <Chip className="bg-success-50 text-success">Emitida</Chip> : <Chip className="bg-error-50 text-error">Anulada</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-text-2">
              <span>Página {p + 1} de {paginas}</span>
              <div className="flex gap-1">
                <button type="button" disabled={p === 0} onClick={() => setPag(p - 1)} className={boton.secundario}>Anterior</button>
                <button type="button" disabled={p >= paginas - 1} onClick={() => setPag(p + 1)} className={boton.secundario}>Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AccionesFactura({ id, emitida, pedidoCodigo }: { id: string; emitida: boolean; pedidoCodigo: string }) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Link href={`/admin/pedidos/${pedidoCodigo}`} className={`${boton.secundario} no-underline`}>Pedido {pedidoCodigo}</Link>
      {emitida && (
        <button type="button" onClick={() => { setError(null); setModal(true); }} className={boton.peligro}>
          <XCircle size={16} aria-hidden />
          Anular
        </button>
      )}
      <button type="button" onClick={() => window.print()} className={boton.primario}>
        <Printer size={16} aria-hidden />
        Imprimir
      </button>
      {modal && (
        <Modal titulo="Anular factura" sub="La factura queda marcada como anulada y se puede emitir una nueva para el mismo pedido." cerrar={() => setModal(false)}>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Motivo
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ej.: RTN del cliente incorrecto" className={entradaAdmin} />
          </label>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setModal(false)} className={boton.secundario}>Volver</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => iniciar(async () => {
                const r = await anularFactura(id, motivo);
                if (r.error) return setError(r.error);
                setModal(false);
                router.refresh();
              })}
              className="inline-flex h-10 items-center rounded-full bg-error px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Anular factura
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/** En el detalle del pedido: enlace a su factura o botón para emitirla. */
export function BotonFactura({ pedidoId, codigoPedido, factura, puede }: { pedidoId: string; codigoPedido: string; factura: { id: string; codigo: string } | null; puede: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  if (factura)
    return (
      <Link href={`/admin/facturas/${factura.id}`} className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-[13px] no-underline shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface">
        <Receipt size={16} aria-hidden />
        <span className="flex-1">Factura <strong>{factura.codigo}</strong></span>
        <ChevronRight size={16} aria-hidden />
      </Link>
    );
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!puede || pendiente}
        title={puede ? undefined : "Se factura cuando el pedido está confirmado"}
        onClick={() => iniciar(async () => {
          const r = await emitirFactura(pedidoId, codigoPedido);
          if (r.error) return setError(r.error);
          router.push(`/admin/facturas/${r.id}`);
        })}
        className={`${boton.secundario} justify-center`}
      >
        <Receipt size={16} aria-hidden />
        {pendiente ? "Emitiendo…" : "Emitir factura"}
      </button>
      {error && <span className="text-[13px] font-semibold text-error">{error}</span>}
    </div>
  );
}
