"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FilaCompra } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { Chip, td, th, Vacio } from "./ui";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const fecha = (d: string) => d.split("-").reverse().join("/");

export function TablaCompras({ filas }: { filas: FilaCompra[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"todas" | "borrador" | "recibida">("todas");
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((f) => (estado === "todas" || f.estado === estado) && (!nq || norm(`${f.codigo} ${f.proveedor} ${f.facturaProveedor ?? ""}`).includes(nq)));
  }, [filas, estado, q]);
  const chip = (sel: boolean) => `inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${sel ? "bg-navy text-white" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`;

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["todas", "Todas"],
              ["borrador", "Borradores"],
              ["recibida", "Recibidas"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setEstado(id)} className={chip(estado === id)}>
              {label} <span className="text-xs opacity-75">{id === "todas" ? filas.length : filas.filter((f) => f.estado === id).length}</span>
            </button>
          ))}
        </div>
        <label className="flex h-10 min-w-[200px] max-w-[340px] flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-text-2 shadow-[inset_0_0_0_1px_var(--border)]">
          <Search size={16} aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° de compra, proveedor o factura" aria-label="Buscar compras" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none" />
        </label>
      </div>
      {lista.length === 0 ? (
        <Vacio titulo={filas.length ? "No hay compras con estos filtros" : "Todavía no hay compras"} texto={filas.length ? undefined : "Registra lo que te entrega cada proveedor: al confirmar, el inventario se actualiza solo."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr><th className={th}>Compra</th><th className={th}>Proveedor</th><th className={th}>Fecha</th><th className={th}>Factura proveedor</th><th className={`${th} text-right`}>Unidades</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} onClick={() => router.push(`/admin/compras/${f.id}`)} className="cursor-pointer hover:bg-surface">
                  <td className={`${td} whitespace-nowrap font-bold`}>{f.codigo}</td>
                  <td className={td}>{f.proveedor}</td>
                  <td className={`${td} text-[13px] text-text-2`}>{fecha(f.fecha)}</td>
                  <td className={`${td} whitespace-nowrap font-mono text-xs`}>{f.facturaProveedor ?? "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{f.unidades}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.total)}</td>
                  <td className={td}>{f.estado === "recibida" ? <Chip className="bg-success-50 text-success">Recibida</Chip> : <Chip className="bg-surface text-text-2">Borrador</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
