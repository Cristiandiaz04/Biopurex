import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccionesCotizacion, CHIP_COT } from "@/components/admin/cotizaciones";
import { Emisor, Hoja, tdDoc, thDoc } from "@/components/admin/hoja";
import { Chip, TituloPagina } from "@/components/admin/ui";
import { configuracionAdmin, obtenerCotizacion, opcionesVariantes } from "@/lib/datos/admin-docs";
import { lempiras } from "@/lib/formato";

export const metadata = { title: "Cotización" };

const ETIQUETA = { normal: "Normal (transferencia)", contra_entrega: "Pago contra entrega", credito: "Crédito" };
const fecha = (d: string) => d.split("-").reverse().join("/");

async function Cotizacion({ params }: { params: PageProps<"/admin/cotizaciones/[id]">["params"] }) {
  const { id } = await params;
  const [q, conf, opciones] = await Promise.all([obtenerCotizacion(id), configuracionAdmin(), opcionesVariantes()]);
  if (!q) notFound();
  const disp = new Map(opciones.map((o) => [o.id, o.disponible]));
  const faltantes = q.lineas.filter((l) => (disp.get(l.varianteId) ?? 0) < l.cantidad).map((l) => `${l.descripcion} (pide ${l.cantidad}, hay ${disp.get(l.varianteId) ?? 0})`);
  const sinIsv = Math.round((q.total / 1.15) * 100) / 100;

  return (
    <>
      <div className="print:hidden">
        <TituloPagina
          volver={{ href: "/admin/cotizaciones", label: "Cotizaciones" }}
          titulo={
            <span className="flex flex-wrap items-center gap-3">
              Cotización {q.codigo}
              <Chip className={`h-7 px-3 font-sans text-[13px] normal-case ${CHIP_COT[q.estado][1]}`}>{CHIP_COT[q.estado][0]}</Chip>
            </span>
          }
        >
          <AccionesCotizacion
            id={q.id}
            codigo={q.codigo}
            estado={q.estado}
            pedidoCodigo={q.pedidoCodigo}
            tipo={q.cliente.tipo}
            cliente={q.cliente.nombre}
            total={q.total}
            faltantes={faltantes}
            sinDireccion={!q.cliente.direccion}
          />
        </TituloPagina>
      </div>
      <Hoja>
        <header className="flex flex-wrap items-start justify-between gap-6">
          <Emisor e={{ razon: conf.razonSocial, rtn: conf.rtnEmisor || null, direccion: conf.direccionEmisor, telefono: conf.telefonoEmisor, correo: conf.correoEmisor }} />
          <div className="flex flex-col gap-1 text-right">
            <div className="font-display text-[34px] leading-none">Cotización</div>
            <div className="text-[15px] font-bold">{q.codigo}</div>
            <div className="text-text-2">
              Fecha {new Date(q.creadoEn).toLocaleDateString("es-HN", { timeZone: "America/Tegucigalpa" })} · Válida hasta {fecha(q.validaHasta)}
            </div>
          </div>
        </header>
        <div className="h-1 rounded-sm bg-navy" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-text-2">Cliente</div>
            <div className="text-[15px] font-bold">{q.cliente.nombre}</div>
            <div className="text-text-2">
              {q.cliente.rtn && <>RTN {q.cliente.rtn}<br /></>}
              {q.cliente.direccion && <>{q.cliente.direccion}<br /></>}
              {[q.cliente.telefono?.replace(/^(\d{4})(\d{4})$/, "$1-$2"), q.cliente.correo].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-text-2">Condiciones</div>
            <div className="leading-[1.6]">
              Vigencia: {q.vigenciaDias} días
              <br />
              Forma de pago: {ETIQUETA[q.cliente.tipo]}
              <br />
              Precios en lempiras, ISV incluido. Envío no incluido.
            </div>
          </div>
        </div>
        <table className="w-full border-collapse">
          <thead><tr><th className={thDoc}>Cant.</th><th className={thDoc}>Descripción</th><th className={`${thDoc} text-right`}>Precio</th><th className={`${thDoc} text-right`}>Total</th></tr></thead>
          <tbody>
            {q.lineas.map((l) => (
              <tr key={l.id}>
                <td className={`${tdDoc} tabular-nums`}>{l.cantidad}</td>
                <td className={tdDoc}>
                  <div className="font-semibold">{l.descripcion}</div>
                  <div className="font-mono text-[11px] text-text-2">{l.sku}</div>
                </td>
                <td className={`${tdDoc} whitespace-nowrap text-right tabular-nums`}>{lempiras(l.precio)}</td>
                <td className={`${tdDoc} whitespace-nowrap text-right font-semibold tabular-nums`}>{lempiras(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-[220px] flex-1 text-text-2">
            {q.notas && (
              <>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-[.08em]">Notas</div>
                <div className="text-navy">{q.notas}</div>
              </>
            )}
          </div>
          <dl className="m-0 grid grid-cols-[auto_auto] gap-x-8 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-text-2">Subtotal</dt><dd className="m-0 text-right">{lempiras(sinIsv)}</dd>
            <dt className="text-text-2">ISV 15 %</dt><dd className="m-0 text-right">{lempiras(q.total - sinIsv)}</dd>
            <dt className="text-[17px] font-bold">Total</dt><dd className="m-0 text-right text-[17px] font-bold">{lempiras(q.total)}</dd>
          </dl>
        </div>
        <footer className="border-t border-line pt-4 text-xs text-text-2">
          Esta cotización no es un documento fiscal. Precios sujetos a disponibilidad de inventario al momento del pedido.
        </footer>
      </Hoja>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/cotizaciones/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Cotizacion params={params} />
    </Suspense>
  );
}
