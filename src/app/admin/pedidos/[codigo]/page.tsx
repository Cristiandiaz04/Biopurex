import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { AccionesPedido } from "@/components/admin/acciones-pedido";
import { ChatAdmin } from "@/components/admin/chat-admin";
import { Comprobante } from "@/components/admin/comprobante";
import { CabeceraTarjeta, Chip, CHIP_ESTADO, CHIP_TIPO, fechaCorta, nombreAroma, PuntoAroma, Tarjeta, td, th, TituloPagina } from "@/components/admin/ui";
import { ETIQUETA_TIPO, FORMA_PAGO, obtenerPedidoAdmin } from "@/lib/datos/admin";
import { lempiras } from "@/lib/formato";
import { ETIQUETA_ESTADO, FLUJO } from "@/lib/pedidos";

export const metadata = { title: "Pedido" };

async function Detalle({ params }: { params: PageProps<"/admin/pedidos/[codigo]">["params"] }) {
  const { codigo } = await params;
  const p = await obtenerPedidoAdmin(decodeURIComponent(codigo).toUpperCase());
  if (!p) notFound();

  const unidades = p.items.reduce((s, i) => s + i.cantidad, 0);
  const enEspera = p.estado === "esperando_pago" || p.estado === "pago_en_revision";
  const sobreLimite = p.tipoCliente === "credito" && p.cliente.saldo > p.cliente.limite;

  // Aviso según la regla del tipo de cliente (como en el diseño).
  const aviso =
    p.estado === "cancelado"
      ? { tono: "err", icono: XCircle, titulo: "Pedido cancelado", texto: `Motivo: ${p.motivoCancelacion ?? "—"}.` }
      : p.tipoCliente === "normal" && enEspera
        ? {
            tono: "warn",
            icono: AlertTriangle,
            titulo: `Cliente Normal · ${ETIQUETA_ESTADO[p.estado]}`,
            texto: `El pedido queda en espera hasta confirmar la transferencia. ${unidades} unidades están apartadas.${p.comprobanteUrl ? " Revisa el comprobante antes de confirmar." : ""}`,
          }
        : p.tipoCliente === "credito"
          ? {
              tono: sobreLimite ? "err" : "ok",
              icono: sobreLimite ? AlertTriangle : CheckCircle2,
              titulo: "Crédito · Confirmado al crear",
              texto: `Este pedido sumó ${lempiras(p.total)} al saldo del cliente. Saldo actual ${lempiras(p.cliente.saldo)} de un límite de ${lempiras(p.cliente.limite)}.${sobreLimite ? ` Supera su límite por ${lempiras(p.cliente.saldo - p.cliente.limite)}.` : ""}`,
            }
          : p.tipoCliente === "contra_entrega"
            ? { tono: "info", icono: Info, titulo: "Pago contra entrega", texto: p.metodoPagoEntrega ? `Cobrado en ${p.metodoPagoEntrega} al entregar.` : `Al entregar, registra el cobro de ${lempiras(p.total)}.` }
            : { tono: "ok", icono: CheckCircle2, titulo: "Pago confirmado", texto: "La transferencia fue verificada y el stock ya se descontó." };
  const tonos = {
    warn: "bg-warning-50 text-warning shadow-[inset_0_0_0_1px_var(--warning)]",
    err: "bg-error-50 text-error shadow-[inset_0_0_0_1px_var(--error)]",
    ok: "bg-success-50 text-success shadow-[inset_0_0_0_1px_var(--success)]",
    info: "bg-navy-50 text-navy shadow-[inset_0_0_0_1px_var(--navy)]",
  } as const;
  const Icono = aviso.icono;
  const isv = p.total - p.total / 1.15;
  const historial = [...FLUJO, "cancelado" as const].filter((e) => p.fechas[e]).map((e) => ({ e, f: p.fechas[e]! }));

  return (
    <>
      <TituloPagina
        volver={{ href: "/admin/pedidos", label: "Pedidos" }}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            Pedido {p.codigo}
            <Chip className={`${CHIP_ESTADO[p.estado]} h-7 px-3 font-sans text-[13px] normal-case`}>{ETIQUETA_ESTADO[p.estado]}</Chip>
          </span>
        }
        sub={`${fechaCorta(p.fechas.esperando_pago!, true)} · ${FORMA_PAGO[p.tipoCliente]}`}
      >
        <AccionesPedido pedidoId={p.id} codigo={p.codigo} estado={p.estado} tipoCliente={p.tipoCliente} total={p.total} unidades={unidades} />
      </TituloPagina>

      <div role="note" className={`mb-4 flex items-start gap-3 rounded-md px-4 py-3.5 ${tonos[aviso.tono as keyof typeof tonos]}`}>
        <Icono size={20} className="flex-none" aria-hidden />
        <div className="text-sm leading-normal text-navy">
          <strong className="text-inherit" style={{ color: "inherit" }}>{aviso.titulo}.</strong> {aviso.texto}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 min-[1180px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Tarjeta className="overflow-hidden">
            <CabeceraTarjeta titulo={`Productos · ${unidades} unidades`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr><th className={th}>Variante</th><th className={th}>SKU</th><th className={`${th} text-right`}>Cant.</th><th className={`${th} text-right`}>Precio</th><th className={`${th} text-right`}>Subtotal</th></tr>
                </thead>
                <tbody>
                  {p.items.map((it) => (
                    <tr key={it.id}>
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.img} alt="" className="size-10 flex-none object-contain" />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-semibold">{it.nombre}</span>
                            <span className="flex items-center gap-1.5 text-xs text-text-2"><PuntoAroma aroma={it.aroma} />{it.aromaNombre ?? nombreAroma(it.aroma)} · {it.tamano}</span>
                          </span>
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap font-mono text-xs text-text-2`}>{it.sku}</td>
                      <td className={`${td} text-right tabular-nums`}>{it.cantidad}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{lempiras(it.precio)}</td>
                      <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>{lempiras(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-4 py-3">
              <dl className="m-0 grid grid-cols-[auto_auto] gap-x-8 gap-y-1.5 text-sm tabular-nums">
                <dt className="text-text-2">Subtotal</dt><dd className="m-0 text-right">{lempiras(p.subtotal)}</dd>
                {p.descuento > 0 && (
                  <>
                    <dt className="text-success">Descuento {p.codigoDescuento} ({p.descuentoPorcentaje} %)</dt>
                    <dd className="m-0 text-right text-success">−{lempiras(p.descuento)}</dd>
                  </>
                )}
                <dt className="text-text-2">Envío · {p.zonaEnvio === "sps" ? "SPS" : "Resto del país"}</dt><dd className="m-0 text-right">{lempiras(p.envio)}</dd>
                <dt className="text-base font-bold">Total</dt><dd className="m-0 text-right text-base font-bold">{lempiras(p.total)}</dd>
                <dt className="text-xs text-text-2">ISV 15 % incluido</dt><dd className="m-0 text-right text-xs text-text-2">{lempiras(isv)}</dd>
              </dl>
            </div>
          </Tarjeta>
          <ChatAdmin pedidoId={p.id} cliente={p.cliente.nombre.split(" ")[0]} iniciales={p.mensajes} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Tarjeta className="flex flex-col gap-2.5 p-4">
            <h2 className="m-0 text-base font-bold">Cliente</h2>
            <div className="flex flex-col items-start gap-1.5">
              <span className="text-[15px] font-bold">{p.cliente.nombre}</span>
              <Chip className={CHIP_TIPO[p.tipoCliente]}>{ETIQUETA_TIPO[p.tipoCliente]}</Chip>
            </div>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-text-2">RTN</dt><dd className="m-0">{p.cliente.rtn ?? "—"}</dd>
              <dt className="text-text-2">Teléfono</dt><dd className="m-0"><a href={`tel:+504${p.cliente.telefono}`}>{p.cliente.telefono.replace(/^(\d{4})(\d{4})$/, "$1-$2")}</a></dd>
              <dt className="text-text-2">Correo</dt><dd className="m-0 break-all">{p.cliente.correo}</dd>
              <dt className="text-text-2">Envío a</dt><dd className="m-0 leading-[1.4]">{p.direccion}, {p.ciudad}</dd>
            </dl>
          </Tarjeta>
          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="m-0 text-base font-bold">Pago · {FORMA_PAGO[p.tipoCliente]}</h2>
            {p.comprobanteUrl ? (
              <Comprobante url={p.comprobanteUrl} esPdf={p.comprobanteEsPdf} codigo={p.codigo} />
            ) : p.tipoCliente === "normal" ? (
              <div className="rounded-md bg-surface p-4 text-sm leading-normal text-text-2">El cliente aún no sube su comprobante de transferencia.</div>
            ) : (
              <div className="rounded-md bg-surface p-4 text-sm leading-normal text-text-2">
                {p.tipoCliente === "credito" ? "Se cobra con el crédito del cliente." : "Se cobra al entregar."}
              </div>
            )}
          </Tarjeta>
          <Tarjeta className="p-4">
            <h2 className="mb-3 mt-0 text-base font-bold">Historial</h2>
            <ol className="m-0 flex list-none flex-col p-0">
              {historial.map(({ e, f }) => (
                <li key={e} className="flex gap-3 pb-3">
                  <span className={`mt-[3px] size-3 flex-none rounded-full ${e === "cancelado" ? "bg-error" : "bg-navy"}`} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{e === "esperando_pago" ? "Pedido creado" : ETIQUETA_ESTADO[e]}</span>
                    <span className="text-xs text-text-2">{fechaCorta(f, true)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}

export default function Pagina({ params }: PageProps<"/admin/pedidos/[codigo]">) {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Detalle params={params} />
    </Suspense>
  );
}
