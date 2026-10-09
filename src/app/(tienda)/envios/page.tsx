import type { Metadata } from "next";
import Link from "next/link";
import { obtenerZonas } from "@/lib/datos/catalogo";
import { lempiras } from "@/lib/formato";
import { NEGOCIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Envíos y pedidos",
  description: "Dónde entrega BIOPUREX, cuánto cuesta el envío, cómo se paga y cómo seguir tu pedido.",
  alternates: { canonical: "/envios" },
};

const seccion = "flex flex-col gap-3 rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1";

/** Información de envíos y pedidos tomada de la configuración real de la tienda (zonas del panel). */
export default async function Envios() {
  const { municipios, gratisDesde } = await obtenerZonas();
  return (
    <main className="bg-surface">
      <div className="mx-auto flex max-w-[860px] flex-col gap-4 px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-8">
        <h1 className="font-display text-h2 m-0">Envíos y pedidos</h1>
        <section className={seccion}>
          <h2 className="m-0 text-lg font-bold">Dónde entregamos</h2>
          {municipios.length ? (
            <ul className="m-0 flex flex-col gap-1.5 pl-5 leading-normal">
              {municipios.map((m) => (
                <li key={m.id}>
                  {m.nombre}, {m.departamento}: envío {lempiras(m.costo)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-text-2">Por el momento no hay zonas de entrega disponibles. Escríbenos para coordinar tu pedido.</p>
          )}
          {gratisDesde != null && <p className="m-0 font-semibold text-success">Envío gratis en compras de más de {lempiras(gratisDesde)}.</p>}
          <p className="m-0 leading-normal text-text-2">El costo exacto se calcula al elegir tu municipio en el pago, antes de confirmar.</p>
        </section>
        <section className={seccion}>
          <h2 className="m-0 text-lg font-bold">Cómo se paga</h2>
          <p className="m-0 leading-normal">
            Por transferencia bancaria: al confirmar el pedido ves los datos de la cuenta y subes tu comprobante desde{" "}
            <Link href="/pedidos">Mis pedidos</Link>. Revisamos el pago y te avisamos cuando el pedido esté confirmado.
          </p>
          <p className="m-0 leading-normal text-text-2">Clientes con crédito o pago contra entrega acordado con BIOPUREX ven su forma de pago al confirmar.</p>
        </section>
        <section className={seccion}>
          <h2 className="m-0 text-lg font-bold">Seguimiento de tu pedido</h2>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 leading-normal">
            <li>Esperando pago: el pedido está creado y falta el comprobante.</li>
            <li>Pago en revisión: recibimos tu comprobante.</li>
            <li>Confirmado: el pago está verificado y preparamos tu pedido.</li>
            <li>Enviado: tu pedido va en camino.</li>
            <li>Entregado.</li>
          </ol>
          <p className="m-0 leading-normal text-text-2">Puedes escribirnos desde el chat de cada pedido.</p>
        </section>
        <section className={seccion}>
          <h2 className="m-0 text-lg font-bold">Contacto</h2>
          <p className="m-0 leading-normal">
            Teléfono <a href={`tel:${NEGOCIO.telefono.replace(/[^+\d]/g, "")}`}>{NEGOCIO.telefono}</a> · Correo{" "}
            <a href={`mailto:${NEGOCIO.correo}`}>{NEGOCIO.correo}</a> · {NEGOCIO.ciudad}, {NEGOCIO.departamento}, Honduras
          </p>
        </section>
      </div>
    </main>
  );
}
