import { ProximaFase } from "@/components/tienda/proxima-fase";

export const metadata = { title: "Finalizar compra" };

export default function Checkout() {
  return <ProximaFase titulo="Finalizar compra" texto="El pago por transferencia se habilita en la siguiente fase, junto con las cuentas de cliente." />;
}
