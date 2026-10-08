import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { esAroma, AROMAS, aromaVar } from "@/lib/catalogo";
import type { TipoCliente } from "@/lib/datos/admin";
import type { EstadoPedido } from "@/lib/pedidos";

/** Estilos de insignia del panel (Sistema de Diseño · Admin). */
export const CHIP_ESTADO: Record<EstadoPedido, string> = {
  esperando_pago: "bg-warning-50 text-warning",
  pago_en_revision: "bg-navy-50 text-navy",
  confirmado: "bg-green-50 text-success",
  enviado: "bg-navy text-white",
  entregado: "bg-success-50 text-success",
  cancelado: "bg-error-50 text-error",
};

export const CHIP_TIPO: Record<TipoCliente, string> = {
  normal: "bg-white text-navy shadow-[inset_0_0_0_1px_var(--border)]",
  contra_entrega: "bg-navy-50 text-navy",
  credito: "bg-green-50 text-success",
};

export function Chip({ className, children, chico }: { className: string; children: React.ReactNode; chico?: boolean }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold ${chico ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-xs"} ${className}`}>
      {children}
    </span>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)] ${className}`}>{children}</div>;
}

export function CabeceraTarjeta({ titulo, children }: { titulo: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <h2 className="m-0 text-base font-bold">{titulo}</h2>
      {children}
    </div>
  );
}

export function TituloPagina({ titulo, sub, children, volver }: { titulo: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; volver?: { href: string; label: string } }) {
  return (
    <>
      {volver && (
        <Link href={volver.href} className="-ml-1.5 mb-2 inline-flex h-9 items-center gap-1.5 rounded-full pl-1.5 pr-2.5 text-sm font-semibold no-underline hover:bg-white">
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          {volver.label}
        </Link>
      )}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display m-0 text-[32px] leading-none">{titulo}</h1>
          {sub && <div className="text-sm text-text-2">{sub}</div>}
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </>
  );
}

export function PuntoAroma({ aroma, tam = 10 }: { aroma: string | null; tam?: number }) {
  return (
    <span
      className="inline-block flex-none rounded-full"
      style={{ width: tam, height: tam, background: esAroma(aroma) ? aromaVar(aroma) : "var(--white)", boxShadow: "inset 0 0 0 1px rgba(30,42,94,.2)" }}
    />
  );
}

export const nombreAroma = (a: string | null) => (esAroma(a) ? AROMAS[a] : "Sin aroma");

export const th = "whitespace-nowrap border-b border-line bg-surface px-3 py-2.5 text-left text-xs font-semibold text-text-2 first:pl-4 last:pr-4";
export const td = "border-b border-line px-3 py-2.5 text-sm first:pl-4 last:pr-4";

export const boton = {
  primario: "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40",
  secundario: "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-navy shadow-[inset_0_0_0_1.5px_var(--border)] hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40",
  peligro: "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-semibold text-error shadow-[inset_0_0_0_1.5px_var(--error)] hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-40",
};

export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
      <div className="text-[17px] font-bold">{titulo}</div>
      {texto && <div className="max-w-[42ch] text-sm leading-normal text-text-2">{texto}</div>}
      {children}
    </div>
  );
}

/** Fecha corta "8 oct" / con hora. */
export function fechaCorta(iso: string, conHora = false) {
  const d = new Date(iso);
  const f = d.toLocaleDateString("es-HN", { day: "numeric", month: "short", timeZone: "America/Tegucigalpa" }).replace(".", "");
  return conHora ? `${f} · ${d.toLocaleTimeString("es-HN", { hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" })}` : f;
}

export function hace(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return dias <= 0 ? "Hoy" : dias === 1 ? "Ayer" : `Hace ${dias} días`;
}
