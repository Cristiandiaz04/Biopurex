/** Estados de pedido (mismos valores que la columna pedidos.estado). */
export type EstadoPedido = "esperando_pago" | "pago_en_revision" | "confirmado" | "enviado" | "entregado" | "cancelado";

export const FLUJO: Exclude<EstadoPedido, "cancelado">[] = ["esperando_pago", "pago_en_revision", "confirmado", "enviado", "entregado"];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  esperando_pago: "Esperando pago",
  pago_en_revision: "Pago en revisión",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const AYUDA_ESTADO: Record<EstadoPedido, string> = {
  esperando_pago: "Realiza la transferencia y sube tu comprobante.",
  pago_en_revision: "Estamos verificando tu pago.",
  confirmado: "Estamos preparando tu pedido.",
  enviado: "Tu pedido va en camino.",
  entregado: "Pedido entregado. ¡Gracias por tu compra!",
  cancelado: "Pedido cancelado.",
};

/** Clases de la insignia de estado (Sistema de Diseño). */
export const CLASE_ESTADO: Record<EstadoPedido, string> = {
  esperando_pago: "bg-warning-50 text-warning",
  pago_en_revision: "bg-navy-50 text-navy",
  confirmado: "bg-navy-50 text-navy",
  enviado: "bg-navy text-white",
  entregado: "bg-success-50 text-success",
  cancelado: "bg-error-50 text-error",
};

/** Fecha corta hondureña: "5 oct 2026 · 3:12 p. m." */
export function fechaHN(iso: string | null, conHora = true) {
  if (!iso) return "";
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Tegucigalpa" }).replace(".", "");
  if (!conHora) return fecha;
  const hora = d.toLocaleTimeString("es-HN", { hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" });
  return `${fecha} · ${hora}`;
}

/** Pasos de la línea de tiempo según el estado actual. */
export function pasosPedido(p: {
  estado: EstadoPedido;
  tipoCliente: string;
  fechas: Partial<Record<EstadoPedido, string | null>>;
}) {
  // Contra entrega y crédito no pasan por pago: empiezan en "Confirmado".
  const flujo = p.tipoCliente === "normal" ? FLUJO : FLUJO.filter((e) => e !== "esperando_pago" && e !== "pago_en_revision");
  if (p.estado === "cancelado") {
    const previos = flujo.filter((e) => p.fechas[e]);
    return [
      ...previos.map((e) => ({ estado: e, tipo: "hecho" as const, sub: fechaHN(p.fechas[e] ?? null) })),
      { estado: "cancelado" as EstadoPedido, tipo: "cancelado" as const, sub: fechaHN(p.fechas.cancelado ?? null) },
    ];
  }
  const actual = flujo.indexOf(p.estado as (typeof FLUJO)[number]);
  return flujo.map((e, i) => ({
    estado: e,
    tipo: i < actual ? ("hecho" as const) : i === actual ? ("actual" as const) : ("pendiente" as const),
    sub: i < actual ? fechaHN(p.fechas[e] ?? null) : i === actual ? AYUDA_ESTADO[e] : "",
  }));
}
