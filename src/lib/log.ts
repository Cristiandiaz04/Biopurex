import "server-only";

/*
 * Registro estructurado: una línea JSON por evento en la salida del servidor (Vercel la guarda
 * en Logs y se puede filtrar por "evento"). Nunca datos sensibles: sin contraseñas, correos,
 * teléfonos ni direcciones; solo códigos, ids y montos.
 */
type Nivel = "info" | "aviso" | "error";

export function registrar(evento: string, datos: Record<string, string | number | boolean | null | undefined> = {}, nivel: Nivel = "info") {
  const linea = JSON.stringify({ t: new Date().toISOString(), nivel, evento, ...datos });
  if (nivel === "error") console.error(linea);
  else if (nivel === "aviso") console.warn(linea);
  else console.log(linea);
}

/** Error de base de datos o servicio: se registra el detalle y al usuario se le muestra un mensaje genérico. */
export function registrarError(contexto: string, error: { code?: string; message: string }) {
  registrar("error", { contexto, codigo: error.code ?? null, mensaje: error.message.slice(0, 300) }, "error");
}
