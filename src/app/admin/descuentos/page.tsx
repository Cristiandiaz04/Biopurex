import { Suspense } from "react";
import { GestorDescuentos } from "@/components/admin/gestor-descuentos";
import { TituloPagina } from "@/components/admin/ui";
import { listarClientes, listarDescuentos } from "@/lib/datos/admin";

export const metadata = { title: "Descuentos" };

const hoyHN = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });

async function Descuentos() {
  const [codigos, clientes] = await Promise.all([listarDescuentos(), listarClientes()]);
  return (
    <>
      <TituloPagina
        titulo="Descuentos"
        sub="Códigos en porcentaje para clientes de mayoreo. El cliente lo escribe al pagar; la tienda lo valida y lo descuenta del subtotal."
      />
      <GestorDescuentos codigos={codigos} clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))} hoy={hoyHN()} />
    </>
  );
}

export default function Pagina() {
  return (
    <Suspense fallback={<div className="h-96 rounded-md bg-white/60" />}>
      <Descuentos />
    </Suspense>
  );
}
