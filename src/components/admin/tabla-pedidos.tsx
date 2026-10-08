"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Paperclip, Search } from "lucide-react";
import type { FilaPedidoAdmin, TipoCliente } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { ETIQUETA_ESTADO, type EstadoPedido } from "@/lib/pedidos";
import { Chip, CHIP_ESTADO, CHIP_TIPO, fechaCorta, td, th, Vacio } from "./ui";

const POR_PAGINA = 20;
const ETIQUETA_TIPO: Record<TipoCliente, string> = { normal: "Normal", contra_entrega: "Pago contra entrega", credito: "Crédito" };
const PAGO: Record<TipoCliente, string> = { normal: "Transferencia", contra_entrega: "Contra entrega", credito: "Crédito" };
const FILTROS: { id: string; label: string; estados: EstadoPedido[] | null }[] = [
  { id: "todos", label: "Todos", estados: null },
  { id: "por_confirmar", label: "Por confirmar", estados: ["esperando_pago", "pago_en_revision"] },
  { id: "confirmado", label: "Confirmados", estados: ["confirmado"] },
  { id: "enviado", label: "Enviados", estados: ["enviado"] },
  { id: "entregado", label: "Entregados", estados: ["entregado"] },
  { id: "cancelado", label: "Cancelados", estados: ["cancelado"] },
];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function TablaPedidos({ filas }: { filas: FilaPedidoAdmin[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [filtro, setFiltro] = useState(FILTROS.some((f) => f.id === sp.get("estado")) ? sp.get("estado")! : "todos");
  const [q, setQ] = useState("");
  const [pago, setPago] = useState<"todas" | TipoCliente>("todas");
  const [pagina, setPagina] = useState(0);

  const lista = useMemo(() => {
    const est = FILTROS.find((f) => f.id === filtro)?.estados;
    const nq = norm(q.trim());
    return filas.filter(
      (f) =>
        (!est || est.includes(f.estado)) &&
        (pago === "todas" || f.tipoCliente === pago) &&
        (!nq || norm(`${f.codigo} ${f.cliente} ${f.telefono}`).includes(nq)),
    );
  }, [filas, filtro, q, pago]);

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visibles = lista.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);
  const limpiar = () => {
    setFiltro("todos");
    setQ("");
    setPago("todas");
    setPagina(0);
  };

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => {
            const n = f.estados ? filas.filter((x) => f.estados!.includes(x.estado)).length : filas.length;
            const sel = f.id === filtro;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={sel}
                onClick={() => {
                  setFiltro(f.id);
                  setPagina(0);
                }}
                className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${
                  sel ? "bg-navy text-white" : "bg-white text-navy shadow-[inset_0_0_0_1.5px_var(--border)]"
                }`}
              >
                {f.label}
                <span className="text-xs tabular-nums opacity-75">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-10 min-w-[200px] max-w-[360px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagina(0);
              }}
              placeholder="Buscar por N° de pedido, cliente o teléfono"
              aria-label="Buscar pedidos"
              className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none"
            />
          </label>
          <select
            value={pago}
            onChange={(e) => {
              setPago(e.target.value as typeof pago);
              setPagina(0);
            }}
            aria-label="Forma de pago"
            className="h-10 cursor-pointer rounded-full border-[1.5px] border-line bg-white px-3 text-sm font-semibold text-navy"
          >
            <option value="todas">Toda forma de pago</option>
            <option value="normal">Transferencia (Normal)</option>
            <option value="credito">Crédito</option>
            <option value="contra_entrega">Contra entrega</option>
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "No hay pedidos con estos filtros" : "Todavía no hay pedidos"} texto={filas.length ? "Prueba otro estado o forma de pago, o revisa la búsqueda." : "Cuando un cliente compre en la tienda, su pedido aparece aquí."}>
          {filas.length > 0 && (
            <button type="button" onClick={limpiar} className="h-10 rounded-full bg-navy px-[18px] text-sm font-semibold text-white">
              Limpiar filtros
            </button>
          )}
          {filas.length === 0 && <Inbox size={28} className="text-text-2" aria-hidden />}
        </Vacio>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Pedido</th>
                  <th className={th}>Fecha</th>
                  <th className={th}>Cliente</th>
                  <th className={th}>Productos</th>
                  <th className={th}>Pago</th>
                  <th className={`${th} text-right`}>Total</th>
                  <th className={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} onClick={() => router.push(`/admin/pedidos/${f.codigo}`)} className="cursor-pointer hover:bg-surface">
                    <td className={`${td} whitespace-nowrap font-bold`}>
                      <a href={`/admin/pedidos/${f.codigo}`} onClick={(e) => e.preventDefault()} className="no-underline">
                        {f.codigo}
                      </a>
                    </td>
                    <td className={`${td} whitespace-nowrap text-[13px] text-text-2`}>{fechaCorta(f.creadoEn, true)}</td>
                    <td className={td}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">{f.cliente}</span>
                        <Chip chico className={CHIP_TIPO[f.tipoCliente]}>{ETIQUETA_TIPO[f.tipoCliente]}</Chip>
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap text-[13px] text-text-2`}>
                      {f.unidades} u. · {f.lineas} {f.lineas === 1 ? "variante" : "variantes"}
                    </td>
                    <td className={`${td} whitespace-nowrap text-[13px]`}>
                      {PAGO[f.tipoCliente]}
                      {f.comprobante && <Paperclip size={13} className="ml-1 inline text-text-2" aria-label="Con comprobante" />}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.total)}</td>
                    <td className={td}>
                      <Chip className={CHIP_ESTADO[f.estado]}>{ETIQUETA_ESTADO[f.estado]}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-text-2">
            <span>
              Mostrando {pag * POR_PAGINA + 1}–{Math.min(lista.length, (pag + 1) * POR_PAGINA)} de {lista.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPagina(pag - 1)} disabled={pag === 0} aria-label="Página anterior" className="flex size-[34px] items-center justify-center rounded-full text-navy hover:bg-surface disabled:opacity-30">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="min-w-[60px] text-center font-semibold text-navy">
                {pag + 1} / {paginas}
              </span>
              <button type="button" onClick={() => setPagina(pag + 1)} disabled={pag >= paginas - 1} aria-label="Página siguiente" className="flex size-[34px] items-center justify-center rounded-full text-navy hover:bg-surface disabled:opacity-30">
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
