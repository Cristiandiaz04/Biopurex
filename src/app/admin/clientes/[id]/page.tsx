import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { BotonAbono, EtiquetaCliente } from "@/components/admin/acciones-cliente";
import { CabeceraTarjeta, Chip, CHIP_ESTADO, fechaCorta, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { documentosPendientes, porTramo } from "@/lib/cobros";
import { obtenerCliente } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/lib/pedidos";

export const metadata = { title: "Ficha de cliente" };

const REGLA = {
  normal: "sus pedidos quedan en «Esperando pago» y apartan stock hasta que confirmes la transferencia.",
  contra_entrega: "sus pedidos quedan «Confirmados» al crearse y el cobro se registra al entregar.",
  credito: "sus pedidos quedan «Confirmados» al crearse y suman a su saldo. Se avisa si pasa su límite.",
};
const ETQ = { normal: "Normal", contra_entrega: "Pago contra entrega", credito: "Crédito" };
const CHIP_TRAMO = { "0-30": "bg-navy-50 text-navy", "31-60": "bg-warning-50 text-warning", "+60": "bg-error-50 text-error" };

async function Ficha({ params }: { params: PageProps<"/admin/clientes/[id]">["params"] }) {
  const { id } = await params;
  const c = await obtenerCliente(id);
  if (!c) notFound();
  const validos = c.pedidos.filter((p) => p.estado !== "cancelado");
  const docs = documentosPendientes(
    c.pedidos.filter((p) => p.tipoCliente === "credito" && p.estado !== "cancelado").map((p) => ({ codigo: p.codigo, fecha: p.creadoEn, total: p.total })),
    c.saldo,
    c.ahora,
  );
  const tramos = porTramo(docs);
  const uso = c.limite > 0 ? Math.min(100, (c.saldo / c.limite) * 100) : c.saldo > 0 ? 100 : 0;
  const sobre = c.saldo > c.limite;
  const conCredito = c.tipo === "credito" || c.saldo > 0;

  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/clientes", label: "Clientes" }}
        titulo={c.nombre}
        sub={`${validos.length} pedidos · ${lempiras(validos.reduce((s, p) => s + p.total, 0))} comprados${c.esAdmin ? " · cuenta de administrador" : ""}`}
      >
        <EtiquetaCliente id={c.id} tipo={c.tipo} limite={c.limite} />
      </TituloPagina>

      <div className="mb-4 flex items-start gap-2.5 rounded-md bg-navy-50 px-4 py-3 text-sm leading-normal">
        <Info size={16} className="mt-0.5 flex-none" aria-hidden />
        <span>
          <strong>{ETQ[c.tipo]}:</strong> {REGLA[c.tipo]}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {conCredito && (
            <>
              <Tarjeta className="flex flex-col gap-3.5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="m-0 text-base font-bold">Crédito</h2>
                  <BotonAbono id={c.id} nombre={c.nombre} saldo={c.saldo} />
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                  <div>
                    <div className="text-xs font-semibold text-text-2">Límite</div>
                    <div className="text-xl font-bold tabular-nums">{lempiras(c.limite)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-2">Saldo</div>
                    <div className="text-xl font-bold tabular-nums">{lempiras(c.saldo)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-2">Disponible</div>
                    <div className="text-xl font-bold tabular-nums">{lempiras(Math.max(0, c.limite - c.saldo))}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-2 overflow-hidden rounded bg-surface">
                    <div className={`h-full ${sobre ? "bg-error" : uso > 80 ? "bg-warning" : "bg-navy"}`} style={{ width: `${uso}%` }} />
                  </div>
                  <span className="text-xs text-text-2">{Math.round(uso)} % del límite usado</span>
                </div>
                {sobre && (
                  <div role="alert" className="flex gap-2.5 rounded-sm bg-error-50 px-3.5 py-3 text-sm font-semibold leading-[1.45] text-error">
                    <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden />
                    Supera su límite por {lempiras(c.saldo - c.limite)}.
                  </div>
                )}
                <div className="flex flex-wrap gap-6 text-[13px]">
                  <div>
                    <span className="text-text-2">0–30 días</span> <strong className="tabular-nums">{lempiras(tramos["0-30"])}</strong>
                  </div>
                  <div>
                    <span className="text-text-2">31–60</span> <strong className="tabular-nums text-warning">{lempiras(tramos["31-60"])}</strong>
                  </div>
                  <div>
                    <span className="text-text-2">+60</span> <strong className="tabular-nums text-error">{lempiras(tramos["+60"])}</strong>
                  </div>
                </div>
              </Tarjeta>
              <Tarjeta className="overflow-hidden">
                <CabeceraTarjeta titulo="Documentos pendientes" />
                {docs.length === 0 ? (
                  <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Sin saldo pendiente. ¡Cuenta al día!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse">
                      <thead>
                        <tr><th className={th}>Documento</th><th className={th}>Fecha</th><th className={th}>Antigüedad</th><th className={`${th} text-right`}>Monto</th><th className={`${th} text-right`}>Abonado</th><th className={`${th} text-right`}>Saldo</th></tr>
                      </thead>
                      <tbody>
                        {docs.map((d) => (
                          <tr key={d.codigo}>
                            <td className={`${td} font-mono text-[13px]`}><Link href={`/admin/pedidos/${d.codigo}`}>{d.codigo}</Link></td>
                            <td className={`${td} text-[13px]`}>{fechaCorta(d.fecha)}</td>
                            <td className={td}><Chip className={CHIP_TRAMO[d.tramo]}>{d.dias} días</Chip></td>
                            <td className={`${td} text-right text-[13px] tabular-nums`}>{lempiras(d.total)}</td>
                            <td className={`${td} text-right text-[13px] tabular-nums text-text-2`}>{lempiras(d.abonado)}</td>
                            <td className={`${td} text-right text-[13px] font-bold tabular-nums`}>{lempiras(d.pendiente)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tarjeta>
              <Tarjeta className="overflow-hidden">
                <CabeceraTarjeta titulo="Abonos" />
                {c.abonos.length === 0 ? (
                  <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Aún no hay abonos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse">
                      <thead>
                        <tr><th className={th}>Fecha</th><th className={th}>Método</th><th className={th}>Referencia</th><th className={`${th} text-right`}>Monto</th></tr>
                      </thead>
                      <tbody>
                        {c.abonos.map((a) => (
                          <tr key={a.id}>
                            <td className={`${td} text-[13px]`}>{fechaCorta(a.creadoEn, true)}</td>
                            <td className={`${td} text-[13px]`}>{a.metodo}</td>
                            <td className={`${td} text-[13px] text-text-2`}>{a.referencia ?? "—"}</td>
                            <td className={`${td} text-right text-[13px] font-bold tabular-nums text-success`}>{lempiras(a.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tarjeta>
            </>
          )}
          <Tarjeta className="overflow-hidden">
            <CabeceraTarjeta titulo="Historial de pedidos" />
            {c.pedidos.length === 0 ? (
              <p className="m-0 px-4 py-8 text-center text-sm text-text-2">Este cliente aún no tiene pedidos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr><th className={th}>Pedido</th><th className={th}>Fecha</th><th className={`${th} text-right`}>Total</th><th className={th}>Estado</th></tr>
                  </thead>
                  <tbody>
                    {c.pedidos.map((p) => (
                      <tr key={p.codigo} className="hover:bg-surface">
                        <td className={`${td} font-bold`}><Link href={`/admin/pedidos/${p.codigo}`} className="no-underline hover:underline">{p.codigo}</Link></td>
                        <td className={`${td} text-[13px]`}>{fechaCorta(p.creadoEn)}</td>
                        <td className={`${td} text-right font-semibold tabular-nums`}>{lempiras(p.total)}</td>
                        <td className={td}><Chip className={CHIP_ESTADO[p.estado]}>{ETIQUETA_ESTADO[p.estado]}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
        </div>
        <Tarjeta className="flex flex-col gap-3 p-4">
          <h2 className="m-0 text-base font-bold">Datos</h2>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-2">RTN</dt>
            <dd className="m-0">{c.rtn ?? "—"}</dd>
            <dt className="text-text-2">Teléfono</dt>
            <dd className="m-0">{c.telefono ? <a href={`tel:+504${c.telefono}`}>{c.telefono.replace(/^(\d{4})(\d{4})$/, "$1-$2")}</a> : "—"}</dd>
            <dt className="text-text-2">Correo</dt>
            <dd className="m-0 [overflow-wrap:anywhere]">{c.correo}</dd>
            <dt className="text-text-2">Ciudad</dt>
            <dd className="m-0">{c.ciudad ?? "—"}</dd>
            <dt className="text-text-2">Dirección</dt>
            <dd className="m-0 leading-[1.4]">{c.direccion ?? "—"}</dd>
            <dt className="text-text-2">Cliente desde</dt>
            <dd className="m-0">{fechaCorta(c.creadoEn)}</dd>
          </dl>
        </Tarjeta>
      </div>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/clientes/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Ficha params={params} />
    </Suspense>
  );
}
