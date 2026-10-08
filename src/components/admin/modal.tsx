"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Diálogo del panel (fondo oscuro, Esc para cerrar). */
export function Modal({ titulo, sub, children, cerrar }: { titulo: string; sub?: React.ReactNode; children: React.ReactNode; cerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cerrar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div onClick={cerrar} className="absolute inset-0 bg-[var(--scrim)]" />
      <div className="relative flex max-h-full w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-6 shadow-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-bold">{titulo}</h2>
            {sub && <p className="mb-0 mt-1.5 text-sm text-text-2">{sub}</p>}
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="flex size-10 flex-none items-center justify-center rounded-full hover:bg-surface">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const entradaAdmin = "h-11 w-full rounded-sm border-[1.5px] border-line bg-white px-3 text-sm text-navy outline-none focus:border-navy";
