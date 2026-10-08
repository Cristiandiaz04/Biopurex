import Image from "next/image";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { aromaVar, esAroma } from "@/lib/catalogo";
import type { DetallePedido, ResumenPedido } from "@/lib/datos/pedidos";
import { lempiras } from "@/lib/formato";
import { CLASE_ESTADO, ETIQUETA_ESTADO, fechaHN, pasosPedido, type EstadoPedido } from "@/lib/pedidos";

export function InsigniaEstado({ estado, grande }: { estado: EstadoPedido; grande?: boolean }) {
  return (
    <span className={`whitespace-nowrap rounded-full font-semibold ${grande ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-[5px] text-xs"} ${CLASE_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/** Miniatura con el fondo pastel del aroma. */
export function Miniatura({ img, aroma, tam = 56, redonda }: { img: string; aroma: string | null; tam?: number; redonda?: boolean }) {
  return (
    <span
      className={`relative block flex-none ${redonda ? "rounded-full shadow-[0_0_0_2px_var(--bg)]" : "rounded-sm"} ${esAroma(aroma) ? "bg-aroma-soft" : "bg-surface"}`}
      style={{ width: tam, height: tam, "--aroma": esAroma(aroma) ? aromaVar(aroma) : undefined } as React.CSSProperties}
    >
      <Image src={img} alt="" fill sizes={`${tam}px`} className="object-contain p-1.5" />
    </span>
  );
}

export function ListaPedidos({ pedidos, seleccionado }: { pedidos: ResumenPedido[]; seleccionado?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {pedidos.map((o) => {
        const sel = o.codigo === seleccionado;
        return (
          <Link
            key={o.id}
            href={`/pedidos/${o.codigo}`}
            aria-current={sel ? "page" : undefined}
            className={`flex flex-col gap-3 rounded-lg bg-bg px-[18px] py-4 no-underline transition-shadow hover:shadow-[inset_0_0_0_2px_var(--navy)] ${
              sel ? "shadow-[inset_0_0_0_2px_var(--navy)]" : "shadow-[inset_0_0_0_1px_var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <strong className="text-[15px]">{o.codigo}</strong>
              <InsigniaEstado estado={o.estado} />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex">
                {o.miniaturas.map((m, i) => (
                  <span key={i} className="-mr-2">
                    <Miniatura img={m.img} aroma={m.aroma} tam={40} redonda />
                  </span>
                ))}
              </div>
              <div className="ml-3 flex-1 text-[13px] text-text-2">
                {fechaHN(o.creadoEn, false)} · {o.cantidad} productos
              </div>
              <strong className="text-sm">{lempiras(o.total)}</strong>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function LineaTiempo({ pedido }: { pedido: DetallePedido }) {
  const pasos = pasosPedido(pedido);
  return (
    <ol className="m-0 list-none p-0">
      {pasos.map((s, i) => {
        const ultimo = i === pasos.length - 1;
        const punto =
          s.tipo === "hecho" || s.tipo === "actual"
            ? "bg-navy text-white"
            : s.tipo === "cancelado"
              ? "bg-error text-white"
              : "bg-bg shadow-[inset_0_0_0_2px_var(--border)]";
        return (
          <li key={s.estado} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className={`flex size-7 flex-none items-center justify-center rounded-full ${punto} ${s.tipo === "actual" ? "shadow-[0_0_0_4px_var(--navy-50)]" : ""}`}>
                {s.tipo === "hecho" && <Check size={16} strokeWidth={2.25} aria-hidden />}
                {s.tipo === "cancelado" && <X size={16} strokeWidth={2.25} aria-hidden />}
                {s.tipo === "actual" && <span className="size-2.5 rounded-full bg-white" />}
              </span>
              {!ultimo && <span className={`min-h-[18px] w-0.5 flex-1 ${s.tipo === "hecho" ? "bg-navy" : "bg-line"}`} />}
            </div>
            <div className="pb-5 pt-[3px]">
              <div
                className={`text-[15px] ${s.tipo === "actual" ? "font-bold" : "font-semibold"} ${
                  s.tipo === "pendiente" ? "text-text-2" : s.tipo === "cancelado" ? "text-error" : "text-navy"
                }`}
              >
                {ETIQUETA_ESTADO[s.estado]}
              </div>
              {(s.sub || (s.tipo === "cancelado" && pedido.motivoCancelacion)) && (
                <div className="mt-0.5 text-[13px] text-text-2">
                  {s.tipo === "cancelado" && pedido.motivoCancelacion ? `${pedido.motivoCancelacion} · ${s.sub}` : s.sub}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ProductosPedido({ pedido }: { pedido: DetallePedido }) {
  return (
    <section className="rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1">
      <h3 className="mb-4 mt-0 text-[17px] font-bold">Productos</h3>
      <div className="flex flex-col gap-3">
        {pedido.items.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <Miniatura img={it.img} aroma={it.aroma} />
            <div className="min-w-0 flex-1">
              <Link href={`/producto/${it.slug}${it.aroma ? `?aroma=${it.aroma}` : ""}`} className="text-sm font-semibold no-underline hover:underline">
                {it.nombre}
              </Link>
              <div className="text-[13px] text-text-2">
                {it.aromaNombre ? `${it.aromaNombre} · ` : ""}
                {it.tamano} · {it.cantidad} u.
              </div>
            </div>
            <strong className="whitespace-nowrap text-sm">{lempiras(it.total)}</strong>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3.5 text-sm">
        <div className="flex justify-between">
          <span className="text-text-2">Subtotal</span>
          <span>{lempiras(pedido.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-2">Envío · {pedido.zonaEnvio === "sps" ? "San Pedro Sula" : "Resto del país"}</span>
          <span>{lempiras(pedido.envio)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{lempiras(pedido.total)}</span>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-surface p-3.5 text-[13px] leading-normal text-text-2">
        <strong className="text-navy">Entrega:</strong> {pedido.contacto.nombre} · {pedido.contacto.telefono}
        <br />
        {pedido.direccion}
      </div>
    </section>
  );
}
