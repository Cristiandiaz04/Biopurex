"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Info, Printer, Search, ShoppingBag } from "lucide-react";
import { convertirCotizacion, guardarCotizacion, renovarCotizacion } from "@/acciones/admin-docs";
import { MensajeError } from "@/components/ui/campo";
import type { TipoCliente } from "@/lib/datos/admin";
import type { FilaCotizacion, OpcionVariante } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { EditorLineas, lineaVacia, totalLineas, type Linea } from "./editor-lineas";
import { entradaAdmin, Modal } from "./modal";
import { boton, Chip, CHIP_TIPO, td, th, Vacio } from "./ui";
import { CHIP_COT } from "@/lib/documentos";

const ETIQUETA: Record<TipoCliente, string> = { normal: "Normal", contra_entrega: "Pago contra entrega", credito: "Crédito" };
const REGLA: Record<TipoCliente, string> = {
  normal: "Cliente Normal: el pedido queda en «Esperando pago» y aparta el stock hasta que confirmes la transferencia.",
  contra_entrega: "Contra entrega: el pedido queda «Confirmado» y el cobro se registra al entregar.",
  credito: "Crédito: el pedido queda «Confirmado» y se suma a su saldo.",
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const fecha = (d: string) => d.split("-").reverse().join("/");

export function FormularioCotizacion({ clientes, opciones, clienteInicial }: { clientes: { id: string; nombre: string; tipo: TipoCliente }[]; opciones: OpcionVariante[]; clienteInicial: string }) {
  const router = useRouter();
  const [cliente, setCliente] = useState(clienteInicial);
  const [vigencia, setVigencia] = useState(15);
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const t = totalLineas(lineas, opciones, "precio");
  const sinIsv = Math.round((t.monto / 1.15) * 100) / 100;

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[900px]:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Cliente
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={`${entradaAdmin} cursor-pointer`}>
              <option value="">Elige…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} · {ETIQUETA[c.tipo]}</option>
              ))}
            </select>
            <span className="text-xs font-normal text-text-2">El cliente tiene que tener cuenta en la tienda.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Vigencia
            <select value={vigencia} onChange={(e) => setVigencia(Number(e.target.value))} className={`${entradaAdmin} cursor-pointer`}>
              <option value={7}>7 días</option>
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold min-[900px]:col-span-2">
            Notas para el cliente
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={500} placeholder="Condiciones de entrega, forma de pago…" className="resize-y rounded-sm border-[1.5px] border-line px-3 py-2.5 text-sm font-normal text-navy outline-none focus:border-navy" />
          </label>
        </div>
        <EditorLineas lineas={lineas} setLineas={setLineas} opciones={opciones} modo="precio" />
      </div>
      <div className="flex flex-col gap-3.5 rounded-md bg-white p-4 shadow-[inset_0_0_0_1px_var(--border)] min-[1180px]:sticky min-[1180px]:top-0">
        <h2 className="m-0 text-base font-bold">Resumen</h2>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-2 text-sm tabular-nums">
          <dt className="text-text-2">Subtotal sin ISV</dt><dd className="m-0 text-right">{lempiras(sinIsv)}</dd>
          <dt className="text-text-2">ISV 15 %</dt><dd className="m-0 text-right">{lempiras(t.monto - sinIsv)}</dd>
          <dt className="text-base font-bold">Total</dt><dd className="m-0 text-right text-base font-bold">{lempiras(t.monto)}</dd>
        </dl>
        <p className="m-0 text-xs text-text-2">Precios de venta vigentes, ISV incluido. El envío se calcula al convertir en pedido.</p>
        {error && <MensajeError>{error}</MensajeError>}
        <button
          type="button"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              setError(null);
              const r = await guardarCotizacion({ clienteId: cliente, vigenciaDias: vigencia, notas, lineas: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad })) });
              if (r.error) return setError(r.error);
              router.push(`/admin/cotizaciones/${r.id}`);
            })
          }
          className={`${boton.primario} h-12 justify-center text-[15px]`}
        >
          {pendiente ? "Guardando…" : "Guardar y ver cotización"}
        </button>
      </div>
    </div>
  );
}

export function TablaCotizaciones({ filas }: { filas: FilaCotizacion[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"todas" | FilaCotizacion["estado"]>("todas");
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((f) => (estado === "todas" || f.estado === estado) && (!nq || norm(`${f.codigo} ${f.cliente}`).includes(nq)));
  }, [filas, estado, q]);
  const chip = (sel: boolean) => `inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${sel ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`;

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setEstado("todas")} className={chip(estado === "todas")}>Todas <span className="text-xs opacity-75">{filas.length}</span></button>
          {(Object.keys(CHIP_COT) as (keyof typeof CHIP_COT)[]).map((k) => (
            <button key={k} type="button" onClick={() => setEstado(k)} className={chip(estado === k)}>
              {CHIP_COT[k][0]}s <span className="text-xs opacity-75">{filas.filter((f) => f.estado === k).length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° o cliente" aria-label="Buscar cotizaciones" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "No hay cotizaciones en este estado" : "Todavía no hay cotizaciones"} texto={filas.length ? undefined : "Prepara precios para un negocio y conviértelos en pedido cuando el cliente acepte."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr><th className={th}>Cotización</th><th className={th}>Cliente</th><th className={th}>Fecha</th><th className={th}>Válida hasta</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr></thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} onClick={() => router.push(`/admin/cotizaciones/${f.id}`)} className="cursor-pointer hover:bg-surface">
                  <td className={`${td} font-bold`}>{f.codigo}</td>
                  <td className={td}>{f.cliente}</td>
                  <td className={`${td} text-[13px] text-text-2`}>{new Date(f.creadoEn).toLocaleDateString("es-HN", { timeZone: "America/Tegucigalpa" })}</td>
                  <td className={`${td} text-[13px] text-text-2`}>{fecha(f.validaHasta)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.total)}</td>
                  <td className={td}><Chip className={CHIP_COT[f.estado][1]}>{CHIP_COT[f.estado][0]}{f.pedidoCodigo ? ` · ${f.pedidoCodigo}` : ""}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AccionesCotizacion({
  id,
  codigo,
  estado,
  pedidoCodigo,
  tipo,
  cliente,
  total,
  faltantes,
  sinDireccion,
}: {
  id: string;
  codigo: string;
  estado: FilaCotizacion["estado"];
  pedidoCodigo: string | null;
  tipo: TipoCliente;
  cliente: string;
  total: number;
  faltantes: string[];
  sinDireccion: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <>
      <button type="button" onClick={() => window.print()} className={boton.secundario}>
        <Printer size={16} aria-hidden />
        Imprimir
      </button>
      {estado === "vencida" && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciar(async () => { await renovarCotizacion(id, 15); router.refresh(); })}
          className={boton.secundario}
        >
          Renovar vigencia (15 días)
        </button>
      )}
      {estado === "convertida" && pedidoCodigo ? (
        <a href={`/admin/pedidos/${pedidoCodigo}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-success-50 px-4 text-sm font-semibold text-success no-underline">
          Ver pedido {pedidoCodigo}
        </a>
      ) : (
        <button type="button" disabled={estado !== "emitida"} title={estado === "vencida" ? "Renueva la vigencia primero" : undefined} onClick={() => { setError(null); setModal(true); }} className={boton.primario}>
          <ShoppingBag size={16} aria-hidden />
          Convertir en pedido
        </button>
      )}
      {modal && (
        <Modal titulo={`Convertir ${codigo} en pedido`} sub={<><strong className="text-navy">{cliente}</strong> <Chip className={CHIP_TIPO[tipo]}>{ETIQUETA[tipo]}</Chip></>} cerrar={() => setModal(false)}>
          <div className="flex gap-2.5 rounded-sm bg-navy-50 px-3.5 py-3 text-sm leading-normal">
            <Info size={16} className="mt-0.5 flex-none" aria-hidden />
            {REGLA[tipo]} Se usan la dirección guardada del cliente y los precios vigentes.
          </div>
          {sinDireccion && (
            <div role="alert" className="flex gap-2.5 rounded-sm bg-error-50 px-3.5 py-3 text-sm font-semibold text-error">
              <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
              El cliente no tiene una dirección guardada. Pídele que agregue una en Mi cuenta.
            </div>
          )}
          {faltantes.length > 0 && (
            <div className="flex gap-2.5 rounded-sm bg-warning-50 px-3.5 py-3 text-[13px] font-semibold leading-[1.45] text-warning">
              <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
              Stock insuficiente: {faltantes.join(", ")}
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-2">Total de productos (sin envío)</span>
            <strong className="text-base tabular-nums">{lempiras(total)}</strong>
          </div>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={() => setModal(false)} className={boton.secundario}>Volver</button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await convertirCotizacion(id);
                  if (r.error) return setError(r.error);
                  router.push(`/admin/pedidos/${r.codigo}`);
                })
              }
              className={boton.primario}
            >
              {pendiente ? "Creando…" : "Crear pedido"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
