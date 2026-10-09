import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { InsigniaEstado } from "@/components/pedidos/piezas";
import { SubirComprobante } from "@/components/pedidos/subir-comprobante";
import { BotonCopiar } from "@/components/ui/boton-copiar";
import { Cargando } from "@/components/ui/cargando";
import { obtenerConfiguracion } from "@/lib/datos/catalogo";
import { obtenerPedido } from "@/lib/datos/pedidos";
import { lempiras } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedido creado", robots: { index: false, follow: false } };

const paso = "rounded-lg bg-bg p-[clamp(18px,3vw,24px)] shadow-1";
const numero = (n: number, activo = true) => (
  <span
    className={`flex size-7 flex-none items-center justify-center rounded-full text-[13px] font-bold ${activo ? "bg-navy text-white" : "bg-navy-50 text-navy"}`}
  >
    {n}
  </span>
);

async function PedidoListo({ params }: { params: PageProps<"/pedidos/[codigo]/listo">["params"] }) {
  const { codigo } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ingresar");
  const [p, conf] = await Promise.all([obtenerPedido(decodeURIComponent(codigo).toUpperCase()), obtenerConfiguracion()]);
  if (!p) notFound();

  const porTransferencia = p.tipoCliente === "normal";
  const nombre = p.contacto.nombre.split(" ")[0];

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-[720px] px-[clamp(16px,3vw,40px)] py-[clamp(32px,6vw,72px)]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-success-50 text-success">
            <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-[.08em] text-text-2">Pedido creado</span>
          <h1 className="font-display text-h2 m-0">¡Gracias, {nombre}!</h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-text-2">Tu número de pedido es</span>
            <strong className="text-lg tracking-[.02em]">{p.codigo}</strong>
            <BotonCopiar texto={p.codigo} etiqueta="Número de pedido" />
          </div>
          <InsigniaEstado estado={p.estado} grande />
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {porTransferencia ? (
            <>
              <li className={paso}>
                <div className="flex items-start gap-3.5">
                  {numero(1)}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 font-bold">Transfiere {lempiras(p.total)}</div>
                    <div className="text-sm leading-[1.6] text-text-2">
                      {conf.banco} · {conf.tipoCuenta}
                      <br />
                      Cuenta <strong className="text-navy">{conf.numeroCuenta}</strong> a nombre de <strong className="text-navy">{conf.titular}</strong>
                      <br />
                      Escribe {p.codigo} en la descripción.
                    </div>
                  </div>
                </div>
              </li>
              <li className={paso}>
                <div className="flex items-start gap-3.5">
                  {numero(2)}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 font-bold">Sube tu comprobante</div>
                    {p.estado === "esperando_pago" ? (
                      <SubirComprobante usuarioId={auth.user.id} pedidoId={p.id} codigo={p.codigo} grande />
                    ) : (
                      <div className="flex items-center gap-3 rounded-md bg-success-50 px-4 py-3.5 text-sm font-semibold text-success">
                        <CheckCircle2 size={16} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{p.comprobante ?? "Comprobante recibido"}</span>
                        <span>Pago en revisión</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            </>
          ) : (
            <li className={paso}>
              <div className="flex items-start gap-3.5">
                {numero(1)}
                <div>
                  <div className="mb-1 font-bold">Pedido confirmado</div>
                  <div className="text-sm leading-normal text-text-2">
                    {p.tipoCliente === "credito"
                      ? `El total de ${lempiras(p.total)} se sumó a tu crédito.`
                      : `Pagas ${lempiras(p.total)} al recibir, en efectivo o con tarjeta.`}
                  </div>
                </div>
              </div>
            </li>
          )}
          <li className={paso}>
            <div className="flex items-start gap-3.5">
              {numero(porTransferencia ? 3 : 2, false)}
              <div>
                <div className="mb-1 font-bold">Confirmamos y enviamos</div>
                <div className="text-sm leading-normal text-text-2">
                  Te avisamos cuando tu pedido salga a camino. Puedes seguirlo en Mis pedidos.
                </div>
              </div>
            </div>
          </li>
        </ol>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/pedidos/${p.codigo}`} className="flex h-[52px] items-center rounded-full bg-navy px-7 font-semibold text-white no-underline hover:bg-navy-700">
            Ver mi pedido
          </Link>
          <Link href="/" className="flex h-[52px] items-center rounded-full bg-bg px-6 font-semibold text-navy no-underline shadow-[inset_0_0_0_1.5px_var(--navy)] hover:bg-navy-50">
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Pagina({ params }: PageProps<"/pedidos/[codigo]/listo">) {
  return (
    <Suspense fallback={<Cargando />}>
      <PedidoListo params={params} />
    </Suspense>
  );
}
