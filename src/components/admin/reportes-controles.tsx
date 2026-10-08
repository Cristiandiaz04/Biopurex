"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { boton } from "./ui";
import { PERIODOS } from "@/lib/documentos";

export function ControlesReporte({ csv, nombre, conPeriodo }: { csv: (string | number)[][]; nombre: string; conPeriodo: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();

  function exportar() {
    const texto = csv.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {conPeriodo && (
        <select
          value={sp.get("periodo") ?? "30"}
          onChange={(e) => {
            const n = new URLSearchParams(sp.toString());
            n.set("periodo", e.target.value);
            router.replace(`?${n.toString()}`, { scroll: false });
          }}
          aria-label="Período"
          className="h-10 cursor-pointer rounded-full border-[1.5px] border-line bg-white px-3 text-sm font-semibold text-navy"
        >
          {PERIODOS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      )}
      <button type="button" onClick={exportar} disabled={csv.length <= 1} className={boton.primario}>
        <Download size={16} aria-hidden />
        Exportar CSV
      </button>
      <button type="button" onClick={() => window.print()} className={boton.secundario}>
        <Printer size={16} aria-hidden />
        PDF
      </button>
    </div>
  );
}
