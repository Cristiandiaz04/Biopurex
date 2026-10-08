"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, X } from "lucide-react";

/** Miniatura del comprobante + visor ampliable con zoom. */
export function Comprobante({ url, esPdf, codigo }: { url: string; esPdf: boolean; codigo: string }) {
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  if (esPdf)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold no-underline shadow-[inset_0_0_0_1px_var(--border)] hover:bg-surface">
        <ExternalLink size={16} aria-hidden />
        Ver comprobante (PDF)
      </a>
    );

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} aria-label="Ampliar comprobante" className="relative block cursor-zoom-in rounded-md bg-surface p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Comprobante del pedido ${codigo}`} className="mx-auto max-h-[260px] w-auto rounded-sm shadow-1" />
        <span className="absolute bottom-2.5 right-2.5 flex h-7 items-center gap-1.5 rounded-full bg-navy px-2.5 text-xs font-semibold text-white">
          <Maximize2 size={14} aria-hidden />
          Ampliar
        </span>
      </button>
      {abierto && (
        <div role="dialog" aria-modal="true" aria-label="Comprobante de transferencia" className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 p-4">
          <div onClick={() => setAbierto(false)} className="absolute inset-0 bg-[rgba(14,20,45,.82)]" />
          <div className="relative flex gap-2">
            <button type="button" onClick={() => setZoom((z) => !z)} className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-navy">
              <Maximize2 size={16} aria-hidden />
              {zoom ? "Ajustar" : "Ampliar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full bg-white text-navy">
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="relative max-h-[80vh] max-w-full overflow-auto rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Comprobante del pedido ${codigo}`} className={zoom ? "max-w-none" : "max-h-[78vh] max-w-[90vw] object-contain"} />
          </div>
        </div>
      )}
    </>
  );
}
