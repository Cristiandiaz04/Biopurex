"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { lempiras } from "@/lib/formato";
import { BotonAbono } from "./acciones-cliente";
import { boton, Chip, fechaCorta, td, th } from "./ui";

export type FilaCuenta = {
  id: string;
  nombre: string;
  limite: number;
  saldo: number;
  t0: number;
  t1: number;
  t2: number;
  ultimoAbono: string | null;
};

export function TablaCuentas({ filas }: { filas: FilaCuenta[] }) {
  const [soloViejos, setSoloViejos] = useState(false);
  const lista = soloViejos ? filas.filter((f) => f.t2 > 0) : filas;

  function exportar() {
    const enc = ["Cliente", "Límite", "0-30", "31-60", "+60", "Saldo", "Último abono"];
    const csv = [enc, ...filas.map((f) => [f.nombre, f.limite, f.t0, f.t1, f.t2, f.saldo, f.ultimoAbono ? f.ultimoAbono.slice(0, 10) : ""])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuentas-por-cobrar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="m-0 text-base font-bold">Antigüedad de saldos por cliente</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={soloViejos}
            onClick={() => setSoloViejos((v) => !v)}
            className={`inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${soloViejos ? "bg-error-50 text-error shadow-[inset_0_0_0_1.5px_var(--error)]" : "shadow-[inset_0_0_0_1.5px_var(--border)]"}`}
          >
            <AlertTriangle size={14} aria-hidden />
            Solo con saldo +60 días
          </button>
          <button type="button" onClick={exportar} disabled={!filas.length} className={`${boton.secundario} h-[34px]`}>
            <Download size={14} aria-hidden />
            Exportar CSV
          </button>
        </div>
      </div>
      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-50 text-success">
            <CheckCircle2 size={28} aria-hidden />
          </span>
          <div className="text-[17px] font-bold">{filas.length ? "Ningún cliente con saldo de más de 60 días" : "No hay cuentas por cobrar"}</div>
          {soloViejos && filas.length > 0 && (
            <button type="button" onClick={() => setSoloViejos(false)} className={boton.primario}>
              Ver todos
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Cliente</th>
                <th className={`${th} text-right`}>Límite</th>
                <th className={`${th} text-right`}>0–30</th>
                <th className={`${th} text-right`}>31–60</th>
                <th className={`${th} text-right`}>+60</th>
                <th className={`${th} text-right`}>Saldo</th>
                <th className={th}>Último abono</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td className={td}>
                    <Link href={`/admin/clientes/${f.id}`} className="flex flex-col items-start gap-1 no-underline">
                      <span className="font-semibold underline decoration-line underline-offset-[3px]">{f.nombre}</span>
                      {f.saldo > f.limite && <Chip chico className="bg-error-50 text-error">Sobre límite</Chip>}
                    </Link>
                  </td>
                  <td className={`${td} text-right text-[13px] tabular-nums text-text-2`}>{lempiras(f.limite)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{lempiras(f.t0)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${f.t1 > 0 ? "text-warning" : ""}`}>{lempiras(f.t1)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums ${f.t2 > 0 ? "text-error" : ""}`}>{lempiras(f.t2)}</td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{lempiras(f.saldo)}</td>
                  <td className={`${td} whitespace-nowrap text-[13px] text-text-2`}>{f.ultimoAbono ? fechaCorta(f.ultimoAbono) : "—"}</td>
                  <td className={`${td} text-right`}>
                    <BotonAbono id={f.id} nombre={f.nombre} saldo={f.saldo} chico />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
