import type { Metadata } from "next";
import { NEGOCIO } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Qué datos pide BIOPUREX al comprar, para qué los usa y cómo pedir que se corrijan o eliminen.",
  alternates: { canonical: "/privacidad" },
};

const h2 = "m-0 text-lg font-bold";
const p = "m-0 leading-[1.65]";

/** Describe lo que la tienda hace realmente con los datos (según el sistema). Revisar con asesoría legal. */
export default function Privacidad() {
  return (
    <main className="bg-surface">
      <article className="mx-auto flex max-w-[760px] flex-col gap-4 px-[clamp(16px,3vw,40px)] pb-[clamp(48px,6vw,80px)] pt-8">
        <h1 className="font-display text-h2 m-0">Privacidad</h1>
        <p className={`${p} text-text-2`}>Última actualización: octubre de 2026.</p>
        <h2 className={h2}>Qué datos pedimos</h2>
        <p className={p}>
          Para crear tu cuenta y atender tus pedidos guardamos tu nombre, correo electrónico, teléfono, direcciones de entrega, RTN si lo
          indicas, tus pedidos, los comprobantes de pago que subes y los mensajes del chat de cada pedido.
        </p>
        <h2 className={h2}>Para qué los usamos</h2>
        <p className={p}>
          Solo para procesar y entregar tus pedidos, verificar pagos, emitir facturas, avisarte por correo del estado de tu pedido y
          atenderte. No vendemos ni compartimos tus datos con terceros para publicidad.
        </p>
        <h2 className={h2}>Dónde se guardan</h2>
        <p className={p}>
          La tienda funciona sobre servicios de terceros: la base de datos y los archivos (Supabase), el sitio web (Vercel) y el envío de
          correos. Cada cliente solo puede ver sus propios datos y pedidos; tu contraseña la gestiona el sistema de autenticación y nunca la
          vemos.
        </p>
        <h2 className={h2}>Cookies</h2>
        <p className={p}>
          Usamos solo las cookies necesarias para mantener tu sesión iniciada; tu carrito se guarda en tu navegador. La medición de visitas
          del sitio (Vercel Web Analytics) no usa cookies ni identifica a las personas.
        </p>
        <h2 className={h2}>Tus derechos</h2>
        <p className={p}>
          Puedes ver y corregir tus datos en Mi cuenta. Para pedir una copia de tus datos o que eliminemos tu cuenta, escríbenos a{" "}
          <a href={`mailto:${NEGOCIO.correo}`}>{NEGOCIO.correo}</a>. Algunos datos de pedidos y facturas pueden conservarse el tiempo que
          exijan las obligaciones contables y fiscales.
        </p>
        <h2 className={h2}>Contacto</h2>
        <p className={p}>
          {NEGOCIO.nombre} · {NEGOCIO.ciudad}, {NEGOCIO.departamento}, Honduras · {NEGOCIO.telefono} · {NEGOCIO.correo}
        </p>
      </article>
    </main>
  );
}
