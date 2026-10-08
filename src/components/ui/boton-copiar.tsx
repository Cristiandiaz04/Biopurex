"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [listo, setListo] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copiar ${etiqueta}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
        } catch {}
        setListo(true);
        setTimeout(() => setListo(false), 2000);
      }}
      className="flex size-11 items-center justify-center rounded-full hover:bg-navy-50"
    >
      {listo ? <Check size={16} strokeWidth={2.25} aria-hidden /> : <Copy size={16} strokeWidth={2.25} aria-hidden />}
      <span className="sr-only" aria-live="polite">{listo ? `${etiqueta} copiado` : ""}</span>
    </button>
  );
}
