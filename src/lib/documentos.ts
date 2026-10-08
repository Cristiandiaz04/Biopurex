/*
 * Constantes de Reportes y Cotizaciones que usan tanto el servidor como el navegador.
 * Van aquí (no en un archivo "use client"): desde el servidor, lo exportado por un módulo de
 * cliente llega como referencia, no como valor, y la página falla al usarlo.
 */

export const PERIODOS = [
  ["30", "Últimos 30 días"],
  ["mes", "Mes en curso"],
  ["90", "Últimos 90 días"],
  ["anio", "Año a la fecha"],
] as const;

export const CHIP_COT = {
  emitida: ["Vigente", "bg-navy-50 text-navy"],
  convertida: ["Convertida", "bg-success-50 text-success"],
  vencida: ["Vencida", "bg-error-50 text-error"],
} as const;
