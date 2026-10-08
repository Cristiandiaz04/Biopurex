import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, Package } from "lucide-react";
import { listarPedidos, obtenerPedido } from "@/lib/datos/pedidos";
import { fechaHN } from "@/lib/pedidos";
import { lempiras } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { ChatPedido } from "./chat-pedido";
import { InsigniaEstado, LineaTiempo, ListaPedidos, ProductosPedido } from "./piezas";
import { SubirComprobante } from "./subir-comprobante";

/**
 * "Mis pedidos": lista + detalle (escritorio, dos columnas). En móvil, /pedidos muestra solo la
 * lista y /pedidos/[codigo] solo el detalle con botón para volver.
 */
export async function VistaPedidos({ codigo }: { codigo?: string }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/ingresar?siguiente=/pedidos${codigo ? `/${codigo}` : ""}`);

  const pedidos = await listarPedidos();
  const enDetalle = !!codigo;
  const actual = codigo ?? pedidos[0]?.codigo;
  const pedido = actual ? await obtenerPedido(actual) : null;
  if (codigo && !pedido) notFound();

  return (
    <main className="min-h-[70vh] bg-surface">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-6">
        <h1 className="font-display text-h2 mb-6 mt-2">Mis pedidos</h1>

        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-bg px-5 py-[clamp(40px,8vw,88px)] text-center shadow-1">
            <span className="flex size-[72px] items-center justify-center rounded-full bg-surface">
              <Package size={28} strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mb-0 mt-2 text-[22px] font-bold">Todavía no tienes pedidos</h2>
            <p className="m-0 max-w-[36ch] leading-normal text-text-2">Cuando compres, aquí vas a ver el estado de tu pedido y podrás escribirnos.</p>
            <Link href="/catalogo" className="mt-2 flex h-12 items-center rounded-full bg-navy px-6 font-semibold text-white no-underline">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[360px_minmax(0,1fr)]">
            <div className={enDetalle ? "max-[899px]:hidden" : ""}>
              <ListaPedidos pedidos={pedidos} seleccionado={actual} />
            </div>
            {pedido && (
              <div className={`flex flex-col gap-4 ${enDetalle ? "" : "max-[899px]:hidden"}`}>
                {enDetalle && (
                  <Link href="/pedidos" className="inline-flex h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline min-[900px]:hidden">
                    <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
                    Todos mis pedidos
                  </Link>
                )}
                <section className="rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="m-0 text-[22px] font-bold">Pedido {pedido.codigo}</h2>
                      <div className="mt-1 text-sm text-text-2">
                        {fechaHN(pedido.creadoEn, false)} · {pedido.cantidad} productos · {lempiras(pedido.total)}
                      </div>
                    </div>
                    <InsigniaEstado estado={pedido.estado} grande />
                  </div>
                  <LineaTiempo pedido={pedido} />
                  {pedido.estado === "esperando_pago" && (
                    <SubirComprobante usuarioId={auth.user.id} pedidoId={pedido.id} codigo={pedido.codigo} />
                  )}
                  {pedido.comprobante && (
                    <div className="mt-3 flex items-center gap-2.5 rounded-md bg-surface px-3.5 py-3 text-sm">
                      <CheckCircle2 size={16} className="flex-none text-success" aria-hidden />
                      <span className="min-w-0 truncate">
                        Comprobante: <strong>{pedido.comprobante}</strong>
                      </span>
                    </div>
                  )}
                </section>
                <ProductosPedido pedido={pedido} />
                <ChatPedido key={pedido.id} pedidoId={pedido.id} iniciales={pedido.mensajes} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
