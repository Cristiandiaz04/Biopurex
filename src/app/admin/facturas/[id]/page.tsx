import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccionesFactura } from "@/components/admin/facturas";
import { Emisor, Hoja } from "@/components/admin/hoja";
import { TituloPagina } from "@/components/admin/ui";
import { obtenerFactura } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";
import { lempirasEnLetras } from "@/lib/letras";

export const metadata = { title: "Factura" };

const thF = "bg-navy px-1.5 py-[7px] text-left text-[10px] font-bold uppercase tracking-[.06em] text-white print:[-webkit-print-color-adjust:exact]";
const tdF = "border-b border-line px-1.5 py-[7px]";

async function Factura({ params }: { params: PageProps<"/admin/facturas/[id]">["params"] }) {
  const { id } = await params;
  const f = await obtenerFactura(id);
  if (!f) notFound();
  const emitida = f.estado === "emitida";

  return (
    <>
      <div className="print:hidden">
        <TituloPagina volver={{ href: "/admin/facturas", label: "Facturas" }} titulo={`Factura ${f.codigo}`} sub={emitida ? undefined : `Anulada: ${f.motivoAnulacion ?? ""}`}>
          <AccionesFactura id={f.id} emitida={emitida} pedidoCodigo={f.pedidoCodigo} />
        </TituloPagina>
      </div>
      <Hoja anulada={!emitida}>
        <header className="flex flex-wrap items-start justify-between gap-6">
          <Emisor e={f.emisor} />
          <div className="text-right">
            <div className="font-display text-[34px] leading-none">Factura</div>
            <div className="mt-1.5 font-mono text-[15px] font-bold">N° {f.codigo}</div>
            <div>Fecha de emisión: {new Date(f.emitidaEn).toLocaleDateString("es-HN", { timeZone: "America/Tegucigalpa" })}</div>
          </div>
        </header>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.08em] text-text-2">Cliente</div>
            <div className="text-sm font-bold">{f.cliente.nombre}</div>
            <div>RTN del cliente: <strong>{f.cliente.rtn ?? "Consumidor final"}</strong></div>
            <div>{f.cliente.direccion}</div>
          </div>
          <div className="grid grid-cols-[auto_1fr] content-start gap-x-2.5 gap-y-0.5">
            <span className="text-text-2">Condición</span><span>{f.condicion}</span>
            <span className="text-text-2">Pedido</span><span>{f.pedidoCodigo}</span>
          </div>
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr><th className={thF}>Cant.</th><th className={thF}>Código</th><th className={thF}>Descripción</th><th className={`${thF} text-right`}>Precio unit.</th><th className={`${thF} text-right`}>Total</th></tr>
          </thead>
          <tbody>
            {f.lineas.map((l) => (
              <tr key={l.id}>
                <td className={`${tdF} tabular-nums`}>{l.cantidad}</td>
                <td className={`${tdF} whitespace-nowrap font-mono text-[11px]`}>{l.sku}</td>
                <td className={tdF}>{l.descripcion}</td>
                <td className={`${tdF} whitespace-nowrap text-right tabular-nums`}>{lempiras(l.precio)}</td>
                <td className={`${tdF} whitespace-nowrap text-right tabular-nums`}>{lempiras(l.total)}</td>
              </tr>
            ))}
            {f.envio > 0 && (
              <tr>
                <td className={`${tdF} tabular-nums`}>1</td>
                <td className={`${tdF} font-mono text-[11px]`}>ENVIO</td>
                <td className={tdF}>Servicio de envío</td>
                <td className={`${tdF} text-right tabular-nums`}>{lempiras(f.envio)}</td>
                <td className={`${tdF} text-right tabular-nums`}>{lempiras(f.envio)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[240px] flex-1 rounded-xs bg-surface px-3 py-2.5 print:[-webkit-print-color-adjust:exact]">
            <div className="text-[10px] font-bold uppercase tracking-[.08em] text-text-2">Total en letras</div>
            <div className="text-[13px] font-bold">{lempirasEnLetras(f.total)}</div>
          </div>
          <dl className="m-0 grid min-w-[260px] grid-cols-[auto_auto] gap-x-7 gap-y-1 tabular-nums">
            <dt>Descuentos y rebajas{f.descuentoPorcentaje ? ` (${f.descuentoPorcentaje} %)` : ""}</dt><dd className="m-0 text-right">{lempiras(f.descuento)}</dd>
            <dt>Importe exento</dt><dd className="m-0 text-right">{lempiras(0)}</dd>
            <dt>Importe gravado 15 %</dt><dd className="m-0 text-right">{lempiras(f.gravado)}</dd>
            <dt>ISV 15 %</dt><dd className="m-0 text-right">{lempiras(f.isv)}</dd>
            <dt className="border-t-2 border-navy pt-1.5 text-[15px] font-bold">Total a pagar</dt>
            <dd className="m-0 border-t-2 border-navy pt-1.5 text-right text-[15px] font-bold">{lempiras(f.total)}</dd>
          </dl>
        </div>
        <footer className="flex flex-wrap justify-between gap-4 border-t border-line pt-3 text-[11px] text-text-2">
          <span>Original: Cliente · Copia: Emisor</span>
          <span>Precios con ISV incluido</span>
        </footer>
      </Hoja>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/facturas/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Factura params={params} />
    </Suspense>
  );
}
