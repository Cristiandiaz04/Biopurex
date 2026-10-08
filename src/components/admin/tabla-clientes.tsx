"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { FilaCliente, TipoCliente } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { Chip, CHIP_TIPO, fechaCorta, td, th, Vacio } from "./ui";

const POR_PAGINA = 20;
const ETIQUETA: Record<TipoCliente, string> = { normal: "Normal", contra_entrega: "Pago contra entrega", credito: "Crédito" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function TablaClientes({ filas }: { filas: FilaCliente[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoCliente | null>(null);
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(0);

  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter(
      (c) => (!tipo || c.tipo === tipo) && (!nq || norm(`${c.nombre} ${c.correo} ${c.rtn ?? ""} ${c.ciudad ?? ""} ${c.telefono ?? ""}`).includes(nq)),
    );
  }, [filas, tipo, q]);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const chip = (sel: boolean) =>
    `inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${sel ? "bg-navy text-white" : "bg-white text-navy shadow-[inset_0_0_0_1.5px_var(--border)]"}`;

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => { setTipo(null); setPagina(0); }} className={chip(!tipo)}>
            Todos <span className="text-xs opacity-75">{filas.length}</span>
          </button>
          {(Object.keys(ETIQUETA) as TipoCliente[]).map((t) => (
            <button key={t} type="button" onClick={() => { setTipo(t); setPagina(0); }} className={chip(tipo === t)}>
              {ETIQUETA[t]} <span className="text-xs opacity-75">{filas.filter((c) => c.tipo === t).length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPagina(0); }} placeholder="Nombre, RTN, ciudad o teléfono" aria-label="Buscar clientes" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "No encontramos clientes" : "Todavía no hay clientes"} texto={filas.length ? "Revisa el nombre o RTN, o cambia la etiqueta." : "Cuando alguien cree su cuenta en la tienda, aparece aquí."} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Cliente</th>
                  <th className={th}>Ciudad</th>
                  <th className={th}>Teléfono</th>
                  <th className={th}>Etiqueta</th>
                  <th className={`${th} text-right`}>Pedidos</th>
                  <th className={th}>Última compra</th>
                  <th className={`${th} min-w-[170px]`}>Saldo / límite</th>
                </tr>
              </thead>
              <tbody>
                {lista.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA).map((c) => {
                  const uso = c.limite > 0 ? Math.min(100, (c.saldo / c.limite) * 100) : c.saldo > 0 ? 100 : 0;
                  return (
                    <tr key={c.id} onClick={() => router.push(`/admin/clientes/${c.id}`)} className="cursor-pointer hover:bg-surface">
                      <td className={td}>
                        <div className="font-semibold">{c.nombre}</div>
                        <div className="text-xs text-text-2">{c.rtn ? `RTN ${c.rtn}` : c.correo}</div>
                      </td>
                      <td className={td}>{c.ciudad ?? "—"}</td>
                      <td className={`${td} whitespace-nowrap`}>{c.telefono ? c.telefono.replace(/^(\d{4})(\d{4})$/, "$1-$2") : "—"}</td>
                      <td className={td}><Chip className={CHIP_TIPO[c.tipo]}>{ETIQUETA[c.tipo]}</Chip></td>
                      <td className={`${td} text-right tabular-nums`}>{c.pedidos}</td>
                      <td className={`${td} text-[13px] text-text-2`}>{c.ultimaCompra ? fechaCorta(c.ultimaCompra) : "—"}</td>
                      <td className={td}>
                        {c.tipo === "credito" || c.saldo > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums">
                              {lempiras(c.saldo)} / {lempiras(c.limite)}
                            </span>
                            <span className="h-[5px] overflow-hidden rounded-[3px] bg-surface">
                              <span className={`block h-full ${c.saldo > c.limite ? "bg-error" : uso > 80 ? "bg-warning" : "bg-navy"}`} style={{ width: `${uso}%` }} />
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-text-2">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-text-2">
            <span>Mostrando {pag * POR_PAGINA + 1}–{Math.min(lista.length, (pag + 1) * POR_PAGINA)} de {lista.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPagina(pag - 1)} disabled={pag === 0} aria-label="Página anterior" className="flex size-[34px] items-center justify-center rounded-full text-navy hover:bg-surface disabled:opacity-30"><ChevronLeft size={16} aria-hidden /></button>
              <span className="min-w-[60px] text-center font-semibold text-navy">{pag + 1} / {paginas}</span>
              <button type="button" onClick={() => setPagina(pag + 1)} disabled={pag >= paginas - 1} aria-label="Página siguiente" className="flex size-[34px] items-center justify-center rounded-full text-navy hover:bg-surface disabled:opacity-30"><ChevronRight size={16} aria-hidden /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
